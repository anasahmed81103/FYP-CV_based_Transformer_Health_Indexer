import os, sys
# Add project root to sys.path (works on any OS)
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.append(ROOT_DIR)

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from sklearn.metrics import mean_absolute_error, r2_score
import pandas as pd
from tqdm import tqdm

from core import config as cfg
from core.dataset import TransformerHealthDataset
from core.augment import build_transforms
from core.utils import get_device
from models.custom_cnn import CustomCNN
from models.resnet import build_resnet
from models.efficientnet import build_efficientnet
from PIL import Image
import torchvision.transforms as T
from backend.gradCam import generate_gradcam_for_image


# ============================================================
# Model Loader
# ============================================================

def load_model(ckpt_path: str):
    """Rebuild and load model weights from checkpoint."""
    name = cfg.MODEL_NAME
    pretrained = cfg.PRETRAINED
    dropout = cfg.DROPOUT

    if name == "custom_cnn":
        model = CustomCNN(dropout=dropout)
    elif "resnet" in name:
        model = build_resnet(model_name=name, pretrained=pretrained, dropout=dropout)
    elif "efficientnet" in name:
        model = build_efficientnet(model_name=name, pretrained=pretrained, dropout=dropout)
    else:
        raise ValueError(f"❌ Unknown MODEL_NAME: {name}")

    # Load checkpoint
    if not os.path.exists(ckpt_path):
        raise FileNotFoundError(f"❌ Checkpoint not found: {ckpt_path}")

    state = torch.load(ckpt_path, map_location="cpu")
    model.load_state_dict(state["model_state"])
    print(f"✅ Loaded model from: {ckpt_path}")
    return model


# ============================================================
# Evaluation
# ============================================================

def evaluate_test(ckpt_path: str = cfg.CHECKPOINT_PATH):
    """Evaluate model performance on the test dataset."""
    device = get_device()

    # --- Build transforms ---
    _, _, test_t = build_transforms(
        image_size=cfg.IMAGE_SIZE,
        mean=cfg.NORMALIZE_MEAN,
        std=cfg.NORMALIZE_STD,
        augment_cfg=cfg.AUGMENT
    )

    # --- Load test data ---
    test_csv = os.path.join(cfg.PROCESSED_DIR, "test.csv")
    if not os.path.exists(test_csv):
        raise FileNotFoundError(f"❌ Missing test.csv at {test_csv}")

    test_ds = TransformerHealthDataset(test_csv, transform=test_t)
    test_loader = DataLoader(test_ds, batch_size=cfg.BATCH_SIZE, shuffle=False, num_workers=4)

    # --- Load model ---
    model = load_model(ckpt_path).to(device)
    model.eval()
    criterion = nn.L1Loss()

    # --- Run inference ---
    losses, preds_list, targets_list = [], [], []
    with torch.no_grad():
        for imgs, targets in tqdm(test_loader, desc="Testing", leave=False):
            imgs = imgs.to(device)
            targets = targets.to(device).unsqueeze(1)
            outputs = model(imgs)
            loss = criterion(outputs, targets)
            losses.append(loss.item() * imgs.size(0))
            preds_list.extend(outputs.squeeze(1).cpu().tolist())
            targets_list.extend(targets.squeeze(1).cpu().tolist())

    # --- Compute metrics ---
    avg_loss = sum(losses) / len(test_loader.dataset)
    preds_scaled = [p * 100.0 for p in preds_list]
    targets_scaled = [t * 100.0 for t in targets_list]
    mae = mean_absolute_error(targets_scaled, preds_scaled)
    r2 = r2_score(targets_scaled, preds_scaled)

    # --- Save results ---
    os.makedirs(cfg.METRICS_DIR, exist_ok=True)
    out_path = os.path.join(cfg.METRICS_DIR, f"{cfg.MODEL_NAME}_test_metrics.csv")
    pd.DataFrame({"pred": preds_scaled, "target": targets_scaled}).to_csv(out_path, index=False)

    # --- Print summary ---
    print("\n✅ Evaluation Complete:")
    print(f"📊 Test Loss: {avg_loss:.4f}")
    print(f"📈 Test MAE (0–100): {mae:.2f}")
    print(f"🎯 R²: {r2:.3f}")
    print(f"💾 Predictions saved to: {out_path}")



def evaluate_transformer(image_paths):
    device = get_device()
    ckpt_path = os.path.join(cfg.CHECKPOINT_DIR, f"{cfg.MODEL_NAME}_best.pth")
    model = load_model(ckpt_path).to(device)
    model.eval()

    _, _, test_t = build_transforms(
        image_size=cfg.IMAGE_SIZE,
        mean=cfg.NORMALIZE_MEAN,
        std=cfg.NORMALIZE_STD,
        augment_cfg=cfg.AUGMENT
    )

    results = []
    gradcam_paths = []

    for idx, img_path in enumerate(image_paths):
        img = Image.open(img_path).convert("RGB")
        img_t = test_t(img).unsqueeze(0).to(device)

        with torch.no_grad():
            pred = model(img_t)
            health_index = float(pred.item() * 100.0)
            results.append(health_index)

        # 🔥 Generate Grad-CAM for this uploaded image
        gradcam_file = os.path.join(cfg.GRADCAM_DIR, f"gradcam_{idx}.jpg")
        generate_gradcam_for_image(model, img_path, gradcam_file)
        gradcam_paths.append(f"outputs/gradcam/gradcam_{idx}.jpg")

    avg_health = sum(results) / len(results)

    top_params = [
        {"name": "Insulation Breakdown", "score": 85},
        {"name": "Oil Contamination", "score": 78},
        {"name": "Core Deformation", "score": 50},
    ]

    return {
        "health_index": round(avg_health, 2),
        "top_params": top_params,
        "gradcam_paths": gradcam_paths,
    }


# ============================================================
# Entry Point
# ============================================================

if __name__ == "__main__":
    ckpt_path = os.path.join(cfg.CHECKPOINT_DIR, f"{cfg.MODEL_NAME}_best.pth")
    evaluate_test(ckpt_path)
