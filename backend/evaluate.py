# backend/evaluate.py
import os, sys
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
def evaluate_transformer(image_paths):
    device = get_device()
    ckpt_path = os.path.join(cfg.CHECKPOINT_DIR, f"{cfg.MODEL_NAME}_best.pth")
    model = load_model(ckpt_path).to(device)
    model.eval()

    _, _, test_t = build_transforms(
        image_size=cfg.IMAGE_SIZE,
        mean=cfg.NORMALIZE_MEAN,
        std=cfg.NORMALIZE_STD,
        augment_cfg={}  # no augmentation
    )

    os.makedirs(cfg.GRADCAM_DIR, exist_ok=True)

    all_preds = []
    gradcam_paths = []

    with torch.no_grad():
        for idx, img_path in enumerate(image_paths):
            img = Image.open(img_path).convert("RGB")
            img_t = test_t(img).unsqueeze(0).to(device)   # [1,3,H,W]

            out = model(img_t)                            # [1,13]
            out = out.squeeze(0).cpu().numpy()            # [13]

            # ensure values are reasonable (clamp to 0-6)
            out_clamped = np.clip(out, 0.0, 6.0)

            # compute overall sum (same logic as dataset's overall)
            overall_sum = float(out_clamped.sum())

            # save per-parameter predictions
            preds_dict = {PARAM_COLUMNS[i]: float(out_clamped[i]) for i in range(len(PARAM_COLUMNS))}
            preds_dict["overall_sum"] = overall_sum
            all_preds.append(preds_dict)

            # Grad-CAM (writes file)
            gradcam_file = os.path.join(cfg.GRADCAM_DIR, f"gradcam_{idx}.jpg")
            try:
                generate_gradcam_for_image(model, img_path, gradcam_file)
                gradcam_paths.append(gradcam_file)
            except Exception as e:
                # don't crash the whole loop for GradCAM failures
                gradcam_paths.append(None)
                print(f"⚠ GradCAM failed for {img_path}: {e}")

    # average overall health across supplied images
    avg_overall = float(np.mean([p["overall_sum"] for p in all_preds])) if all_preds else None

    return {
        "predictions": all_preds,
        "avg_overall_sum": avg_overall,
        "gradcam_paths": gradcam_paths,
    }

# -------------------------
# Entry point
# -------------------------
if __name__ == "__main__":
    ckpt_path = os.path.join(cfg.CHECKPOINT_DIR, f"{cfg.MODEL_NAME}_best.pth")
    evaluate_test(ckpt_path)
