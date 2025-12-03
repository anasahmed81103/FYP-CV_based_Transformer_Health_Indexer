import os
import cv2
import numpy as np
import pandas as pd
from tqdm import tqdm
import random

# ----------------------------
# CONFIG
# ----------------------------
SOURCE_IMAGES = r"D:/anas/uni/semester 7/fyp/dataset_fyp1_init/images"  # original images
SOURCE_EXCEL = r"D:/anas/uni/semester 7/fyp/dataset_fyp1_init/annotation.xlsx"     # original annotation file

DEST_IMAGES = r"D:/anas/uni/semester 7/fyp/aug_images"            # output images
DEST_EXCEL = r"D:/anas/uni/semester 7/fyp/aug_annotations.xlsx"   # output excel

AUG_PER_IMAGE = 20  # number of augmented copies per image
START_ID = 1        # starting ID for augmented images

os.makedirs(DEST_IMAGES, exist_ok=True)

# ----------------------------
# Load original annotation sheet
# ----------------------------
df = pd.read_excel(SOURCE_EXCEL)

# Function to safely get annotation row(s) by ID (handles duplicates)
def get_annotation_by_id(id_val):
    row = df[df["ID"] == id_val]
    if row.empty:
        return None
    return row.iloc[0]  # take the first matching row

# ----------------------------
# Augmentation Ops
# ----------------------------
def rotate_small(img):
    h, w = img.shape[:2]
    angle = random.choice([-12, -8, -5, 5, 8, 12])
    M = cv2.getRotationMatrix2D((w//2, h//2), angle, 1)
    return cv2.warpAffine(img, M, (w, h))

def shift(img):
    h, w = img.shape[:2]
    max_shift = int(0.06 * min(h, w))
    tx = random.randint(-max_shift, max_shift)
    ty = random.randint(-max_shift, max_shift)
    M = np.float32([[1, 0, tx], [0, 1, ty]])
    return cv2.warpAffine(img, M, (w, h))

def brightness_contrast(img):
    alpha = random.uniform(0.9, 1.1)
    beta = random.randint(-15, 15)
    return cv2.convertScaleAbs(img, alpha=alpha, beta=beta)

def add_noise(img):
    noise = np.random.normal(0, 10, img.shape).astype(np.int16)
    img = img.astype(np.int16)
    return np.clip(img + noise, 0, 255).astype(np.uint8)

def blur(img):
    return cv2.GaussianBlur(img, (3, 3), 0)

def flip_safe(img):
    return cv2.flip(img, 1)

def zoom(img):
    h, w = img.shape[:2]
    scale = random.uniform(0.92, 1.08)
    resized = cv2.resize(img, None, fx=scale, fy=scale)
    if scale > 1:
        # crop center
        new_h, new_w = resized.shape[:2]
        y0 = (new_h - h) // 2
        x0 = (new_w - w) // 2
        return resized[y0:y0+h, x0:x0+w]
    else:
        # pad
        top = (h - resized.shape[0]) // 2
        bottom = h - resized.shape[0] - top
        left = (w - resized.shape[1]) // 2
        right = w - resized.shape[1] - left
        return cv2.copyMakeBorder(resized, top, bottom, left, right, cv2.BORDER_REFLECT)

AUG_OPS = [rotate_small, shift, brightness_contrast, add_noise, blur, flip_safe, zoom]

# ----------------------------
# Augmentation loop
# ----------------------------
new_rows = []
current_id = START_ID

image_files = [f for f in os.listdir(SOURCE_IMAGES) if f.lower().endswith(('.jpg', '.png', '.jpeg'))]

for filename in tqdm(image_files, desc="Augmenting images"):
    orig_path = os.path.join(SOURCE_IMAGES, filename)
    img = cv2.imread(orig_path)
    if img is None:
        continue

    base = os.path.splitext(filename)[0]

    try:
        orig_id = int(base)
    except:
        print("Filename not numeric:", base)
        continue

    original_ann = get_annotation_by_id(orig_id)
    if original_ann is None:
        print("Annotation missing for:", orig_id)
        continue

    # Save original image
    out_orig_path = os.path.join(DEST_IMAGES, f"{current_id}.jpg")
    cv2.imwrite(out_orig_path, img)
    new_row = original_ann.copy()
    new_row["ID"] = current_id
    new_rows.append(new_row)
    current_id += 1

    # Create augmentations
    for i in range(AUG_PER_IMAGE):
        op = random.choice(AUG_OPS)
        aug_img = op(img)
        out_name = f"{current_id}.jpg"
        out_path = os.path.join(DEST_IMAGES, out_name)
        cv2.imwrite(out_path, aug_img)

        new_row = original_ann.copy()
        new_row["ID"] = current_id
        new_rows.append(new_row)
        current_id += 1

# ----------------------------
# Save new annotation Excel
# ----------------------------
final_df = pd.DataFrame(new_rows)
final_df.to_excel(DEST_EXCEL, index=False)

print("\nDONE!")
print(f"Generated {len(new_rows)} augmented images + annotation rows.")
print("Saved images →", DEST_IMAGES)
print("Saved Excel →", DEST_EXCEL)
