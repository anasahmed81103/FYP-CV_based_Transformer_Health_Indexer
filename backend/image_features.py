# backend/image_features.py
"""
Image feature extraction for transformer images.
Extracts: color histogram, shape descriptors, and perceptual hash for later comparison.
"""

import cv2
import numpy as np
from PIL import Image
import hashlib


def extract_color_histogram(image: np.ndarray, bins: int = 64) -> list:
    """
    Extract color histogram from image in HSV color space.
    Returns a normalized histogram with bins per channel (H, S, V).
    Total features: bins * 3 = 192 floats (default bins=64)
    """
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    
    # Compute histogram for each channel
    hist_h = cv2.calcHist([hsv], [0], None, [bins], [0, 180])
    hist_s = cv2.calcHist([hsv], [1], None, [bins], [0, 256])
    hist_v = cv2.calcHist([hsv], [2], None, [bins], [0, 256])
    
    # Normalize and flatten
    hist_h = cv2.normalize(hist_h, hist_h).flatten()
    hist_s = cv2.normalize(hist_s, hist_s).flatten()
    hist_v = cv2.normalize(hist_v, hist_v).flatten()
    
    # Concatenate all channels
    color_features = np.concatenate([hist_h, hist_s, hist_v])
    
    return color_features.tolist()


def extract_shape_descriptors(image: np.ndarray) -> list:
    """
    Extract Hu Moments (7 values) + additional shape features.
    Returns ~10 float values representing shape characteristics.
    """
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Apply threshold to get binary image
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # Calculate moments
    moments = cv2.moments(binary)
    
    # Calculate Hu Moments (7 values, scale/rotation invariant)
    hu_moments = cv2.HuMoments(moments).flatten()
    
    # Log transform for better numerical stability
    hu_moments = -np.sign(hu_moments) * np.log10(np.abs(hu_moments) + 1e-10)
    
    # Additional shape features
    aspect_ratio = image.shape[1] / image.shape[0]  # width/height
    area_ratio = np.sum(binary > 0) / (binary.shape[0] * binary.shape[1])  # foreground ratio
    
    shape_features = np.concatenate([hu_moments, [aspect_ratio, area_ratio]])
    
    return shape_features.tolist()


def compute_image_hash(image: np.ndarray, hash_size: int = 16) -> str:
    """
    Compute perceptual hash (pHash) of the image.
    Returns a hex string that can be used to quickly identify similar images.
    """
    # Resize to small square
    resized = cv2.resize(image, (hash_size + 1, hash_size))
    
    # Convert to grayscale
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    
    # Compute difference hash (dHash)
    diff = gray[:, 1:] > gray[:, :-1]
    
    # Convert to hex string
    hash_value = sum([2**i for i, v in enumerate(diff.flatten()) if v])
    
    return format(hash_value, 'x').zfill(hash_size * hash_size // 4)


def extract_image_features(image_path: str) -> dict:
    """
    Extract all features from an image.
    
    Returns:
        {
            "color": [float, ...],      # ~192 floats (color histogram)
            "shape": [float, ...],      # ~9 floats (Hu moments + shape features)
            "imageHash": "hex_string"   # perceptual hash for quick comparison
        }
    """
    # Read image
    image = cv2.imread(image_path)
    
    if image is None:
        raise ValueError(f"Could not read image: {image_path}")
    
    # Resize to standard size for consistent feature extraction
    standard_size = (256, 256)
    image_resized = cv2.resize(image, standard_size)
    
    features = {
        "color": extract_color_histogram(image_resized),
        "shape": extract_shape_descriptors(image_resized),
        "imageHash": compute_image_hash(image_resized)
    }
    
    return features


def extract_features_batch(image_paths: list) -> list:
    """
    Extract features from multiple images.
    
    Returns:
        [
            {"color": [...], "shape": [...], "imageHash": "..."},
            ...
        ]
    """
    features_list = []
    
    for path in image_paths:
        try:
            features = extract_image_features(path)
            features_list.append(features)
        except Exception as e:
            print(f"⚠️ Failed to extract features from {path}: {e}")
            # Add placeholder for failed images
            features_list.append({
                "color": [],
                "shape": [],
                "imageHash": "",
                "error": str(e)
            })
    
    return features_list


if __name__ == "__main__":
    # Test with a sample image
    import sys
    if len(sys.argv) > 1:
        features = extract_image_features(sys.argv[1])
        print(f"Color features: {len(features['color'])} values")
        print(f"Shape features: {len(features['shape'])} values")
        print(f"Image hash: {features['imageHash']}")
