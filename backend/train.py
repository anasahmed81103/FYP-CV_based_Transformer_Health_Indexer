import os, sys
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.append(ROOT_DIR)

import math
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from tqdm import tqdm
from sklearn.metrics import mean_absolute_error, accuracy_score, f1_score, precision_score, recall_score, confusion_matrix
import argparse



from core import config as cfg
from core.dataset import TransformerHealthDataset

from core.dataset import PMTClassifierDataset

from core.augment import build_transforms
from core.utils import set_seed, get_device, save_checkpoint

from models.custom_cnn import CustomCNN
from models.resnet import build_resnet
from models.efficientnet import build_efficientnet

from models.pmt_classifier import build_pmt_classifier



# -----------------------------------------------------------
# Build Model
# -----------------------------------------------------------
def build_model(model_name):
    
    pretrained = cfg.PRETRAINED
    dropout = cfg.DROPOUT

    
    if model_name in ["custom_cnn", "resnet18", "resnet50", "efficientnet_b0", "efficientnet_b3"]:


        if model_name == "custom_cnn":
            model = CustomCNN(dropout=dropout)
        elif "resnet" in model_name:
            model = build_resnet(model_name, pretrained, dropout)
        elif "efficientnet" in model_name:
            model = build_efficientnet(model_name)
    

        if cfg.FREEZE_BACKBONE and model_name != "custom_cnn":
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
    

    elif model_name == "pmt_classifier":
        
        return build_pmt_classifier()
    
    else:
        raise ValueError(f"Unknown model: {model_name}")



# -----------------------------------------------------------
# Optimizer & scheduler 
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
# Training Loops
# -----------------------------------------------------------


def train_one_epoch_regression(model, loader, criterion, optimizer, device):
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




# one epoch for classifier model 

def train_one_epoch_classifier(model, loader, criterion, optimizer, device):
    model.train()
    total_loss = 0
    for imgs, labels in tqdm(loader, desc="Train", leave=False):
        imgs, labels = imgs.to(device), labels.to(device)
        optimizer.zero_grad()
        outputs = model(imgs)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()
        total_loss += loss.item() * imgs.size(0)
    return total_loss / len(loader.dataset)





# -----------------------------------------------------------
# Eval Loops
# -----------------------------------------------------------


def evaluate_regression(model, loader, criterion, device):
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




# classifier model evaluation 


def evaluate_classifier(model, loader, criterion, device):
    model.eval()
    all_labels, all_preds = [], []
    with torch.no_grad():
        for imgs, labels in tqdm(loader, desc="Val", leave=False):
            imgs, labels = imgs.to(device), labels.to(device)
            outputs = model(imgs)
            loss = criterion(outputs, labels)
            preds = torch.argmax(outputs, dim=1)
            all_labels.extend(labels.cpu().numpy())
            all_preds.extend(preds.cpu().numpy())
    acc = accuracy_score(all_labels, all_preds)
    prec = precision_score(all_labels, all_preds, zero_division=0)
    rec = recall_score(all_labels, all_preds, zero_division=0)
    f1 = f1_score(all_labels, all_preds, zero_division=0)
    cm = confusion_matrix(all_labels, all_preds)
    return acc, prec, rec, f1, cm






# -----------------------------------------------------------
# Main
# -----------------------------------------------------------
def main():


    parser = argparse.ArgumentParser()
    parser.add_argument("--model", type=str, default=None, help="Choose model to train: 'regression' or 'classifier'")
    args = parser.parse_args()




    set_seed(cfg.SEED)
    device = get_device()


    # Determine which model to train
    if args.model == "classifier":
        cfg.MODEL_NAME = "pmt_classifier"
    else:
        cfg.MODEL_NAME = cfg.MODEL_NAME  # regression remains as set in config

    model_name = cfg.MODEL_NAME




    # -------------------
    # Select dataset and transforms
    # -------------------
    if model_name == "pmt_classifier":
        _, val_t, _ = build_transforms(cfg.IMAGE_SIZE, cfg.NORMALIZE_MEAN, cfg.NORMALIZE_STD, augment_cfg={})
        train_ds = PMTClassifierDataset(os.path.join(cfg.CLASSIFIER_PROCESSED_DIR, "train"), transform=_)
        val_ds = PMTClassifierDataset(os.path.join(cfg.CLASSIFIER_PROCESSED_DIR, "val"), transform=val_t)
        criterion = nn.CrossEntropyLoss()
    
    
    else:
        train_t, val_t, _ = build_transforms(cfg.IMAGE_SIZE, cfg.NORMALIZE_MEAN, cfg.NORMALIZE_STD, augment_cfg={})
        train_ds = TransformerHealthDataset(os.path.join(cfg.PROCESSED_DIR, "train.csv"), transform=train_t)
        val_ds = TransformerHealthDataset(os.path.join(cfg.PROCESSED_DIR, "val.csv"), transform=val_t)
        criterion = nn.L1Loss()

    
    
    train_loader = DataLoader(train_ds, batch_size=cfg.BATCH_SIZE, shuffle=True, num_workers=4)
    val_loader = DataLoader(val_ds, batch_size=cfg.BATCH_SIZE, shuffle=False, num_workers=4)

    
    model = build_model(model_name).to(device)
    
    optimizer = get_optimizer(model.parameters())
    
    scheduler = get_scheduler(optimizer)

    
    best_metric = -math.inf if model_name == "pmt_classifier" else math.inf
    no_imp = 0
    patience = cfg.EARLY_STOPPING_PATIENCE

    for epoch in range(1, cfg.NUM_EPOCHS + 1):
       
        print(f"\nEpoch {epoch}/{cfg.NUM_EPOCHS}")

       
        if model_name == "pmt_classifier":
            tr_loss = train_one_epoch_classifier(model, train_loader, criterion, optimizer, device)
            acc, prec, rec, f1, cm = evaluate_classifier(model, val_loader, criterion, device)
            current_metric = f1
            print(f"Train Loss: {tr_loss:.4f} | Val F1: {f1:.4f} | Acc: {acc:.4f}")
       
        else:
            tr_loss = train_one_epoch_regression(model, train_loader, criterion, optimizer, device)
            val_loss, val_mae = evaluate_regression(model, val_loader, criterion, device)
            current_metric = val_mae
            print(f"Train Loss: {tr_loss:.4f} | Val Loss: {val_loss:.4f} | MAE(0–6): {val_mae:.2f}")

        # Scheduler step
       
        if scheduler:
            if cfg.SCHEDULER == "plateau" and model_name != "pmt_classifier":
                scheduler.step(val_loss)
            else:
                scheduler.step()

        
        # Checkpoint
        if (model_name == "pmt_classifier" and current_metric > best_metric) or \
           (model_name != "pmt_classifier" and current_metric < best_metric):
            best_metric = current_metric
            no_imp = 0
            ckpt_path = os.path.join(cfg.CHECKPOINT_DIR, f"{model_name}_best.pth")
            save_checkpoint(model, optimizer, epoch, best_metric, ckpt_path)
       
        else:
            no_imp += 1
            if no_imp >= patience:
                print("Early stopping.")
                break




if __name__ == "__main__":
    main()



   