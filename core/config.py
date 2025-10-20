import os

# ========= Base (project root) =========
# This resolves to the repo root, not the /core folder
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ========= Data locations =========
# Keep big data outside the repo by setting DATA_ROOT env var, e.g.:
#   Windows (PowerShell):  $env:DATA_ROOT="D:\fyp\transformer_data"
#   macOS/Linux (bash):    export DATA_ROOT="/mnt/data/transformer_data"
DATA_ROOT = os.environ.get("DATA_ROOT", os.path.join(ROOT_DIR, "data"))

RAW_DIR = os.path.join(DATA_ROOT, "raw")
PROCESSED_DIR = os.path.join(DATA_ROOT, "processed")
IMAGES_DIR = os.path.join(RAW_DIR, "images")
META_FILE = os.path.join(RAW_DIR, "metadata.csv")

# ========= Outputs =========
# Similarly, you can move outputs/checkpoints elsewhere via OUTPUT_ROOT
OUTPUT_ROOT = os.environ.get("OUTPUT_ROOT", os.path.join(ROOT_DIR, "outputs"))
CHECKPOINT_DIR = os.path.join(OUTPUT_ROOT, "checkpoints")
LOG_DIR        = os.path.join(OUTPUT_ROOT, "logs")
METRICS_DIR    = os.path.join(OUTPUT_ROOT, "metrics")
GRADCAM_DIR    = os.path.join(OUTPUT_ROOT, "gradcam")

# Make sure required folders exist (only what we own)
for d in [PROCESSED_DIR, CHECKPOINT_DIR, LOG_DIR, METRICS_DIR, GRADCAM_DIR]:
    os.makedirs(d, exist_ok=True)

# ========= Model & Training =========
SEED = 42
TASK_TYPE = "regression"

IMAGE_SIZE = 224
BATCH_SIZE = 32
NUM_EPOCHS = 25
LEARNING_RATE = 0.0005
OPTIMIZER = "adam"           # "adam" | "adamw" | "sgd"
WEIGHT_DECAY = 0.0001
EARLY_STOPPING_PATIENCE = 10
SCHEDULER = "cosine"         # "cosine" | "step" | "plateau" | None
MIXED_PRECISION = True

MODEL_NAME = "custom_cnn"    # "custom_cnn" | "resnet18" | "resnet34" | "resnet50" | "efficientnet_b0" ...
PRETRAINED = True
FREEZE_BACKBONE = False
DROPOUT = 0.3

# Normalization
NORMALIZE_MEAN = [0.485, 0.456, 0.406]
NORMALIZE_STD  = [0.229, 0.224, 0.225]

# Augmentations
AUGMENT = {
    "horizontal_flip": True,
    "vertical_flip": False,
    "rotation_deg": 15,
    "brightness": 0.15,
    "contrast": 0.15,
    "jitter": True,
    "random_erasing": True,
}

# ========= Helpers / Integration =========
# Frontend URL for CORS (FastAPI)
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

# Convenient derived paths
CHECKPOINT_PATH = os.path.join(CHECKPOINT_DIR, f"{MODEL_NAME}_best.pth")
