import os, sys
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.append(ROOT_DIR)

import math
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from tqdm import tqdm
from sklearn.metrics import mean_absolute_error

from core import config as cfg
from core.dataset import TransformerHealthDataset
from core.augment import build_transforms
from core.utils import set_seed, get_device, save_checkpoint

from models.custom_cnn import CustomCNN
from models.resnet import build_resnet
from models.efficientnet import build_efficientnet


# -----------------------------------------------------------
# Build Model
# -----------------------------------------------------------
def build_model():
    name = cfg.MODEL_NAME
    pretrained = cfg.PRETRAINED
    dropout = cfg.DROPOUT

    if name == "custom_cnn":
        model = CustomCNN(dropout=dropout)
    elif "resnet" in name:
        model = build_resnet(name, pretrained, dropout)
    elif "efficientnet" in name:
        model = build_efficientnet(name)
    else:
        raise ValueError(f"Unknown model: {name}")

    if cfg.FREEZE_BACKBONE and name != "custom_cnn":
        for p in model.parameters():
            p.requires_grad = False
        # unfreeze classifier head
        if hasattr(model, "fc"):
            for p in model.fc.parameters():
                p.requires_grad = True
        elif hasattr(model, "classifier"):
            for p in model.classifier.parameters():
                p.requires_grad = True

    return model


# -----------------------------------------------------------
# Optimizer
# -----------------------------------------------------------
def get_optimizer(params):
    lr = cfg.LEARNING_RATE
    wd = cfg.WEIGHT_DECAY
    opt = cfg.OPTIMIZER.lower()

    if opt == "adamw":
        return torch.optim.AdamW(params, lr=lr, weight_decay=wd)
    if opt == "sgd":
        return torch.optim.SGD(params, lr=lr, momentum=0.9, nesterov=True, weight_decay=wd)

    return torch.optim.Adam(params, lr=lr, weight_decay=wd)


def get_scheduler(optimizer):
    if cfg.SCHEDULER == "step":
        return torch.optim.lr_scheduler.StepLR(optimizer, step_size=10, gamma=0.1)
    if cfg.SCHEDULER == "plateau":
        return torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, "min", factor=0.5, patience=5)
    if cfg.SCHEDULER == "cosine":
        return torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=cfg.NUM_EPOCHS)
    return None


# -----------------------------------------------------------
# Training Loop
# -----------------------------------------------------------
def train_one_epoch(model, loader, criterion, optimizer, device):
    model.train()
    total_loss = 0

    for imgs, targets in tqdm(loader, desc="Train", leave=False):
        imgs = imgs.to(device)
        targets = targets.to(device)  # [B,13]

        optimizer.zero_grad()
        outputs = model(imgs)         # [B,13]
        loss = criterion(outputs, targets)
        loss.backward()
        optimizer.step()

        total_loss += loss.item() * imgs.size(0)

    return total_loss / len(loader.dataset)


# -----------------------------------------------------------
# Eval Loop
# -----------------------------------------------------------
def evaluate(model, loader, criterion, device):
    model.eval()
    losses, preds, trues = [], [], []

    with torch.no_grad():
        for imgs, targets in tqdm(loader, desc="Val", leave=False):
            imgs = imgs.to(device)
            targets = targets.to(device)

            outputs = model(imgs)  # [B,13]
            loss = criterion(outputs, targets)

            losses.append(loss.item() * imgs.size(0))
            preds.append(outputs.cpu())
            trues.append(targets.cpu())

    preds = torch.cat(preds, dim=0).numpy()  # [N,13]
    trues = torch.cat(trues, dim=0).numpy()  # [N,13]

    avg_loss = sum(losses) / len(loader.dataset)
    mae = mean_absolute_error(trues * 6, preds * 6)  # scale back if normalized

    return avg_loss, mae


# -----------------------------------------------------------
# Main
# -----------------------------------------------------------
def main():
    set_seed(cfg.SEED)
    device = get_device()

    # Only resize + normalize transforms
    train_t, val_t, _ = build_transforms(
        image_size=cfg.IMAGE_SIZE,
        mean=cfg.NORMALIZE_MEAN,
        std=cfg.NORMALIZE_STD,
        augment_cfg={}  # disable augmentation
    )

    # Load datasets
    train_ds = TransformerHealthDataset(os.path.join(cfg.PROCESSED_DIR, "train.csv"), transform=train_t)
    val_ds = TransformerHealthDataset(os.path.join(cfg.PROCESSED_DIR, "val.csv"), transform=val_t)

    train_loader = DataLoader(train_ds, batch_size=cfg.BATCH_SIZE, shuffle=True, num_workers=4)
    val_loader = DataLoader(val_ds, batch_size=cfg.BATCH_SIZE, shuffle=False, num_workers=4)

    model = build_model().to(device)
    criterion = nn.L1Loss()  # regression loss
    optimizer = get_optimizer(model.parameters())
    scheduler = get_scheduler(optimizer)

    best_mae = math.inf
    patience = cfg.EARLY_STOPPING_PATIENCE
    no_imp = 0

    for epoch in range(1, cfg.NUM_EPOCHS + 1):
        print(f"\nEpoch {epoch}/{cfg.NUM_EPOCHS}")

        tr_loss = train_one_epoch(model, train_loader, criterion, optimizer, device)
        val_loss, val_mae = evaluate(model, val_loader, criterion, device)

        if scheduler:
            if cfg.SCHEDULER == "plateau":
                scheduler.step(val_loss)
            else:
                scheduler.step()

        print(f"Train: {tr_loss:.4f} | Val Loss: {val_loss:.4f} | MAE(0–6): {val_mae:.2f}")

        # Save best checkpoint
        if val_mae < best_mae:
            best_mae = val_mae
            no_imp = 0
            ckpt_path = os.path.join(cfg.CHECKPOINT_DIR, f"{cfg.MODEL_NAME}_best.pth")
            save_checkpoint(model, optimizer, epoch, best_mae, ckpt_path)
        else:
            no_imp += 1
            if no_imp >= patience:
                print("Early stopping.")
                break


if __name__ == "__main__":
    main()
