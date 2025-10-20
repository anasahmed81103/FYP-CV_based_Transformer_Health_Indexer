import os, sys
# Add project root to sys.path (works on any OS)
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.append(ROOT_DIR)

import torchvision.transforms as T
from core import config as cfg


def build_transforms(
    image_size: int = cfg.IMAGE_SIZE,
    mean: list = cfg.NORMALIZE_MEAN,
    std: list = cfg.NORMALIZE_STD,
    augment_cfg: dict = cfg.AUGMENT,
):
    """
    Build torchvision transform pipelines for training, validation, and testing.

    Args:
        image_size (int): Target resize dimension.
        mean (list): Normalization mean.
        std (list): Normalization std.
        augment_cfg (dict): Augmentation configuration from cfg.AUGMENT.

    Returns:
        tuple: (train_transform, val_transform, test_transform)
    """
    train_transforms = [T.Resize((image_size, image_size))]

    # Apply data augmentation
    if augment_cfg.get("jitter", False):
        train_transforms.append(
            T.ColorJitter(
                brightness=augment_cfg.get("brightness", 0.0),
                contrast=augment_cfg.get("contrast", 0.0),
            )
        )

    if augment_cfg.get("horizontal_flip", False):
        train_transforms.append(T.RandomHorizontalFlip(p=0.5))

    if augment_cfg.get("vertical_flip", False):
        train_transforms.append(T.RandomVerticalFlip(p=0.5))

    if augment_cfg.get("rotation_deg", 0) > 0:
        train_transforms.append(T.RandomRotation(degrees=augment_cfg["rotation_deg"]))

    # Always convert to tensor and normalize
    train_transforms.extend([
        T.ToTensor(),
        T.Normalize(mean=mean, std=std),
    ])

    # Optional random erasing
    if augment_cfg.get("random_erasing", False):
        train_transforms.append(
            T.RandomErasing(p=0.25, scale=(0.02, 0.2), ratio=(0.3, 3.3))
        )

    # Validation/test transforms (no augmentation)
    val_test_transforms = T.Compose([
        T.Resize((image_size, image_size)),
        T.ToTensor(),
        T.Normalize(mean=mean, std=std),
    ])

    return T.Compose(train_transforms), val_test_transforms, val_test_transforms
