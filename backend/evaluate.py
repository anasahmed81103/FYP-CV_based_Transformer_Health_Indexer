# backend/evaluate.py
import os, sys , argparse
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.append(ROOT_DIR)

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from sklearn.metrics import mean_absolute_error, r2_score
import pandas as pd
from tqdm import tqdm
import numpy as np

from core import config as cfg
from core.dataset import TransformerHealthDataset
from core.augment import build_transforms
from core.utils import get_device
from models.custom_cnn import CustomCNN
from models.resnet import build_resnet
from models.efficientnet import build_efficientnet
from PIL import Image
from backend.gradCam import generate_gradcam_for_image

# 13 parameter column names (same as dataset)
PARAM_COLUMNS = [
    "Oil_leakage_score",
    "Corrosion_score",
    "Rust_score",
    "Paint_fading_score",
    "Bushing_cracks_score",
    "Broken_connectors_score",
    "Insulator_contamination_score",
    "Burnt_marks_/_overheating_score",
    "Deformed_tank_/_bent_fins_score",
    "Loose_or_unsafe_wiring_score",
    "Dust_accumulation_score",
    "Gasket_leakage_score",
    "Damaged_or_bent_pole_structure_score",
]

# -------------------------
# Model loader
# -------------------------
def load_model(ckpt_path: str):
    name = cfg.MODEL_NAME
    pretrained = cfg.PRETRAINED
    dropout = cfg.DROPOUT

    if name == "custom_cnn":
        model = CustomCNN(dropout=dropout)
    elif "resnet" in name:
        # resnet builder accepts pretrained, dropout in your codebase
        model = build_resnet(model_name=name, pretrained=pretrained, dropout=dropout)
    elif "efficientnet" in name:
        # your efficientnet builder uses config globals, so only pass name
        model = build_efficientnet(model_name=name)
    else:
        raise ValueError(f"❌ Unknown MODEL_NAME: {name}")

    if not os.path.exists(ckpt_path):
        raise FileNotFoundError(f"Checkpoint not found: {ckpt_path}")

    state = torch.load(ckpt_path, map_location="cpu")
    model.load_state_dict(state["model_state"])
    print(f"✅ Loaded model from: {ckpt_path}")
    return model

# -------------------------
# Evaluate on test set
# -------------------------
def evaluate_test(ckpt_path: str = cfg.CHECKPOINT_PATH):
    device = get_device()

    # Validation/test transforms: no augmentation
    _, _, test_t = build_transforms(
        image_size=cfg.IMAGE_SIZE,
        mean=cfg.NORMALIZE_MEAN,
        std=cfg.NORMALIZE_STD,
        augment_cfg={}  # no augmentation during evaluation
    )

    test_csv = os.path.join(cfg.PROCESSED_DIR, "test.csv")
    if not os.path.exists(test_csv):
        raise FileNotFoundError(f"Missing test.csv at {test_csv}")

    test_ds = TransformerHealthDataset(test_csv, transform=test_t)
    test_loader = DataLoader(test_ds, batch_size=cfg.BATCH_SIZE, shuffle=False, num_workers=0)

    model = load_model(ckpt_path).to(device)
    model.eval()
    criterion = nn.L1Loss(reduction="mean")

    losses = []
    preds_batches = []
    targets_batches = []

    with torch.no_grad():
        for imgs, targets in tqdm(test_loader, desc="Testing", leave=False):
            imgs = imgs.to(device)                  # [B,3,H,W]
            targets = targets.to(device)            # [B,13]

            outputs = model(imgs)                   # [B,13]
            loss = criterion(outputs, targets)      # elementwise L1 averaged over all elements
            losses.append(float(loss.item() * imgs.size(0)))

            preds_batches.append(outputs.cpu())
            targets_batches.append(targets.cpu())

    # concatenate
    preds = torch.cat(preds_batches, dim=0).numpy()   # [N,13]
    trues = torch.cat(targets_batches, dim=0).numpy() # [N,13]
    avg_loss = sum(losses) / len(test_loader.dataset)

    # Metrics in native 0-6 scale
    overall_mae = mean_absolute_error(trues, preds)         # average across all params
    per_param_mae = mean_absolute_error(trues, preds, multioutput='raw_values')  # array length 13
    # Optionally compute R2 per-parameter and mean R2
    r2_per_param = []
    for i in range(len(PARAM_COLUMNS)):
        try:
            r2_per_param.append(r2_score(trues[:, i], preds[:, i]))
        except Exception:
            r2_per_param.append(float('nan'))
    mean_r2 = np.nanmean(r2_per_param)

    # Save predictions: one row per sample, columns = PARAM_COLUMNS + overall_sum
    pred_df = pd.DataFrame(preds, columns=PARAM_COLUMNS)
    true_df = pd.DataFrame(trues, columns=[f"true_{c}" for c in PARAM_COLUMNS])
    pred_df["pred_overall_sum"] = pred_df.sum(axis=1)
    true_df["true_overall_sum"] = true_df.sum(axis=1)

    out_df = pd.concat([pred_df, true_df], axis=1)
    os.makedirs(cfg.METRICS_DIR, exist_ok=True)
    out_path = os.path.join(cfg.METRICS_DIR, f"{cfg.MODEL_NAME}_test_predictions.csv")
    out_df.to_csv(out_path, index=False)

    # Print summary
    print("\n✅ Evaluation Complete")
    print(f"Test L1Loss (avg per-sample): {avg_loss:.6f}")
    print(f"Overall MAE (0–6 scale, averaged across params): {overall_mae:.4f}")
    print("Per-parameter MAE (0–6):")
    for name, m in zip(PARAM_COLUMNS, per_param_mae):
        print(f"  {name}: {m:.4f}")
    print(f"Mean R² across params: {mean_r2:.4f}")
    print(f"Predictions saved to: {out_path}")

    return {
        "avg_loss": avg_loss,
        "overall_mae_0_6": overall_mae,
        "per_param_mae_0_6": per_param_mae,
        "r2_per_param": r2_per_param,
        "predictions_csv": out_path,
    }

# -------------------------
# Single / small-batch inference + GradCAM
# -------------------------
# -------------------------
# PMT Classifier Loader
# -------------------------
from models.pmt_classifier import build_pmt_classifier

def load_pmt_model():
    device = get_device()
    ckpt_path = os.path.join(cfg.CHECKPOINT_DIR, "pmt_classifier_best.pth")
    
    if not os.path.exists(ckpt_path):
         # If exact name not found, try user provided path logic or warn
         # Assuming user followed instructions and placed it there
         raise FileNotFoundError(f"PMT Checkpoint not found: {ckpt_path}")

    model = build_pmt_classifier().to(device)
    state = torch.load(ckpt_path, map_location=device)
    
    # helper to load state dict safely
    if "model_state" in state:
        model.load_state_dict(state["model_state"])
    else:
        model.load_state_dict(state)
        
    model.eval()
    return model

# -------------------------
# Single / small-batch inference + GradCAM (FIXED VERSION)
# -------------------------
def evaluate_transformer(image_paths):
    device = get_device()
    
    # 1. Load Health Model
    health_ckpt = os.path.join(cfg.CHECKPOINT_DIR, f"{cfg.MODEL_NAME}_best.pth")
    try:
        health_model = load_model(health_ckpt).to(device)
    except FileNotFoundError as e:
        print(f"FATAL ERROR: Health Model Checkpoint not found at {health_ckpt}. Cannot run analysis.")
        return {
            "predictions": [],
            "healthIndex": 0.0,
            "paramsScores": {},
            "gradCamImages": [],
        }

    health_model.eval()

    # 2. Load PMT Classifier
    pmt_model = None
    try:
        pmt_model = load_pmt_model()
        print("✅ PMT Classifier loaded for image filtering.")
    except Exception as e:
        print(f"⚠️ Warning: Could not load PMT model: {e}. All images will be processed.")

    # Transforms
    _, _, test_t = build_transforms(
        image_size=cfg.IMAGE_SIZE,
        mean=cfg.NORMALIZE_MEAN,
        std=cfg.NORMALIZE_STD,
        augment_cfg={}
    )

    # Ensure GradCAM directory exists
    os.makedirs(cfg.GRADCAM_DIR, exist_ok=True)

    all_preds = []
    gradcam_urls = [] 
    valid_scores_list = [] 

    # We need torch.set_grad_enabled(True) for GradCAM
    with torch.no_grad():
        for idx, img_path in enumerate(image_paths):
            try:
                img = Image.open(img_path).convert("RGB")
                img_t = test_t(img).unsqueeze(0).to(device)  # [1,3,H,W]
            except Exception as e:
                print(f"❌ Failed to load or transform image {img_path}: {e}")
                all_preds.append({"status": "error", "image": os.path.basename(img_path)})
                continue

            # --- Step 1: PMT Check ---
            is_pmt = True
            if pmt_model:
                pmt_out = pmt_model(img_t)
                pmt_pred = torch.argmax(pmt_out, dim=1).item()
                if pmt_pred == 0:  # 0=Non-PMT
                    is_pmt = False
            
            if not is_pmt:
                print(f"⏩ Image {os.path.basename(img_path)} classified as Non-PMT. Skipping.")
                all_preds.append({"status": "non-pmt", "image": os.path.basename(img_path)})
                continue

            # --- Step 2: Health Analysis ---
            out = health_model(img_t)                      # [1,13]
            out = out.squeeze(0).cpu().numpy()             # [13]
            out_clamped = np.clip(out, 0.0, 6.0)
            overall_sum = float(out_clamped.sum())

            preds_dict = {PARAM_COLUMNS[i]: float(out_clamped[i]) for i in range(len(PARAM_COLUMNS))}
            preds_dict["overall_sum"] = overall_sum
            preds_dict["status"] = "processed"
            
            all_preds.append(preds_dict)
            valid_scores_list.append(preds_dict)

            # --- Step 3: Grad-CAM Generation ---
            
            # Find the index of the parameter with the highest defect score
            max_idx = int(np.argmax(out))
            
            base_name = os.path.basename(img_path)
            gradcam_filename = f"gradcam_{base_name}"
            gradcam_file_abs = os.path.join(cfg.GRADCAM_DIR, gradcam_filename)
            
            try:
                # 1. Temporarily enable gradients just for the GradCAM calculation
                with torch.enable_grad():
                    
                    # 2. Get the model ready for a gradient pass
                    health_model.train() # Set to train mode for backward hook registration
                    
                    # 3. Create a fresh, gradient-tracked input tensor
                    img_grad_t = test_t(img).unsqueeze(0).to(device).requires_grad_(True)
                    
                    # 4. Generate GradCAM using the original image path and the new tensor
                    generate_gradcam_for_image(
                        health_model, 
                        img_path, 
                        gradcam_file_abs, 
                        param_index=max_idx,
                        input_tensor=img_grad_t # Pass the gradient-tracked tensor
                    )
                    
                    # 5. Return model to evaluation mode
                    health_model.eval()
                
                # Frontend URL path: e.g., "outputs/gradcam/gradcam_image.jpg"
                gradcam_urls.append(f"outputs/gradcam/{gradcam_filename}")
                print(f"✅ GradCAM generated for {base_name} at index {max_idx}.")
            except Exception as e:
                print(f"⚠️ GradCAM failed for {img_path}: {e}")
                import traceback
                traceback.print_exc()
                health_model.eval() # Ensure model is in eval mode even after failure
                pass

    # Aggregate results for frontend
    if valid_scores_list:
        # Average the overall health index
        avg_health_index = float(np.mean([p["overall_sum"] for p in valid_scores_list]))
        
        # Average per-parameter scores
        aggregated_params = {}
        for col in PARAM_COLUMNS:
            vals = [p[col] for p in valid_scores_list]
            aggregated_params[col] = float(np.mean(vals))
            
    else:
        avg_health_index = 0.0
        aggregated_params = {} 
            
    print(f"DEBUG: Returning {len(gradcam_urls)} GradCAM images. Health Index: {avg_health_index}")
    
    return {
        "predictions": all_preds,
        "healthIndex": avg_health_index,
        "paramsScores": aggregated_params,
        "gradCamImages": gradcam_urls,
    }

# -------------------------
# PMT vs Non-PMT Classifier Evaluation
# -------------------------
from core.dataset import PMTClassifierDataset
from torchvision import transforms
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
from models.pmt_classifier import build_pmt_classifier

def evaluate_classifier_test(root_dir=None, batch_size=None):

    device = get_device()
    root_dir = root_dir or cfg.CLASSIFIER_PROCESSED_DIR
    batch_size = batch_size or cfg.BATCH_SIZE

    test_dir = os.path.join(root_dir, "test")
    if not os.path.exists(test_dir):
        raise FileNotFoundError(f"❌ Test folder not found: {test_dir}")

    # Basic transforms
    test_t = transforms.Compose([
        transforms.Resize((cfg.IMAGE_SIZE, cfg.IMAGE_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(mean=cfg.NORMALIZE_MEAN, std=cfg.NORMALIZE_STD)
    ])

    # Load dataset + dataloader
    test_ds = PMTClassifierDataset(test_dir, transform=test_t)
    test_loader = DataLoader(test_ds, batch_size=batch_size, shuffle=False, num_workers=0)

    # Load best model
    model = build_pmt_classifier().to(device)
    ckpt_path = os.path.join(cfg.CHECKPOINT_DIR, "pmt_classifier_best.pth")
    if not os.path.exists(ckpt_path):
        raise FileNotFoundError(f"❌ Classifier checkpoint not found: {ckpt_path}")

    state = torch.load(ckpt_path, map_location=device)
    model.load_state_dict(state["model_state"])
    model.eval()

    all_labels, all_preds = [], []

    with torch.no_grad():
        for imgs, labels in test_loader:
            imgs, labels = imgs.to(device), labels.to(device)
            outputs = model(imgs)
            preds = torch.argmax(outputs, dim=1)
            all_labels.extend(labels.cpu().numpy())
            all_preds.extend(preds.cpu().numpy())

    # Metrics
    acc = accuracy_score(all_labels, all_preds)
    prec = precision_score(all_labels, all_preds, zero_division=0)
    rec = recall_score(all_labels, all_preds, zero_division=0)
    f1 = f1_score(all_labels, all_preds, zero_division=0)
    cm = confusion_matrix(all_labels, all_preds)

    print("\n🧪 Test Set Evaluation Complete")
    print(f"Accuracy:  {acc:.4f}")
    print(f"Precision: {prec:.4f}")
    print(f"Recall:    {rec:.4f}")
    print(f"F1 Score:  {f1:.4f}")
    print("Confusion Matrix:\n", cm)

    return {
        "accuracy": acc,
        "precision": prec,
        "recall": rec,
        "f1": f1,
        "confusion_matrix": cm
    }


#------------------------------------------------------------------------------------------------------------------------


# -------------------------
# Entry point
# -------------------------


if __name__ == "__main__":

    # pass the command line arg like:  python backend/evaluate.py --model regression  or  python backend/evaluate.py --model classifier
   # to select evaluation of the model 


    parser = argparse.ArgumentParser(description="Evaluate Transformer or Classifier model")
    parser.add_argument(
        "--model", type=str, default="regression",
        choices=["regression", "classifier"],
        help="Specify which model to evaluate: 'regression' or 'classifier'"
    )
    args = parser.parse_args()

    if args.model == "regression":
        ckpt_path = os.path.join(cfg.CHECKPOINT_DIR, f"{cfg.MODEL_NAME}_best.pth")
        evaluate_test(ckpt_path)
    
    
    elif args.model == "classifier":
        evaluate_classifier_test()