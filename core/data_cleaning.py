import os
import sys
import shutil


# Add project root to sys.path (works on any OS)
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.append(ROOT_DIR)

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from tqdm import tqdm
from core import config as cfg


# ----------------- Override TARGET_MODEL from command line -----------------
if len(sys.argv) > 1:
    arg = sys.argv[1].lower()
    if arg in ["regression", "classifier"]:
        cfg.TARGET_MODEL = arg
print(f"ℹ Using TARGET_MODEL = {cfg.TARGET_MODEL}")




def clean_and_split(test_size: float = 0.15, val_size: float = 0.15, seed: int = cfg.SEED):
    """
    1.Cleans metadata and splits dataset into train, validation, and test CSVs.
    Drops ID column, keeps all other columns, puts image_path as first column.

     2. Classifier (PMT vs Non-PMT) → folder-based train/val/test
    """


    os.makedirs(cfg.PROCESSED_DIR, exist_ok=True)

# ------------------------------------------------Regression 13 params model exactly same functionality no changes-------------------


    if cfg.TARGET_MODEL == "regression":

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

            print("✅ Regression Data Cleaned and saved train/val/test splits to:")
            print(f"   {cfg.PROCESSED_DIR}")


# ----------------------------------------------classifier PMT VS non PMT data cleaning ------------------------------------------

    elif cfg.TARGET_MODEL == "classifier":

            # -------- Classifier folder-based split --------
            base_dir = cfg.CLASSIFIER_RAW_DIR
            classes = ["pmt", "non-pmt"]

            if not os.path.exists(base_dir):
                raise FileNotFoundError(f"❌ Classifier raw folder not found: {base_dir}")

            seed = 42
            test_size = 0.05      # 5% test
            val_size = 0.15       # 15% validation from remaining

            for cls in classes:
                cls_dir = os.path.join(base_dir, cls)
                if not os.path.exists(cls_dir):
                    continue

                # Group images by base/original image to avoid splitting augmented versions
                grouped_images = {}
                for fname in os.listdir(cls_dir):
                    if fname.lower().endswith((".jpg", ".jpeg", ".png")):
                        # Assumes augmented images have same base name before "_aug" suffix
                        base_name = fname.split("_aug")[0]  
                        grouped_images.setdefault(base_name, []).append(os.path.join(cls_dir, fname))

                groups = list(grouped_images.values())

                # --- Calculate train/val/test split based on groups ---
                n_total_groups = len(groups)
                n_test_groups = max(1, int(n_total_groups * test_size))
                n_val_groups = max(1, int((n_total_groups - n_test_groups) * val_size))
                n_train_groups = n_total_groups - n_val_groups - n_test_groups

                # Sequential split (deterministic)
                train_groups = groups[:n_train_groups]
                val_groups = groups[n_train_groups:n_train_groups+n_val_groups]
                test_groups = groups[n_train_groups+n_val_groups:]

                splits = {
                    "train": train_groups,
                    "val": val_groups,
                    "test": test_groups
                }

                # Copy files to processed folders
                for split_name, split_groups in splits.items():
                    split_dir = os.path.join(cfg.CLASSIFIER_PROCESSED_DIR, split_name, cls)
                    os.makedirs(split_dir, exist_ok=True)
                    for group in split_groups:
                        for src_path in group:
                            dst_path = os.path.join(split_dir, os.path.basename(src_path))
                            shutil.copy2(src_path, dst_path)

            print("✅ Classifier data cleaned and split (grouped, non-overlapping) into folders:")
            print(f"   {cfg.CLASSIFIER_PROCESSED_DIR}/train")
            print(f"   {cfg.CLASSIFIER_PROCESSED_DIR}/val")
            print(f"   {cfg.CLASSIFIER_PROCESSED_DIR}/test")



    else:
        raise ValueError(f"❌ Unknown TARGET_MODEL: {cfg.TARGET_MODEL}")
       


if __name__ == "__main__":
    clean_and_split()
