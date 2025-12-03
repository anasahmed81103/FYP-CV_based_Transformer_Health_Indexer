import os

# ========= Base (project root) =========
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ========= Data locations =========
DATA_ROOT = os.environ.get("DATA_ROOT", os.path.join(ROOT_DIR, "data"))

RAW_DIR = os.path.join(DATA_ROOT, "raw")
PROCESSED_DIR = os.path.join(DATA_ROOT, "processed")
IMAGES_DIR = os.path.join(RAW_DIR, "images")
META_FILE = os.path.join(RAW_DIR, "annotations.xlsx")   # or metadata.csv

# Train/Val/Test CSVs
TRAIN_CSV = os.path.join(PROCESSED_DIR, "train.csv")
VAL_CSV   = os.path.join(PROCESSED_DIR, "val.csv")
TEST_CSV  = os.path.join(PROCESSED_DIR, "test.csv")

# ========= Outputs =========
OUTPUT_ROOT = os.environ.get("OUTPUT_ROOT", os.path.join(ROOT_DIR, "outputs"))
CHECKPOINT_DIR = os.path.join(OUTPUT_ROOT, "checkpoints")
LOG_DIR        = os.path.join(OUTPUT_ROOT, "logs")
METRICS_DIR    = os.path.join(OUTPUT_ROOT, "metrics")
GRADCAM_DIR    = os.path.join(OUTPUT_ROOT, "gradcam")

for d in [PROCESSED_DIR, CHECKPOINT_DIR, LOG_DIR, METRICS_DIR, GRADCAM_DIR]:
    os.makedirs(d, exist_ok=True)

# ========= Model & Training =========
SEED = 42
TASK_TYPE = "regression"

IMAGE_SIZE = 224
BATCH_SIZE = 32
NUM_EPOCHS = 25
LEARNING_RATE = 0.0005
OPTIMIZER = "adam"
WEIGHT_DECAY = 0.0001
EARLY_STOPPING_PATIENCE = 10
SCHEDULER = "cosine"
MIXED_PRECISION = False   # CPU ONLY → must be False

MODEL_NAME = "efficientnet_b0"   # Change to "efficientnet_b0" for final model
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
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

CHECKPOINT_PATH = os.path.join(CHECKPOINT_DIR, f"{MODEL_NAME}_best.pth")
