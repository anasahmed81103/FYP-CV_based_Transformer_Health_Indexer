import os
import sys
import argparse

# ========= Base (project root) =========
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))



# ========= User-selectable model type =========
parser = argparse.ArgumentParser(description="Select target model")
parser.add_argument(
    "--model",
    choices=["regression", "classifier"],
    default="regression",
    help="Target model: 'regression' (Health Index) or 'classifier' (PMT vs Non-PMT)"
)
args, unknown = parser.parse_known_args()
TARGET_MODEL = args.model
print(f"ℹ Using TARGET_MODEL = {TARGET_MODEL}")



# ========= Data locations =========
DATA_ROOT = os.environ.get("DATA_ROOT", os.path.join(ROOT_DIR, "data"))

RAW_DIR = os.path.join(DATA_ROOT, "raw")
PROCESSED_DIR = os.path.join(DATA_ROOT, "processed")
IMAGES_DIR = os.path.join(RAW_DIR, "images")
META_FILE = os.path.join(RAW_DIR, "annotations.xlsx")   # or metadata.csv


# Train/Val/Test CSVs (default for regression)

TRAIN_CSV = os.path.join(PROCESSED_DIR, "train.csv")
VAL_CSV   = os.path.join(PROCESSED_DIR, "val.csv")
TEST_CSV  = os.path.join(PROCESSED_DIR, "test.csv")



# -------- Classifier specific paths (folder-based) --------


CLASSIFIER_RAW_DIR = os.path.join(RAW_DIR, "classifier_data")
CLASSIFIER_PROCESSED_DIR = os.path.join(PROCESSED_DIR, "classifier_data")
CLASSIFIER_TRAIN_DIR = os.path.join(CLASSIFIER_PROCESSED_DIR, "train")
CLASSIFIER_VAL_DIR   = os.path.join(CLASSIFIER_PROCESSED_DIR, "val")
CLASSIFIER_TEST_DIR  = os.path.join(CLASSIFIER_PROCESSED_DIR, "test")



# ========= Outputs =========
OUTPUT_ROOT = os.environ.get("OUTPUT_ROOT", os.path.join(ROOT_DIR, "outputs"))
CHECKPOINT_DIR = os.path.join(OUTPUT_ROOT, "checkpoints")
LOG_DIR        = os.path.join(OUTPUT_ROOT, "logs")
METRICS_DIR    = os.path.join(OUTPUT_ROOT, "metrics")
GRADCAM_DIR    = os.path.join(OUTPUT_ROOT, "gradcam")


dirs_to_create = [PROCESSED_DIR, CHECKPOINT_DIR, LOG_DIR, METRICS_DIR, GRADCAM_DIR]

if TARGET_MODEL == "classifier":                                                  # only create classifier folders when classifier model used 
    dirs_to_create += [CLASSIFIER_PROCESSED_DIR, CLASSIFIER_TRAIN_DIR, CLASSIFIER_VAL_DIR, CLASSIFIER_TEST_DIR]


for d in dirs_to_create:
    os.makedirs(d, exist_ok=True)


# ========= Model & Training =========
SEED = 42

# Default task type based on TARGET_MODEL
TASK_TYPE = "regression" if TARGET_MODEL == "regression" else "classification"



BATCH_SIZE = 32
NUM_EPOCHS = 25
LEARNING_RATE = 0.0005
OPTIMIZER = "adam"
WEIGHT_DECAY = 0.0001
EARLY_STOPPING_PATIENCE = 10
SCHEDULER = "cosine"
MIXED_PRECISION = False   # CPU ONLY → must be False

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



# ----------------------------------- Classifier-specific overrides (optimized) ------------------------------

if TARGET_MODEL == "regression":
    
    MODEL_NAME = "efficientnet_b0"   # Change to "efficientnet_b0" for final model
    PRETRAINED = True
    IMAGE_SIZE = 224


elif TARGET_MODEL == "classifier":
    
    
    MODEL_NAME = "efficientnet_b0_classifier_model"
    PRETRAINED = True
    IMAGE_SIZE = 224

    NUM_CLASSES = 2
  
  
    BATCH_SIZE = 16              # smaller batch for CPU/GPU-friendly training
  
    NUM_EPOCHS = 40              # slightly higher for classifier
  
    LEARNING_RATE = 0.0001       # tuned for classification
  
    DROPOUT = 0.4                # slightly higher for better generalization
  
    AUGMENT = {                  # no augmentations
        "horizontal_flip": False,
        "vertical_flip": False,
        "rotation_deg": 0,
        "brightness": 0.0,
        "contrast": 0.0,
        "jitter": False,
        "random_erasing": False,
    }




# ========= Helpers / Integration =========
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

CHECKPOINT_PATH = os.path.join(CHECKPOINT_DIR, f"{MODEL_NAME}_best.pth")

