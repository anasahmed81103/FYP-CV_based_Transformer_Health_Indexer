import os, sys
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.append(ROOT_DIR)

import pandas as pd
from PIL import Image
import torch
from torch.utils.data import Dataset

# List of the 13 parameter column names
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
    "Damaged_or_bent_pole_structure_score"
]

class TransformerHealthDataset(Dataset):
    def __init__(self, csv_path, transform=None):
        self.df = pd.read_csv(csv_path)
        self.transform = transform

    def __getitem__(self, idx):
        row = self.df.iloc[idx]

        # Image path
        img_path = row["image_path"]
        img = Image.open(img_path).convert("RGB")

        if self.transform:
            img = self.transform(img)

        # Target: 13 parameter values as float tensor
        target = torch.tensor([float(row[col]) for col in PARAM_COLUMNS], dtype=torch.float32)

        return img, target

    def __len__(self):
        return len(self.df)
