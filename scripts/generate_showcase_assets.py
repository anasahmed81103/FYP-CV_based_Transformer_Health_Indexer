"""
generate_showcase_assets.py
============================
Generates visual showcase assets for the README / GitHub page.
Run once from the project root:
  python scripts/generate_showcase_assets.py
"""
import os, sys, shutil
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

import numpy as np
from PIL import Image, ImageDraw, ImageFont
import cv2
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches

ASSETS_DIR       = os.path.join(ROOT, "docs", "assets")
TEST_RESULTS_DIR = os.path.join(ROOT, "outputs", "test_results")
GRADCAM_DIR      = os.path.join(ROOT, "outputs", "gradcam")
TEMP_UPLOADS_DIR = os.path.join(ROOT, "temp_uploads")
INFERENCE_DIR    = os.path.join(ROOT, "outputs", "inference")
os.makedirs(ASSETS_DIR, exist_ok=True)

# ── 1. Copy test-result figures ───────────────────────────────────────────────
mapping = {
    "fig1_mae_rmse_bar.png":          "fig1_mae_rmse.png",
    "fig2_r2_bar.png":                "fig2_r2.png",
    "fig3_pred_vs_actual_grid.png":   "fig3_pred_vs_actual.png",
    "fig4_residual_distributions.png":"fig4_residuals.png",
    "fig5_error_heatmap.png":         "fig5_heatmap.png",
    "fig6_truth_matrices.png":        "fig6_truth_matrices.png",
    "fig7_overall_health_index.png":  "fig7_health_index.png",
    "fig8_summary_dashboard.png":     "fig8_dashboard.png",
    "fig9_distribution_comparison.png":"fig9_distributions.png",
    "fig10_overall_truth_matrix.png": "fig10_truth_matrix.png",
}
for src_name, dst_name in mapping.items():
    src = os.path.join(TEST_RESULTS_DIR, src_name)
    dst = os.path.join(ASSETS_DIR, dst_name)
    if os.path.exists(src):
        shutil.copy2(src, dst)
        print(f"  Copied {src_name}")
    else:
        print(f"  MISSING {src_name}")

# ── 2. Banner strip: original | grad-cam ────────────────────────────────────
orig_cands = sorted([f for f in os.listdir(TEMP_UPLOADS_DIR) if f.lower().endswith((".jpg",".jpeg",".png"))])
gcam_cands = sorted([f for f in os.listdir(GRADCAM_DIR) if f.lower().endswith((".jpg",".jpeg",".png"))])

if orig_cands and gcam_cands:
    orig_img = Image.open(os.path.join(TEMP_UPLOADS_DIR, orig_cands[0])).convert("RGB")
    gcam_img = Image.open(os.path.join(GRADCAM_DIR, gcam_cands[0])).convert("RGB")

    H = 480
    def resize_h(img, h):
        w = int(img.width * h / img.height)
        return img.resize((w, h), Image.LANCZOS)

    orig_img = resize_h(orig_img, H)
    gcam_img = resize_h(gcam_img, H)

    LABEL_H, GAP = 48, 8
    total_w = orig_img.width + gcam_img.width + GAP * 3
    total_h = H + LABEL_H + GAP * 2

    banner = Image.new("RGB", (total_w, total_h), (18, 18, 30))
    draw = ImageDraw.Draw(banner)
    try:
        font = ImageFont.truetype("arial.ttf", 20)
    except Exception:
        font = ImageFont.load_default()

    draw.text((GAP + 8,        GAP + 4), "Field Photograph",        fill=(200, 220, 255), font=font)
    draw.text((GAP*2 + orig_img.width + 8, GAP + 4), "Grad-CAM Attention Map", fill=(255, 180, 80), font=font)
    banner.paste(orig_img, (GAP, LABEL_H + GAP))
    banner.paste(gcam_img, (GAP*2 + orig_img.width, LABEL_H + GAP))
    draw.line([(GAP*2 + orig_img.width - 2, LABEL_H), (GAP*2 + orig_img.width - 2, total_h)], fill=(80,80,100), width=2)

    banner.save(os.path.join(ASSETS_DIR, "banner_strip.png"), optimize=True)
    print("  Created banner_strip.png")

# ── 3. Copy inference demo card ───────────────────────────────────────────────
inference_demo = os.path.join(INFERENCE_DIR, "sample_transformer_1_result.jpg")
if os.path.exists(inference_demo):
    shutil.copy2(inference_demo, os.path.join(ASSETS_DIR, "inference_demo.jpg"))
    print("  Copied inference_demo.jpg")

# ── 4. Architecture diagram ──────────────────────────────────────────────────
fig, ax = plt.subplots(1, 1, figsize=(14, 5))
ax.set_xlim(0, 14); ax.set_ylim(0, 5); ax.axis("off")
fig.patch.set_facecolor("#0d1117")

boxes = [
    (0.5,  1.5, 1.8, 2.0, "#1f6feb", "Input\nImage",                    "white"),
    (2.8,  1.5, 1.8, 2.0, "#3d8b37", "PMT\nClassifier\n(EfficientNet-B0)", "white"),
    (5.1,  1.5, 1.8, 2.0, "#9c3636", "Health\nRegressor\n(EfficientNet-B0)", "white"),
    (7.4,  1.5, 1.8, 2.0, "#7d4fa0", "Grad-CAM\nHeatmap\nGenerator",    "white"),
    (9.7,  1.5, 1.8, 2.0, "#b07d1e", "Adaptive\nLearning\nLayer",       "white"),
    (12.0, 1.5, 1.8, 2.0, "#1f6feb", "Health\nIndex\nOutput",           "white"),
]
for x, y, w, h, color, label, tc in boxes:
    rect = mpatches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.1",
                                   facecolor=color, edgecolor="white", linewidth=1.5, alpha=0.9)
    ax.add_patch(rect)
    ax.text(x+w/2, y+h/2, label, ha="center", va="center", fontsize=8.5, color=tc, fontweight="bold", multialignment="center")

for x1, x2 in [(2.3,2.8),(4.6,5.1),(6.9,7.4),(9.2,9.7),(11.5,12.0)]:
    ax.annotate("", xy=(x2, 2.5), xytext=(x1, 2.5), arrowprops=dict(arrowstyle="->", color="white", lw=1.8))

ax.text(3.7, 0.6, "Non-PMT -> Rejected", ha="center", color="#ff6b6b", fontsize=8, style="italic")
ax.annotate("", xy=(3.7,1.5), xytext=(3.7,0.95), arrowprops=dict(arrowstyle="->", color="#ff6b6b", lw=1.2))
ax.set_title("KE-Portal  Transformer Health Indexer - Inference Pipeline", color="white", fontsize=13, pad=12, fontweight="bold")

plt.tight_layout()
plt.savefig(os.path.join(ASSETS_DIR, "architecture.png"), dpi=140, facecolor=fig.get_facecolor(), bbox_inches="tight")
plt.close()
print("  Created architecture.png")
print("\nAll assets ready in docs/assets/")
