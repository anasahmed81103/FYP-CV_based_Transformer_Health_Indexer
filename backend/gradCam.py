import os, sys
# Add project root to sys.path (works on any OS)
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.append(ROOT_DIR)

import torch
import torchvision.transforms as T
from PIL import Image
import numpy as np
import cv2
import pandas as pd
from tqdm import tqdm

from core import config as cfg
from core.utils import get_device
from models.custom_cnn import CustomCNN
from models.resnet import build_resnet
from models.efficientnet import build_efficientnet


# ============================================================
# Grad-CAM Core
# ============================================================

class GradCAM:
    """Simple Grad-CAM implementation for CNN/ResNet/EfficientNet models."""

    def __init__(self, model, target_layer):
        self.model = model
        self.model.eval()
        self.target_layer = target_layer
        self.gradients = None
        self.activations = None

        # Register hooks
        target_layer.register_forward_hook(self._save_activation)
        target_layer.register_backward_hook(self._save_gradient)

    def _save_activation(self, module, input, output):
        self.activations = output.detach()

    def _save_gradient(self, module, grad_input, grad_output):
        self.gradients = grad_output[0].detach()

    def generate(self):
        """Generate the Grad-CAM heatmap."""
        grads = self.gradients
        acts = self.activations
        weights = grads.mean(dim=(2, 3), keepdim=True)
        cam = (weights * acts).sum(dim=1, keepdim=True)
        cam = torch.relu(cam)

        # Normalize [0, 1]
        cam -= cam.min()
        cam /= (cam.max() + 1e-8)
        return cam


# ============================================================
# Helper Functions
# ============================================================

def get_target_layer(model):
    """Identify the final convolutional layer for Grad-CAM."""
    if isinstance(model, CustomCNN):
        return model.features[-1].block[0]  # last Conv2d in CustomCNN
    if hasattr(model, "layer4"):
        return list(model.layer4.children())[-1].conv2  # ResNet
    if hasattr(model, "features"):
        return model.features[-1][0]  # EfficientNet
    raise ValueError("❌ Could not find target layer for GradCAM")


def overlay_cam_on_image(image, cam_tensor):
    """Overlay the Grad-CAM heatmap on the original image."""
    img_np = np.array(image)
    cam = cam_tensor.squeeze().cpu().numpy()
    cam = cv2.resize(cam, (img_np.shape[1], img_np.shape[0]))
    heatmap = cv2.applyColorMap((cam * 255).astype(np.uint8), cv2.COLORMAP_JET)
    overlay = (0.4 * heatmap + 0.6 * img_np).astype(np.uint8)
    return overlay


# ============================================================
# Main Execution
# ============================================================

def main():
    device = get_device()

    # --- Load model ---
    name = cfg.MODEL_NAME
    pretrained = cfg.PRETRAINED
    dropout = cfg.DROPOUT

    if name == "custom_cnn":
        model = CustomCNN(dropout=dropout)
    elif "resnet" in name:
        model = build_resnet(model_name=name, pretrained=pretrained, dropout=dropout)
    else:
        model = build_efficientnet(model_name=name, pretrained=pretrained, dropout=dropout)

    ckpt_path = os.path.join(cfg.CHECKPOINT_DIR, f"{name}_best.pth")
    if not os.path.exists(ckpt_path):
        raise FileNotFoundError(f"❌ Checkpoint not found: {ckpt_path}")

    state = torch.load(ckpt_path, map_location=device)
    model.load_state_dict(state["model_state"])
    model.to(device).eval()
    print(f"✅ Loaded model from: {ckpt_path}")

    # --- Load one test image ---
    test_csv = os.path.join(cfg.PROCESSED_DIR, "test.csv")
    if not os.path.exists(test_csv):
        raise FileNotFoundError(f"❌ Test CSV not found: {test_csv}")

    df = pd.read_csv(test_csv)
    img_path = df.iloc[0]["image_path"]
    if not os.path.exists(img_path):
        raise FileNotFoundError(f"❌ Image not found: {img_path}")

    original = Image.open(img_path).convert("RGB")

    # --- Transform for model input ---
    transform = T.Compose([
        T.Resize((cfg.IMAGE_SIZE, cfg.IMAGE_SIZE)),
        T.ToTensor(),
        T.Normalize(mean=cfg.NORMALIZE_MEAN, std=cfg.NORMALIZE_STD),
    ])
    x = transform(original).unsqueeze(0).to(device)

    # --- Grad-CAM ---
    target_layer = get_target_layer(model)
    gradcam = GradCAM(model, target_layer)

    # Forward + backward
    output = model(x)
    score = output.squeeze()
    model.zero_grad()
    score.backward()

    cam = gradcam.generate()
    overlay = overlay_cam_on_image(original, cam)

    # --- Save visualization ---
    os.makedirs(cfg.GRADCAM_DIR, exist_ok=True)
    out_file = os.path.join(cfg.GRADCAM_DIR, f"{name}_gradcam.jpg")
    cv2.imwrite(out_file, cv2.cvtColor(overlay, cv2.COLOR_RGB2BGR))
    print(f"🔥 Saved Grad-CAM visualization to: {out_file}")


# ============================================================
# Entry Point
# ============================================================

def generate_gradcam_for_image(model, image_path, save_path):
    """
    Generates a Grad-CAM visualization for a given image using the existing GradCAM class.
    """
    device = get_device()

    # --- Load and preprocess image ---
    original = Image.open(image_path).convert("RGB")
    transform = T.Compose([
        T.Resize((cfg.IMAGE_SIZE, cfg.IMAGE_SIZE)),
        T.ToTensor(),
        T.Normalize(mean=cfg.NORMALIZE_MEAN, std=cfg.NORMALIZE_STD),
    ])
    x = transform(original).unsqueeze(0).to(device)

    # --- Grad-CAM setup ---
    target_layer = get_target_layer(model)
    gradcam = GradCAM(model, target_layer)

    # --- Forward & backward ---
    output = model(x)
    score = output.squeeze()
    model.zero_grad()
    score.backward()

    cam = gradcam.generate()
    overlay = overlay_cam_on_image(original, cam)

    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    cv2.imwrite(save_path, cv2.cvtColor(overlay, cv2.COLOR_RGB2BGR))

    return save_path



if __name__ == "__main__":
    main()
