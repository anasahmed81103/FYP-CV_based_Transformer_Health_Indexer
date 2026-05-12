"""
EfficientNet-B0 Comprehensive Test Evaluation Script
=====================================================
Tests the trained efficientnet_b0_best.pth model against the held-out test set.
Produces:
  - Per-parameter MAE, RMSE, R²
  - Overall aggregate metrics
  - Bar charts, scatter plots, residual plots, heatmaps
  - Binned "truth matrix" (confusion-style) per parameter
  - Full predictions CSV

All outputs saved to: outputs/test_results/
"""

import os, sys

# ── Project root on sys.path ────────────────────────────────────────────────
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

import torch
import torch.nn as nn
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")                      # non-interactive backend (no display needed)
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import seaborn as sns
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms
from PIL import Image
from sklearn.metrics import (
    mean_absolute_error, mean_squared_error, r2_score, confusion_matrix
)
from tqdm import tqdm

# ── Internal imports (read-only; no pipeline files modified) ────────────────
from models.efficientnet import build_efficientnet
from core.utils import get_device

# ═══════════════════════════════════════════════════════════════════════════
# CONFIGURATION  (all paths derived from ROOT_DIR — nothing hard-coded)
# ═══════════════════════════════════════════════════════════════════════════
CHECKPOINT_PATH = os.path.join(ROOT_DIR, "outputs", "checkpoints", "efficientnet_b0_best.pth")
TEST_CSV        = os.path.join(ROOT_DIR, "data", "processed", "test.csv")
OUT_DIR         = os.path.join(ROOT_DIR, "outputs", "test_results")

IMAGE_SIZE      = 224
BATCH_SIZE      = 32
NORMALIZE_MEAN  = [0.485, 0.456, 0.406]
NORMALIZE_STD   = [0.229, 0.224, 0.225]

# 13 parameter names (order matches model output index 0–12)
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

# Short labels for charts (keeps axes readable)
SHORT_NAMES = [
    "Oil Leakage",
    "Corrosion",
    "Rust",
    "Paint Fading",
    "Bushing Cracks",
    "Broken Connectors",
    "Insulator Contam.",
    "Burnt / Overheat",
    "Deformed Tank",
    "Loose Wiring",
    "Dust Accumulation",
    "Gasket Leakage",
    "Damaged Pole",
]

# Score bins for the "truth matrix" (0–6 range → 3 health categories)
BINS   = [0, 2, 4, 6.01]
LABELS = ["Good (0–2)", "Fair (2–4)", "Poor (4–6)"]


# ═══════════════════════════════════════════════════════════════════════════
# DATASET  (standalone — no modification of core/dataset.py)
# ═══════════════════════════════════════════════════════════════════════════
class TestDataset(Dataset):
    """
    Loads the test CSV.  Transparently remaps image paths if the drive
    letter stored in the CSV differs from the current machine (e.g. D:\→E:\).
    """
    def __init__(self, csv_path: str, transform):
        self.df = pd.read_csv(csv_path)
        self.transform = transform
        self._fix_drive()

    def _fix_drive(self):
        """Replace the drive letter in stored paths with the one where
        the project currently lives (handles D:\ → E:\ migration)."""
        project_drive = os.path.splitdrive(ROOT_DIR)[0].upper()  # e.g. "E:"
        def _remap(p):
            stored_drive, tail = os.path.splitdrive(str(p))
            if stored_drive.upper() != project_drive:
                return project_drive + tail
            return p
        self.df["image_path"] = self.df["image_path"].apply(_remap)

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        img = Image.open(row["image_path"]).convert("RGB")
        img = self.transform(img)
        target = torch.tensor(
            [float(row[c]) for c in PARAM_COLUMNS], dtype=torch.float32
        )
        return img, target


# ═══════════════════════════════════════════════════════════════════════════
# MODEL LOADER
# ═══════════════════════════════════════════════════════════════════════════
def load_model(ckpt_path: str, device):
    model = build_efficientnet(model_name="efficientnet_b0")
    ckpt = torch.load(ckpt_path, map_location="cpu")
    state = ckpt["model_state"] if "model_state" in ckpt else ckpt
    model.load_state_dict(state)
    model.to(device).eval()
    print(f"[OK] Loaded checkpoint: {ckpt_path}")
    print(f"     Saved at epoch {ckpt.get('epoch', '?')}  |  "
          f"best_metric = {ckpt.get('best_metric', '?')}")
    return model


# ═══════════════════════════════════════════════════════════════════════════
# INFERENCE
# ═══════════════════════════════════════════════════════════════════════════
def run_inference(model, device):
    test_transform = transforms.Compose([
        transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(mean=NORMALIZE_MEAN, std=NORMALIZE_STD),
    ])

    dataset = TestDataset(TEST_CSV, test_transform)
    loader  = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=False,
                         num_workers=0, pin_memory=False)

    all_preds, all_targets = [], []
    criterion = nn.L1Loss(reduction="sum")
    total_l1 = 0.0

    with torch.no_grad():
        for imgs, targets in tqdm(loader, desc="Evaluating test set"):
            imgs    = imgs.to(device)
            targets = targets.to(device)
            outputs = model(imgs)                   # [B, 13]
            outputs_clipped = torch.clamp(outputs, 0.0, 6.0)
            total_l1 += criterion(outputs_clipped, targets).item()
            all_preds.append(outputs_clipped.cpu().numpy())
            all_targets.append(targets.cpu().numpy())

    preds   = np.vstack(all_preds)    # [N, 13]
    targets = np.vstack(all_targets)  # [N, 13]
    avg_l1  = total_l1 / (len(dataset) * 13)
    return preds, targets, avg_l1


# ═══════════════════════════════════════════════════════════════════════════
# METRICS
# ═══════════════════════════════════════════════════════════════════════════
def compute_metrics(preds, targets):
    results = {}
    mae_list, rmse_list, r2_list = [], [], []

    for i, name in enumerate(PARAM_COLUMNS):
        p, t = preds[:, i], targets[:, i]
        mae  = mean_absolute_error(t, p)
        rmse = np.sqrt(mean_squared_error(t, p))
        try:
            r2 = r2_score(t, p)
        except Exception:
            r2 = float("nan")
        results[name] = {"MAE": mae, "RMSE": rmse, "R2": r2}
        mae_list.append(mae);  rmse_list.append(rmse);  r2_list.append(r2)

    # Overall (flatten all parameters)
    overall_mae  = mean_absolute_error(targets.ravel(), preds.ravel())
    overall_rmse = np.sqrt(mean_squared_error(targets.ravel(), preds.ravel()))
    overall_r2   = np.nanmean(r2_list)

    results["__overall__"] = {
        "MAE": overall_mae, "RMSE": overall_rmse, "R2": overall_r2
    }
    return results, mae_list, rmse_list, r2_list


# ═══════════════════════════════════════════════════════════════════════════
# CONSOLE REPORT
# ═══════════════════════════════════════════════════════════════════════════
def print_report(results, avg_l1):
    sep = "=" * 72
    print(f"\n{sep}")
    print("  EfficientNet-B0  |  Test-Set Evaluation Report")
    print(sep)
    print(f"  {'Parameter':<45}  {'MAE':>6}  {'RMSE':>6}  {'R²':>7}")
    print(f"  {'-'*45}  {'-'*6}  {'-'*6}  {'-'*7}")
    for i, name in enumerate(PARAM_COLUMNS):
        m = results[name]
        print(f"  {SHORT_NAMES[i]:<45}  {m['MAE']:>6.4f}  {m['RMSE']:>6.4f}  {m['R2']:>7.4f}")
    print(f"  {'─'*63}")
    ov = results["__overall__"]
    print(f"  {'OVERALL (mean across all params)':<45}  {ov['MAE']:>6.4f}  {ov['RMSE']:>6.4f}  {ov['R2']:>7.4f}")
    print(f"\n  Avg L1 loss per element (clipped 0–6): {avg_l1:.6f}")
    print(sep + "\n")


# ═══════════════════════════════════════════════════════════════════════════
# SAVE METRICS CSV
# ═══════════════════════════════════════════════════════════════════════════
def save_metrics_csv(results, out_dir):
    rows = []
    for i, name in enumerate(PARAM_COLUMNS):
        m = results[name]
        rows.append({"Parameter": name, "Short_Name": SHORT_NAMES[i],
                     "MAE": m["MAE"], "RMSE": m["RMSE"], "R2": m["R2"]})
    ov = results["__overall__"]
    rows.append({"Parameter": "OVERALL", "Short_Name": "Overall",
                 "MAE": ov["MAE"], "RMSE": ov["RMSE"], "R2": ov["R2"]})

    df = pd.DataFrame(rows)
    path = os.path.join(out_dir, "efficientnet_b0_test_metrics.csv")
    df.to_csv(path, index=False)
    print(f"[Saved] Metrics CSV  → {path}")
    return df


# ═══════════════════════════════════════════════════════════════════════════
# SAVE PREDICTIONS CSV
# ═══════════════════════════════════════════════════════════════════════════
def save_predictions_csv(preds, targets, out_dir):
    pred_df = pd.DataFrame(preds,   columns=[f"pred_{c}" for c in PARAM_COLUMNS])
    true_df = pd.DataFrame(targets, columns=[f"true_{c}" for c in PARAM_COLUMNS])
    pred_df["pred_overall_sum"] = pred_df.sum(axis=1)
    true_df["true_overall_sum"] = true_df[[f"true_{c}" for c in PARAM_COLUMNS]].sum(axis=1)
    out = pd.concat([pred_df, true_df], axis=1)
    path = os.path.join(out_dir, "efficientnet_b0_test_predictions_full.csv")
    out.to_csv(path, index=False)
    print(f"[Saved] Predictions CSV → {path}")


# ═══════════════════════════════════════════════════════════════════════════
# FIGURE 1 — Per-Parameter MAE Bar Chart
# ═══════════════════════════════════════════════════════════════════════════
def plot_mae_bar(mae_list, rmse_list, out_dir):
    x = np.arange(len(PARAM_COLUMNS))
    width = 0.38

    fig, ax = plt.subplots(figsize=(14, 6))
    bars1 = ax.bar(x - width/2, mae_list,  width, label="MAE",  color="#2196F3", alpha=0.85)
    bars2 = ax.bar(x + width/2, rmse_list, width, label="RMSE", color="#F44336", alpha=0.85)

    ax.set_xticks(x)
    ax.set_xticklabels(SHORT_NAMES, rotation=35, ha="right", fontsize=9)
    ax.set_ylabel("Error (0–6 scale)")
    ax.set_title("EfficientNet-B0 — Per-Parameter MAE & RMSE on Test Set", fontsize=13, fontweight="bold")
    ax.legend(fontsize=11)
    ax.yaxis.grid(True, linestyle="--", alpha=0.5)
    ax.set_axisbelow(True)

    # annotate bars
    for b in bars1:
        ax.text(b.get_x() + b.get_width()/2, b.get_height() + 0.02,
                f"{b.get_height():.3f}", ha="center", va="bottom", fontsize=7.5)
    for b in bars2:
        ax.text(b.get_x() + b.get_width()/2, b.get_height() + 0.02,
                f"{b.get_height():.3f}", ha="center", va="bottom", fontsize=7.5)

    plt.tight_layout()
    path = os.path.join(out_dir, "fig1_mae_rmse_bar.png")
    plt.savefig(path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"[Saved] Fig 1 — MAE/RMSE bar chart → {path}")


# ═══════════════════════════════════════════════════════════════════════════
# FIGURE 2 — R² Bar Chart
# ═══════════════════════════════════════════════════════════════════════════
def plot_r2_bar(r2_list, out_dir):
    colors = ["#4CAF50" if r >= 0.5 else "#FF9800" if r >= 0 else "#F44336"
              for r in r2_list]

    fig, ax = plt.subplots(figsize=(14, 5))
    bars = ax.bar(range(len(PARAM_COLUMNS)), r2_list, color=colors, alpha=0.85, edgecolor="white")
    ax.axhline(0, color="black", linewidth=0.8)
    ax.axhline(0.5, color="#9C27B0", linewidth=1.0, linestyle="--", label="R²=0.5 threshold")
    ax.set_xticks(range(len(PARAM_COLUMNS)))
    ax.set_xticklabels(SHORT_NAMES, rotation=35, ha="right", fontsize=9)
    ax.set_ylabel("R² Score")
    ax.set_title("EfficientNet-B0 — Per-Parameter R² Score on Test Set", fontsize=13, fontweight="bold")
    ax.legend(fontsize=10)
    ax.yaxis.grid(True, linestyle="--", alpha=0.4)
    ax.set_axisbelow(True)
    for b in bars:
        ax.text(b.get_x() + b.get_width()/2,
                b.get_height() + (0.015 if b.get_height() >= 0 else -0.04),
                f"{b.get_height():.3f}", ha="center", va="bottom", fontsize=8)
    plt.tight_layout()
    path = os.path.join(out_dir, "fig2_r2_bar.png")
    plt.savefig(path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"[Saved] Fig 2 — R² bar chart → {path}")


# ═══════════════════════════════════════════════════════════════════════════
# FIGURE 3 — Predicted vs Actual Scatter (all 13 params in one grid)
# ═══════════════════════════════════════════════════════════════════════════
def plot_pred_vs_actual_grid(preds, targets, out_dir):
    fig, axes = plt.subplots(3, 5, figsize=(20, 12))
    axes = axes.ravel()

    for i in range(13):
        ax = axes[i]
        t, p = targets[:, i], preds[:, i]
        ax.scatter(t, p, alpha=0.35, s=12, color="#1565C0", rasterized=True)
        lo, hi = 0, 6
        ax.plot([lo, hi], [lo, hi], "r--", linewidth=1.2, label="Ideal")
        ax.set_xlim(lo - 0.2, hi + 0.2)
        ax.set_ylim(lo - 0.2, hi + 0.2)
        ax.set_title(SHORT_NAMES[i], fontsize=9, fontweight="bold")
        ax.set_xlabel("Actual", fontsize=8)
        ax.set_ylabel("Predicted", fontsize=8)
        ax.tick_params(labelsize=7)
        mae = mean_absolute_error(t, p)
        ax.text(0.05, 0.92, f"MAE={mae:.3f}", transform=ax.transAxes,
                fontsize=8, color="#B71C1C")

    for j in range(13, len(axes)):
        axes[j].set_visible(False)

    fig.suptitle("EfficientNet-B0 — Predicted vs Actual (All 13 Parameters)",
                 fontsize=14, fontweight="bold", y=1.01)
    plt.tight_layout()
    path = os.path.join(out_dir, "fig3_pred_vs_actual_grid.png")
    plt.savefig(path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"[Saved] Fig 3 — Pred vs Actual grid → {path}")


# ═══════════════════════════════════════════════════════════════════════════
# FIGURE 4 — Residual Distribution (error histogram per parameter)
# ═══════════════════════════════════════════════════════════════════════════
def plot_residual_grid(preds, targets, out_dir):
    residuals = preds - targets      # [N, 13]

    fig, axes = plt.subplots(3, 5, figsize=(20, 11))
    axes = axes.ravel()

    for i in range(13):
        ax = axes[i]
        r = residuals[:, i]
        ax.hist(r, bins=30, color="#0288D1", edgecolor="white", alpha=0.85)
        ax.axvline(0,   color="red",    linewidth=1.4, linestyle="--")
        ax.axvline(r.mean(), color="#FF6F00", linewidth=1.2,
                   linestyle="-", label=f"mean={r.mean():.3f}")
        ax.set_title(SHORT_NAMES[i], fontsize=9, fontweight="bold")
        ax.set_xlabel("Residual (pred − actual)", fontsize=8)
        ax.set_ylabel("Count", fontsize=8)
        ax.tick_params(labelsize=7)
        ax.legend(fontsize=7)

    for j in range(13, len(axes)):
        axes[j].set_visible(False)

    fig.suptitle("EfficientNet-B0 — Residual Distributions (Test Set)",
                 fontsize=14, fontweight="bold", y=1.01)
    plt.tight_layout()
    path = os.path.join(out_dir, "fig4_residual_distributions.png")
    plt.savefig(path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"[Saved] Fig 4 — Residual distributions → {path}")


# ═══════════════════════════════════════════════════════════════════════════
# FIGURE 5 — Error Heatmap  (mean |error| across parameters)
# ═══════════════════════════════════════════════════════════════════════════
def plot_error_heatmap(preds, targets, out_dir):
    abs_errors = np.abs(preds - targets)          # [N, 13]

    # Bin samples by their true overall health sum into 4 quartile groups
    overall_sum = targets.sum(axis=1)
    quartiles   = np.percentile(overall_sum, [25, 50, 75])
    group_labels = ["Q1 (Healthiest)", "Q2", "Q3", "Q4 (Most Defective)"]
    groups = np.digitize(overall_sum, quartiles)  # 0,1,2,3

    heatmap_data = np.zeros((4, 13))
    for g in range(4):
        mask = groups == g
        if mask.sum() > 0:
            heatmap_data[g] = abs_errors[mask].mean(axis=0)

    fig, ax = plt.subplots(figsize=(16, 5))
    sns.heatmap(
        heatmap_data,
        annot=True, fmt=".3f", cmap="YlOrRd",
        xticklabels=SHORT_NAMES,
        yticklabels=group_labels,
        linewidths=0.4, linecolor="white",
        ax=ax, cbar_kws={"label": "Mean Absolute Error"},
    )
    ax.set_xticklabels(ax.get_xticklabels(), rotation=35, ha="right", fontsize=9)
    ax.set_title("EfficientNet-B0 — Mean |Error| per Parameter × Health Quartile",
                 fontsize=13, fontweight="bold", pad=12)
    plt.tight_layout()
    path = os.path.join(out_dir, "fig5_error_heatmap.png")
    plt.savefig(path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"[Saved] Fig 5 — Error heatmap → {path}")


# ═══════════════════════════════════════════════════════════════════════════
# FIGURE 6 — Binned Truth Matrices  (confusion-style, 3×3 per parameter)
# ═══════════════════════════════════════════════════════════════════════════
def _bin(arr):
    return pd.cut(arr, bins=BINS, labels=[0, 1, 2], right=False).astype(int)


def plot_truth_matrices(preds, targets, out_dir):
    """
    Discretise each parameter's scores into Good/Fair/Poor bins and
    compute a 3×3 confusion matrix (rows = actual, cols = predicted).
    """
    fig, axes = plt.subplots(3, 5, figsize=(22, 14))
    axes = axes.ravel()

    for i in range(13):
        t_bin = _bin(targets[:, i])
        p_bin = _bin(preds[:, i])

        cm = confusion_matrix(t_bin, p_bin, labels=[0, 1, 2])

        ax = axes[i]
        sns.heatmap(
            cm, annot=True, fmt="d", cmap="Blues",
            xticklabels=LABELS, yticklabels=LABELS,
            ax=ax, linewidths=0.5, linecolor="white",
            cbar=False,
        )
        ax.set_title(SHORT_NAMES[i], fontsize=9, fontweight="bold")
        ax.set_xlabel("Predicted", fontsize=8)
        ax.set_ylabel("Actual",    fontsize=8)
        ax.tick_params(axis="x", labelsize=7, rotation=30)
        ax.tick_params(axis="y", labelsize=7, rotation=0)

        total  = cm.sum()
        diag   = np.trace(cm)
        acc    = diag / total if total > 0 else 0.0
        ax.text(0.5, -0.22, f"Bin Acc = {acc:.2%}",
                transform=ax.transAxes, ha="center", fontsize=8, color="#1B5E20")

    for j in range(13, len(axes)):
        axes[j].set_visible(False)

    fig.suptitle(
        "EfficientNet-B0 — Binned Truth Matrices  (Good / Fair / Poor)\n"
        "Rows = Actual class   |   Columns = Predicted class",
        fontsize=13, fontweight="bold", y=1.01,
    )
    plt.tight_layout()
    path = os.path.join(out_dir, "fig6_truth_matrices.png")
    plt.savefig(path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"[Saved] Fig 6 — Truth matrices (13 params) → {path}")


# ═══════════════════════════════════════════════════════════════════════════
# FIGURE 7 — Overall Health Index  (sum of 13 scores)
# ═══════════════════════════════════════════════════════════════════════════
def plot_overall_health_index(preds, targets, out_dir):
    pred_sum = preds.sum(axis=1)      # max = 78 (13 × 6)
    true_sum = targets.sum(axis=1)

    mae  = mean_absolute_error(true_sum, pred_sum)
    rmse = np.sqrt(mean_squared_error(true_sum, pred_sum))
    try:
        r2 = r2_score(true_sum, pred_sum)
    except Exception:
        r2 = float("nan")

    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    # Left — scatter
    ax = axes[0]
    ax.scatter(true_sum, pred_sum, alpha=0.35, s=15, color="#1565C0", rasterized=True)
    lo, hi = 0, 78
    ax.plot([lo, hi], [lo, hi], "r--", linewidth=1.3, label="Ideal")
    ax.set_xlabel("Actual Overall Health Index (sum)", fontsize=11)
    ax.set_ylabel("Predicted Overall Health Index (sum)", fontsize=11)
    ax.set_title(f"Overall Health Index\nMAE={mae:.3f}  RMSE={rmse:.3f}  R²={r2:.3f}",
                 fontsize=12, fontweight="bold")
    ax.legend(fontsize=10)
    ax.grid(True, linestyle="--", alpha=0.4)

    # Right — error distribution
    ax2 = axes[1]
    err = pred_sum - true_sum
    ax2.hist(err, bins=40, color="#0288D1", edgecolor="white", alpha=0.85)
    ax2.axvline(0, color="red", linewidth=1.4, linestyle="--", label="Zero error")
    ax2.axvline(err.mean(), color="#FF6F00", linewidth=1.2,
                label=f"Mean error = {err.mean():.2f}")
    ax2.set_xlabel("Residual (pred − actual)", fontsize=11)
    ax2.set_ylabel("Count", fontsize=11)
    ax2.set_title("Overall Health Index — Residual Distribution", fontsize=12, fontweight="bold")
    ax2.legend(fontsize=10)
    ax2.grid(True, linestyle="--", alpha=0.4)

    plt.tight_layout()
    path = os.path.join(out_dir, "fig7_overall_health_index.png")
    plt.savefig(path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"[Saved] Fig 7 — Overall health index → {path}")
    return mae, rmse, r2


# ═══════════════════════════════════════════════════════════════════════════
# FIGURE 8 — Summary Dashboard
# ═══════════════════════════════════════════════════════════════════════════
def plot_summary_dashboard(mae_list, rmse_list, r2_list, overall_stats, out_dir):
    fig = plt.figure(figsize=(16, 9))
    gs  = gridspec.GridSpec(2, 2, hspace=0.45, wspace=0.35)

    # ── Top-left: MAE bar ──────────────────────────────────────────────────
    ax1 = fig.add_subplot(gs[0, 0])
    colors = plt.cm.RdYlGn_r(np.array(mae_list) / 3.0)
    ax1.barh(SHORT_NAMES[::-1], mae_list[::-1], color=colors[::-1], alpha=0.85)
    ax1.axvline(overall_stats["mae"], color="navy", linewidth=1.5,
                linestyle="--", label=f"Overall MAE={overall_stats['mae']:.3f}")
    ax1.set_xlabel("MAE (0–6 scale)")
    ax1.set_title("Per-Parameter MAE", fontweight="bold")
    ax1.legend(fontsize=8)
    ax1.tick_params(labelsize=8)

    # ── Top-right: RMSE bar ────────────────────────────────────────────────
    ax2 = fig.add_subplot(gs[0, 1])
    colors2 = plt.cm.RdYlGn_r(np.array(rmse_list) / 3.0)
    ax2.barh(SHORT_NAMES[::-1], rmse_list[::-1], color=colors2[::-1], alpha=0.85)
    ax2.axvline(overall_stats["rmse"], color="navy", linewidth=1.5,
                linestyle="--", label=f"Overall RMSE={overall_stats['rmse']:.3f}")
    ax2.set_xlabel("RMSE (0–6 scale)")
    ax2.set_title("Per-Parameter RMSE", fontweight="bold")
    ax2.legend(fontsize=8)
    ax2.tick_params(labelsize=8)

    # ── Bottom-left: R² bar ────────────────────────────────────────────────
    ax3 = fig.add_subplot(gs[1, 0])
    r2_colors = ["#4CAF50" if r >= 0.5 else "#FF9800" if r >= 0 else "#F44336" for r in r2_list]
    ax3.barh(SHORT_NAMES[::-1], r2_list[::-1], color=r2_colors[::-1], alpha=0.85)
    ax3.axvline(0,   color="black", linewidth=0.8)
    ax3.axvline(overall_stats["r2"], color="navy", linewidth=1.5,
                linestyle="--", label=f"Mean R²={overall_stats['r2']:.3f}")
    ax3.set_xlabel("R² Score")
    ax3.set_title("Per-Parameter R²", fontweight="bold")
    ax3.legend(fontsize=8)
    ax3.tick_params(labelsize=8)

    # ── Bottom-right: text summary ─────────────────────────────────────────
    ax4 = fig.add_subplot(gs[1, 1])
    ax4.axis("off")
    summary_text = (
        "EfficientNet-B0  |  Test Set Summary\n"
        f"{'─'*34}\n"
        f"  Test samples          :  {overall_stats['n_samples']}\n"
        f"  Overall MAE           :  {overall_stats['mae']:.4f}\n"
        f"  Overall RMSE          :  {overall_stats['rmse']:.4f}\n"
        f"  Mean R² (per param)   :  {overall_stats['r2']:.4f}\n"
        f"  Avg L1 loss / element :  {overall_stats['avg_l1']:.6f}\n"
        f"{'─'*34}\n"
        f"  Best param  (MAE)     :  {SHORT_NAMES[int(np.argmin(mae_list))]}\n"
        f"  Hardest param (MAE)   :  {SHORT_NAMES[int(np.argmax(mae_list))]}\n"
        f"{'─'*34}\n"
        f"  Score range           :  0 – 6 per parameter\n"
        f"  Score bins            :  Good 0–2 / Fair 2–4 / Poor 4–6\n"
    )
    ax4.text(0.05, 0.95, summary_text, transform=ax4.transAxes,
             fontsize=10.5, verticalalignment="top",
             fontfamily="monospace",
             bbox=dict(boxstyle="round,pad=0.6", facecolor="#EEF2FF", alpha=0.8))

    fig.suptitle("EfficientNet-B0 — Full Evaluation Dashboard",
                 fontsize=16, fontweight="bold")
    path = os.path.join(out_dir, "fig8_summary_dashboard.png")
    plt.savefig(path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"[Saved] Fig 8 — Summary dashboard → {path}")


# ═══════════════════════════════════════════════════════════════════════════
# FIGURE 9 — Per-parameter violin/box of actual vs predicted distribution
# ═══════════════════════════════════════════════════════════════════════════
def plot_distribution_comparison(preds, targets, out_dir):
    fig, axes = plt.subplots(3, 5, figsize=(22, 12))
    axes = axes.ravel()

    for i in range(13):
        ax = axes[i]
        ax.boxplot(
            [targets[:, i], preds[:, i]],
            labels=["Actual", "Predicted"],
            patch_artist=True,
            boxprops=dict(facecolor="#B3E5FC", color="#01579B"),
            medianprops=dict(color="red", linewidth=2),
            whiskerprops=dict(color="#01579B"),
            capprops=dict(color="#01579B"),
        )
        ax.set_ylim(-0.3, 6.5)
        ax.set_title(SHORT_NAMES[i], fontsize=9, fontweight="bold")
        ax.tick_params(labelsize=8)
        ax.yaxis.grid(True, linestyle="--", alpha=0.5)

    for j in range(13, len(axes)):
        axes[j].set_visible(False)

    fig.suptitle("EfficientNet-B0 — Score Distribution: Actual vs Predicted",
                 fontsize=14, fontweight="bold", y=1.01)
    plt.tight_layout()
    path = os.path.join(out_dir, "fig9_distribution_comparison.png")
    plt.savefig(path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"[Saved] Fig 9 — Distribution comparison → {path}")


# ═══════════════════════════════════════════════════════════════════════════
# FIGURE 10 — Overall Truth Matrix  (binned over all parameters combined)
# ═══════════════════════════════════════════════════════════════════════════
def plot_overall_truth_matrix(preds, targets, out_dir):
    t_flat = targets.ravel()
    p_flat = preds.ravel()
    t_bin  = _bin(t_flat)
    p_bin  = _bin(p_flat)

    cm = confusion_matrix(t_bin, p_bin, labels=[0, 1, 2])

    # Normalised version (recall-style: row-normalised)
    cm_norm = cm.astype(float) / cm.sum(axis=1, keepdims=True)

    fig, axes = plt.subplots(1, 2, figsize=(14, 6))

    for ax, data, fmt, title in zip(
        axes,
        [cm, cm_norm],
        ["d", ".2%"],
        ["Counts", "Row-Normalised (Recall per class)"],
    ):
        sns.heatmap(data, annot=True, fmt=fmt, cmap="Blues",
                    xticklabels=LABELS, yticklabels=LABELS,
                    ax=ax, linewidths=0.5, linecolor="white",
                    cbar_kws={"shrink": 0.8})
        ax.set_xlabel("Predicted Health Class", fontsize=11)
        ax.set_ylabel("Actual Health Class",    fontsize=11)
        ax.set_title(title, fontsize=11, fontweight="bold")
        ax.tick_params(axis="x", rotation=15, labelsize=9)
        ax.tick_params(axis="y", rotation=0,  labelsize=9)

    total = cm.sum()
    diag  = np.trace(cm)
    acc   = diag / total if total > 0 else 0.0
    fig.suptitle(
        f"EfficientNet-B0 — Overall Truth Matrix (all 13 params × {len(targets)} samples)\n"
        f"Bin Accuracy = {acc:.2%}  |  Total predictions = {total:,}",
        fontsize=12, fontweight="bold",
    )
    plt.tight_layout()
    path = os.path.join(out_dir, "fig10_overall_truth_matrix.png")
    plt.savefig(path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"[Saved] Fig 10 — Overall truth matrix → {path}")


# ═══════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════
def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    device = get_device()
    print(f"\n[Device] {device}\n")

    # ── Load model ──────────────────────────────────────────────────────────
    model = load_model(CHECKPOINT_PATH, device)

    # ── Run inference ───────────────────────────────────────────────────────
    preds, targets, avg_l1 = run_inference(model, device)
    n = len(targets)
    print(f"\n[OK] Inference complete — {n} test samples\n")

    # ── Metrics ─────────────────────────────────────────────────────────────
    results, mae_list, rmse_list, r2_list = compute_metrics(preds, targets)
    print_report(results, avg_l1)

    ov = results["__overall__"]
    overall_stats = {
        "n_samples": n,
        "mae":    ov["MAE"],
        "rmse":   ov["RMSE"],
        "r2":     ov["R2"],
        "avg_l1": avg_l1,
    }

    # ── Save CSVs ───────────────────────────────────────────────────────────
    save_metrics_csv(results, OUT_DIR)
    save_predictions_csv(preds, targets, OUT_DIR)

    # ── Figures ─────────────────────────────────────────────────────────────
    print("\n[Generating figures…]")
    plot_mae_bar(mae_list, rmse_list, OUT_DIR)
    plot_r2_bar(r2_list, OUT_DIR)
    plot_pred_vs_actual_grid(preds, targets, OUT_DIR)
    plot_residual_grid(preds, targets, OUT_DIR)
    plot_error_heatmap(preds, targets, OUT_DIR)
    plot_truth_matrices(preds, targets, OUT_DIR)
    hi_mae, hi_rmse, hi_r2 = plot_overall_health_index(preds, targets, OUT_DIR)
    plot_summary_dashboard(mae_list, rmse_list, r2_list, overall_stats, OUT_DIR)
    plot_distribution_comparison(preds, targets, OUT_DIR)
    plot_overall_truth_matrix(preds, targets, OUT_DIR)

    print(f"\n{'='*60}")
    print(f"  All outputs saved to:  {OUT_DIR}")
    print(f"{'='*60}")
    print("\nFile index:")
    for f in sorted(os.listdir(OUT_DIR)):
        size_kb = os.path.getsize(os.path.join(OUT_DIR, f)) / 1024
        print(f"  {f:<55}  {size_kb:>7.1f} KB")


if __name__ == "__main__":
    main()
