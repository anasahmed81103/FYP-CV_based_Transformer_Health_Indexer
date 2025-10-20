import os, sys
# Add project root to sys.path (works on any OS)
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.append(ROOT_DIR)

import random
import torch
import numpy as np
from core import config as cfg


# ==============================
# Reproducibility Utilities
# ==============================

def set_seed(seed: int = cfg.SEED):
    """Set random seeds for reproducibility."""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    print(f"🌱 Seed set to: {seed}")


# ==============================
# Device Management
# ==============================

def get_device() -> torch.device:
    """Return the available compute device (GPU if available, else CPU)."""
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"🧠 Using device: {device}")
    return device


# ==============================
# Checkpoint Management
# ==============================

def save_checkpoint(model, optimizer, epoch: int, best_metric: float, path: str):
    """
    Save model checkpoint with optimizer state and best validation metric.
    """
    os.makedirs(os.path.dirname(path), exist_ok=True)
    torch.save(
        {
            "epoch": epoch,
            "model_state": model.state_dict(),
            "optimizer_state": optimizer.state_dict(),
            "best_metric": best_metric,
        },
        path,
    )
    print(f"💾 Saved checkpoint to: {path}")


def load_checkpoint(model, optimizer=None, path: str = cfg.CHECKPOINT_PATH):
    """
    Load model (and optionally optimizer) state from a checkpoint file.

    Returns:
        tuple (epoch, best_metric)
    """
    if not os.path.exists(path):
        raise FileNotFoundError(f"❌ Checkpoint not found: {path}")

    ckpt = torch.load(path, map_location="cpu")
    model.load_state_dict(ckpt["model_state"])

    if optimizer is not None and "optimizer_state" in ckpt:
        optimizer.load_state_dict(ckpt["optimizer_state"])

    print(f"✅ Loaded checkpoint from: {path}")
    return ckpt.get("epoch", 0), ckpt.get("best_metric", None)
