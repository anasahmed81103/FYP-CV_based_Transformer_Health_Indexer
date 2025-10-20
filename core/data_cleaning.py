import os, sys
# Add project root to sys.path (works on any OS)
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.append(ROOT_DIR)

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from tqdm import tqdm
from core import config as cfg


def clean_and_split(test_size: float = 0.15, val_size: float = 0.15, seed: int = cfg.SEED):
    """
    Cleans metadata.csv and splits dataset into train, validation, and test CSVs.

    Args:
        test_size (float): Fraction of data for test set.
        val_size (float): Fraction of data for validation set.
        seed (int): Random seed for reproducibility.
    """
    os.makedirs(cfg.PROCESSED_DIR, exist_ok=True)

    # === Load metadata ===
    df = pd.read_csv(cfg.META_FILE)
    assert "image_path" in df.columns, "❌ metadata.csv must contain 'image_path' column"
    assert "health_index" in df.columns, "❌ metadata.csv must contain 'health_index' column"

    # === Drop missing ===
    df = df.dropna(subset=["image_path", "health_index"])

    # === Verify image paths ===
    abs_paths = []
    for p in tqdm(df["image_path"], desc="Verifying image paths"):
        abs_p = os.path.join(cfg.IMAGES_DIR, os.path.basename(p)) if not os.path.isabs(p) else p
        abs_paths.append(abs_p if os.path.exists(abs_p) else None)
    df["abs_image_path"] = abs_paths
    df = df.dropna(subset=["abs_image_path"])

    # === Clip target values ===
    df["health_index"] = df["health_index"].clip(lower=0, upper=100)

    # === Create bins for stratified split ===
    bins = np.linspace(0, 100, 11)
    df["bin"] = np.digitize(df["health_index"], bins)
    valid_bins = df["bin"].value_counts()[lambda x: x >= 2].index
    df = df[df["bin"].isin(valid_bins)]

    # === Split ===
    train_df, test_df = train_test_split(
        df, test_size=test_size, random_state=seed, stratify=df["bin"]
    )
    train_df, val_df = train_test_split(
        train_df, test_size=val_size, random_state=seed, stratify=train_df["bin"]
    )

    # === Save cleaned CSVs ===
    for split_name, split_df in zip(["train", "val", "test"], [train_df, val_df, test_df]):
        out_path = os.path.join(cfg.PROCESSED_DIR, f"{split_name}.csv")
        split_df[["abs_image_path", "health_index"]].rename(
            columns={"abs_image_path": "image_path"}
        ).to_csv(out_path, index=False)

    print("✅ Cleaned and saved train/val/test splits to:")
    print(f"   {cfg.PROCESSED_DIR}")


if __name__ == "__main__":
    clean_and_split()
