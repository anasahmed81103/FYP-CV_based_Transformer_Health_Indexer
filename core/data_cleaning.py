import os
import sys

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
    Cleans metadata and splits dataset into train, validation, and test CSVs.
    Drops ID column, keeps all other columns, puts image_path as first column.
    """
    os.makedirs(cfg.PROCESSED_DIR, exist_ok=True)

    # === Load metadata ===
    df = pd.read_excel(cfg.META_FILE)

    # === Check required columns ===
    assert "ID" in df.columns, "❌ metadata file must contain 'ID' column"
    assert "Overall_Health_Index" in df.columns, "❌ metadata file must contain 'Overall_Health_Index' column"

    # === Drop missing values in essential columns ===
    df = df.dropna(subset=["ID", "Overall_Health_Index"])

    # === Generate absolute image paths ===
    abs_paths = []
    for idx in tqdm(df["ID"], desc="Generating image paths"):
        img_name = f"{idx}.jpg"  # your images are named 1.jpg, 2.jpg, ...
        abs_p = os.path.join(cfg.IMAGES_DIR, img_name)
        abs_paths.append(abs_p if os.path.exists(abs_p) else None)
    df["image_path"] = abs_paths

    # Drop rows where image file is missing
    df = df.dropna(subset=["image_path"])

    # === Create bins for stratified split ===
    bins = np.linspace(0, 100, 11)
    df["bin"] = np.digitize(df["Overall_Health_Index"], bins)
    valid_bins = df["bin"].value_counts()[lambda x: x >= 2].index
    df = df[df["bin"].isin(valid_bins)]

    # === Split dataset ===
    train_df, test_df = train_test_split(
        df, test_size=test_size, random_state=seed, stratify=df["bin"]
    )
    train_df, val_df = train_test_split(
        train_df, test_size=val_size, random_state=seed, stratify=train_df["bin"]
    )

    # === Save CSVs with image_path first and all other columns intact ===
    for split_name, split_df in zip(["train", "val", "test"], [train_df, val_df, test_df]):
        out_path = os.path.join(cfg.PROCESSED_DIR, f"{split_name}.csv")

        # Drop unnecessary columns
        save_df = split_df.drop(columns=["ID", "bin"], errors="ignore")
        # Reorder so image_path is first
        cols = ["image_path"] + [c for c in save_df.columns if c != "image_path"]
        save_df = save_df[cols]

        save_df.to_csv(out_path, index=False)

    print("✅ Cleaned and saved train/val/test splits to:")
    print(f"   {cfg.PROCESSED_DIR}")


if __name__ == "__main__":
    clean_and_split()
