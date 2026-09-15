"""
inference.py  --  KE-Portal: Transformer Health Indexer
=======================================================
Standalone inference script. Accepts an image file, a folder of images,
or a live webcam stream. Outputs:
  - Per-parameter defect scores (0-6 scale)
  - Overall Health Index (0-78; lower = healthier)
  - Health grade:  Good (0-26) / Fair (27-52) / Poor (53-78)
  - Grad-CAM heatmap saved alongside the input image

Usage:
  # Single image
  python inference.py --source demo/sample_transformer_1.jpg

  # All images in a folder
  python inference.py --source demo/

  # Live webcam (press 'q' to quit, 's' to save frame)
  python inference.py --webcam

Options:
  --source PATH    Path to image or folder of images
  --webcam         Use live webcam input
  --cam-id INT     Webcam device index (default: 0)
  --no-gradcam     Skip Grad-CAM generation (faster)
  --save           Save annotated output to outputs/inference/
  --show           Display result in GUI window

Requirements: pip install -r requirements.txt
"""

import os, sys, argparse, time
ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)

import torch
import numpy as np
from PIL import Image
import cv2
import torchvision.transforms as T

from core import config as cfg
from core.utils import get_device
from models.efficientnet import build_efficientnet
from models.pmt_classifier import build_pmt_classifier

PARAM_LABELS = [
    "Oil Leakage", "Corrosion", "Rust", "Paint Fading",
    "Bushing Cracks", "Broken Connectors", "Insulator Contam.",
    "Burnt / Overheat", "Deformed Tank", "Loose Wiring",
    "Dust Accumulation", "Gasket Leakage", "Damaged Pole",
]


# ── Model loading ─────────────────────────────────────────────────────────────
def _load_health_model(device):
    ckpt = os.path.join(cfg.CHECKPOINT_DIR, f"{cfg.MODEL_NAME}_best.pth")
    if not os.path.exists(ckpt):
        raise FileNotFoundError(
            f"Health model checkpoint not found:\n  {ckpt}\n"
            "Train first: python backend/train.py"
        )
    model = build_efficientnet(model_name=cfg.MODEL_NAME)
    state = torch.load(ckpt, map_location=device)
    model.load_state_dict(state["model_state"])
    return model.to(device).eval()


def _load_pmt_model(device):
    ckpt = os.path.join(cfg.CHECKPOINT_DIR, "pmt_classifier_best.pth")
    if not os.path.exists(ckpt):
        print("  [WARN] PMT classifier not found -- all images will be analysed.")
        return None
    model = build_pmt_classifier()
    state = torch.load(ckpt, map_location=device)
    model.load_state_dict(state.get("model_state", state))
    return model.to(device).eval()


def _build_transform():
    return T.Compose([
        T.Resize((cfg.IMAGE_SIZE, cfg.IMAGE_SIZE)),
        T.ToTensor(),
        T.Normalize(mean=cfg.NORMALIZE_MEAN, std=cfg.NORMALIZE_STD),
    ])


# ── Grad-CAM (local, no Supabase) ────────────────────────────────────────────
class _GradCAM:
    def __init__(self, model, target_layer):
        self.model = model
        self.gradients = self.activations = None
        target_layer.register_forward_hook(lambda m,i,o: setattr(self,'activations',o.detach()))
        target_layer.register_full_backward_hook(lambda m,gi,go: setattr(self,'gradients',go[0].detach()))

    def generate(self, x, param_index):
        self.model.train()
        x = x.requires_grad_(True)
        out = self.model(x)
        self.model.zero_grad()
        out[0, param_index].backward()
        w = self.gradients.mean(dim=(2,3), keepdim=True)
        cam = torch.relu((w * self.activations).sum(dim=1, keepdim=True))
        cam = (cam - cam.min()) / (cam.max() + 1e-8)
        self.model.eval()
        return cam


def _overlay_cam(pil_img, cam_tensor):
    img_np = np.array(pil_img)
    cam_np = cv2.resize(cam_tensor.squeeze().cpu().numpy(), (img_np.shape[1], img_np.shape[0]))
    heatmap = cv2.applyColorMap((cam_np * 255).astype(np.uint8), cv2.COLORMAP_JET)
    return (0.45 * heatmap + 0.55 * img_np).astype(np.uint8)


# ── Grade ─────────────────────────────────────────────────────────────────────
def _grade(total):
    if total <= 26:   return "GOOD", (0, 200, 80)
    elif total <= 52: return "FAIR", (255, 165, 0)
    else:             return "POOR", (220, 50, 50)


# ── Result card ───────────────────────────────────────────────────────────────
def _draw_card(orig_pil, scores, total, label, color_bgr, gcam_bgr=None):
    H, pad = 480, 12
    def _resize(img, h):
        return img.resize((int(img.width * h / img.height), h), Image.LANCZOS)

    orig_np = cv2.cvtColor(np.array(_resize(orig_pil, H)), cv2.COLOR_RGB2BGR)
    parts = [orig_np]

    if gcam_bgr is not None:
        parts.append(cv2.resize(gcam_bgr, (orig_np.shape[1], H)))

    card_w = 300
    card = np.zeros((H, card_w, 3), dtype=np.uint8)
    card[:] = (18, 18, 30)
    r, g, b = color_bgr
    cv2.rectangle(card, (0, 0), (card_w-1, 60), (b, g, r), -1)
    cv2.putText(card, f"Health: {label}",     (8, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255,255,255), 2, cv2.LINE_AA)
    cv2.putText(card, f"Index : {total:.1f} / 78", (8, 46), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (220,220,220), 1, cv2.LINE_AA)

    bar_y = 72
    for pname, score in zip(PARAM_LABELS, scores):
        bh = 22
        fill_w = int((card_w - 90) * score / 6.0)
        bar_col = (50,200,100) if score <= 2 else (50,150,255) if score <= 4 else (50,50,220)
        cv2.rectangle(card, (80, bar_y+4), (80+fill_w, bar_y+bh-4), bar_col, -1)
        cv2.putText(card, f"{pname[:14]}", (2, bar_y+16), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (180,180,200), 1)
        cv2.putText(card, f"{score:.1f}", (card_w-35, bar_y+16), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (220,220,220), 1)
        bar_y += bh + 2

    parts.append(card)
    return np.hstack(parts)


# ── Single image inference ────────────────────────────────────────────────────
def run_inference(image_path, health_model, pmt_model, transform, device,
                  save_dir=None, show=False, do_gradcam=True):
    try:
        pil_img = Image.open(image_path).convert("RGB")
    except Exception as e:
        print(f"  [ERROR] Cannot open {image_path}: {e}")
        return None

    img_t = transform(pil_img).unsqueeze(0).to(device)

    # PMT check
    is_pmt = True
    if pmt_model:
        with torch.no_grad():
            is_pmt = (torch.argmax(pmt_model(img_t), dim=1).item() == 1)
    if not is_pmt:
        print(f"  [SKIP] {os.path.basename(image_path)} -- Non-PMT.")
        return {"status": "non_pmt", "image": image_path}

    # Health regression
    with torch.no_grad():
        preds = health_model(img_t).squeeze(0).cpu().numpy()
    scores = np.clip(preds, 0.0, 6.0)
    total  = float(scores.sum())
    label, color = _grade(total)

    result = {
        "status": "ok", "image": image_path,
        "health_index": total, "grade": label,
        "scores": {PARAM_LABELS[i]: float(scores[i]) for i in range(len(PARAM_LABELS))},
    }

    # Grad-CAM
    gcam_bgr = None
    if do_gradcam:
        try:
            gc = _GradCAM(health_model, health_model.cnn.features[-1])
            cam = gc.generate(transform(pil_img).unsqueeze(0).to(device), int(np.argmax(scores)))
            gcam_bgr = _overlay_cam(pil_img, cam)
            result["gradcam"] = gcam_bgr
        except Exception as e:
            print(f"  [WARN] Grad-CAM failed: {e}")

    card = _draw_card(pil_img, scores, total, label, color, gcam_bgr)

    if show:
        cv2.imshow("Transformer Health Analysis", card)
        cv2.waitKey(0)

    if save_dir:
        os.makedirs(save_dir, exist_ok=True)
        base = os.path.splitext(os.path.basename(image_path))[0]
        out_path = os.path.join(save_dir, f"{base}_result.jpg")
        cv2.imwrite(out_path, card)
        result["saved_to"] = out_path
        print(f"  [SAVE] {out_path}")
        if gcam_bgr is not None:
            cv2.imwrite(os.path.join(save_dir, f"{base}_gradcam.jpg"), gcam_bgr)

    return result


# ── Webcam ────────────────────────────────────────────────────────────────────
def run_webcam(health_model, pmt_model, transform, device, cam_id=0, save_dir=None, do_gradcam=True):
    cap = cv2.VideoCapture(cam_id)
    if not cap.isOpened():
        print(f"[ERROR] Cannot open camera {cam_id}.")
        return

    print(f"\n[WEBCAM] Camera {cam_id} open. Press 'q' quit, 's' save frame.")
    frame_count, last_card = 0, None

    while True:
        ret, frame = cap.read()
        if not ret: break
        frame_count += 1

        if frame_count % 30 == 0:
            tmp = os.path.join(ROOT, "_tmp_webcam.jpg")
            cv2.imwrite(tmp, frame)
            pil_f = Image.open(tmp).convert("RGB")
            img_t = transform(pil_f).unsqueeze(0).to(device)

            is_pmt = True
            if pmt_model:
                with torch.no_grad():
                    is_pmt = (torch.argmax(pmt_model(img_t), dim=1).item() == 1)

            if is_pmt:
                with torch.no_grad():
                    preds = health_model(img_t).squeeze(0).cpu().numpy()
                scores = np.clip(preds, 0.0, 6.0)
                total  = float(scores.sum())
                label, color = _grade(total)
                gcam_bgr = None
                if do_gradcam:
                    try:
                        gc = _GradCAM(health_model, health_model.cnn.features[-1])
                        cam = gc.generate(transform(pil_f).unsqueeze(0).to(device), int(np.argmax(scores)))
                        gcam_bgr = cv2.resize(_overlay_cam(pil_f, cam), (frame.shape[1], frame.shape[0]))
                    except: pass
                last_card = _draw_card(pil_f, scores, total, label, color, gcam_bgr)

            if os.path.exists(tmp): os.remove(tmp)

        display = frame.copy()
        if last_card is not None:
            scale = frame.shape[0] / last_card.shape[0]
            card_show = cv2.resize(last_card, (int(last_card.shape[1]*scale), frame.shape[0]))
            display = np.hstack([frame, card_show])

        cv2.putText(display, "KE-Portal | Transformer Health AI", (10, 28),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (100,255,180), 2)
        cv2.imshow("KE-Portal Live", display)

        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'): break
        if key == ord('s') and last_card is not None:
            s_dir = save_dir or os.path.join(ROOT, "outputs", "inference")
            os.makedirs(s_dir, exist_ok=True)
            out = os.path.join(s_dir, f"webcam_{int(time.time())}.jpg")
            cv2.imwrite(out, last_card)
            print(f"  [SAVED] {out}")

    cap.release()
    cv2.destroyAllWindows()


# ── CLI ───────────────────────────────────────────────────────────────────────
def main():
    p = argparse.ArgumentParser(description="KE-Portal Transformer Health Indexer -- Standalone Inference")
    p.add_argument("--source",     type=str, default=None)
    p.add_argument("--webcam",     action="store_true")
    p.add_argument("--cam-id",     type=int, default=0)
    p.add_argument("--no-gradcam", action="store_true")
    p.add_argument("--save",       action="store_true")
    p.add_argument("--show",       action="store_true")
    args = p.parse_args()

    if not args.source and not args.webcam:
        demo_dir = os.path.join(ROOT, "demo")
        if os.path.isdir(demo_dir):
            args.source = demo_dir
            print(f"[INFO] Defaulting to: {demo_dir}")
        else:
            print("[ERROR] Specify --source or --webcam."); sys.exit(1)

    device = get_device()
    print(f"\n[INFO] Device: {device}")
    print("[INFO] Loading models ...")
    health_model = _load_health_model(device)
    pmt_model    = _load_pmt_model(device)
    transform    = _build_transform()
    print("[INFO] Ready.\n")

    save_dir = os.path.join(ROOT, "outputs", "inference") if args.save else None

    if args.webcam:
        run_webcam(health_model, pmt_model, transform, device,
                   cam_id=args.cam_id, save_dir=save_dir, do_gradcam=not args.no_gradcam)
        return

    exts = {".jpg",".jpeg",".png",".bmp",".webp"}
    if os.path.isfile(args.source):
        image_paths = [args.source]
    elif os.path.isdir(args.source):
        image_paths = sorted([os.path.join(args.source, f) for f in os.listdir(args.source)
                              if os.path.splitext(f)[1].lower() in exts])
    else:
        print(f"[ERROR] '{args.source}' not found."); sys.exit(1)

    if not image_paths:
        print("[ERROR] No supported images found."); sys.exit(1)

    print(f"[INFO] Found {len(image_paths)} image(s).\n")
    results = []

    for img_path in image_paths:
        print(f"  Analysing: {os.path.basename(img_path)}")
        r = run_inference(img_path, health_model, pmt_model, transform, device,
                          save_dir=save_dir, show=args.show, do_gradcam=not args.no_gradcam)
        if r and r.get("status") == "ok":
            print(f"          Health Index : {r['health_index']:.1f} / 78  ({r['grade']})")
            worst = max(r["scores"], key=r["scores"].get)
            print(f"          Worst defect : {worst}  = {r['scores'][worst]:.2f} / 6\n")
            results.append(r)

    print(f"\n{'='*50}")
    print(f"  Processed : {len(image_paths)}  |  Analysed : {len(results)}")
    if results:
        print(f"  Avg Health Index : {np.mean([r['health_index'] for r in results]):.1f} / 78")
    print(f"{'='*50}\n")
    if save_dir: print(f"[INFO] Results saved to: {save_dir}")
    if args.show: cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
