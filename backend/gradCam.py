import os
import sys
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.append(ROOT_DIR)

import torch
import torchvision.transforms as T
from PIL import Image
import numpy as np
import cv2
import pandas as pd

from core import config as cfg
from core.utils import get_device
from models.efficientnet import build_efficientnet


# ============================================================
# Grad-CAM
# ============================================================

class GradCAM:
    """Grad-CAM for EfficientNet13 (multi-output regression)"""
    def __init__(self, model, target_layer):
        self.model = model
        self.model.eval()
        self.target_layer = target_layer
        self.gradients = None
        self.activations = None

        # Hooks
        target_layer.register_forward_hook(self._save_activation)
        target_layer.register_full_backward_hook(self._save_gradient)

    def _save_activation(self, module, inp, out):
        self.activations = out.detach()

    def _save_gradient(self, module, grad_in, grad_out):
        self.gradients = grad_out[0].detach()

    def generate(self):
        weights = self.gradients.mean(dim=(2, 3), keepdim=True)
        cam = (weights * self.activations).sum(dim=1, keepdim=True)
        cam = torch.relu(cam)

        cam -= cam.min()
        cam /= (cam.max() + 1e-8)
        return cam


# ============================================================
# Helpers
# ============================================================

def get_target_layer(model):
    """
    Return the last conv layer in EfficientNet13's backbone.
    """
    if hasattr(model, "cnn") and hasattr(model.cnn, "features"):
        # Last conv in features
        return model.cnn.features[-1]  
    raise ValueError("Cannot find conv layer for Grad-CAM in this model.")


def overlay_cam(image, cam):
    img_np = np.array(image)
    cam = cam.squeeze().cpu().numpy()
    cam = cv2.resize(cam, (img_np.shape[1], img_np.shape[0]))
    heatmap = cv2.applyColorMap((cam*255).astype(np.uint8), cv2.COLORMAP_JET)
    overlay = (0.45*heatmap + 0.55*img_np).astype(np.uint8)
    return overlay


# ============================================================
# Generate Grad-CAM
# ============================================================

def generate_gradcam_for_image(model, image_path, save_path, param_index=0, input_tensor=None):
    device = get_device()
    model.to(device).eval() 

    original = Image.open(image_path).convert("RGB")
    
    # Use the passed input tensor if available
    if input_tensor is not None:
        x = input_tensor
    else:
        # Revert to old path if called directly (not recommended)
        transform = T.Compose([
            T.Resize((cfg.IMAGE_SIZE, cfg.IMAGE_SIZE)),
            T.ToTensor(),
            T.Normalize(cfg.NORMALIZE_MEAN, cfg.NORMALIZE_STD),
        ])
        x = transform(original).unsqueeze(0).to(device)

    target_layer = get_target_layer(model)
    gradcam = GradCAM(model, target_layer)

    # Forward pass
    output = model(x)  # shape = (1,13)
    score = output[0, param_index]

    # Backward pass
    model.zero_grad()
    score.backward()

    cam = gradcam.generate()
    overlay = overlay_cam(original, cam)

    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    cv2.imwrite(save_path, cv2.cvtColor(overlay, cv2.COLOR_RGB2BGR))
    return save_path


# ============================================================
# Main Test
# ============================================================

def main():
    device = get_device()

    model = build_efficientnet(model_name=cfg.MODEL_NAME)
    ckpt_path = os.path.join(cfg.CHECKPOINT_DIR, f"{cfg.MODEL_NAME}_best.pth")
    state = torch.load(ckpt_path, map_location=device)
    model.load_state_dict(state["model_state"])
    model.to(device).eval()
    print(f"✅ Loaded model from: {ckpt_path}")

    df = pd.read_csv(os.path.join(cfg.PROCESSED_DIR, "test.csv"))
    img_path = df.iloc[0]["image_path"]

    save_path = os.path.join(cfg.GRADCAM_DIR, f"{cfg.MODEL_NAME}_gradcam_example.jpg")
    out_file = generate_gradcam_for_image(model, img_path, save_path, param_index=4)  # Example: Bushing cracks
    print(f"🔥 Grad-CAM saved to: {out_file}")


if __name__ == "__main__":
    main()
