# backend/similarity.py
"""
Similarity computation for transformer image verification.
Uses histogram correlation for color and cosine similarity for shape.
Includes perceptual hash comparison for additional accuracy.
"""

import numpy as np
from typing import List, Dict, Tuple

# Thresholds for transformer verification
SAME_TRANSFORMER_THRESHOLD = 0.80  # Score >= 0.80 → Match ✅
NEW_ANGLE_ZONE_MIN = 0.60          # Score 0.60-0.79 → Grey zone, ask user ⚠️
DIFFERENT_TRANSFORMER = 0.60       # Score < 0.60 → Hard reject ❌

# Feature weights for combined similarity score
COLOR_WEIGHT = 0.75  # 75% weight for color histogram (most discriminative)
SHAPE_WEIGHT = 0.10  # 10% weight for shape descriptors
HASH_WEIGHT = 0.15   # 15% weight for perceptual hash


def histogram_correlation(hist1: List[float], hist2: List[float]) -> float:
    """
    Compute histogram correlation (Pearson correlation coefficient).
    Returns value between -1 and 1 (1 = identical distribution).
    More accurate than cosine similarity for comparing color distributions.
    """
    if not hist1 or not hist2:
        return 0.0
    
    a = np.array(hist1, dtype=np.float64)
    b = np.array(hist2, dtype=np.float64)
    
    # Handle length mismatch
    if len(a) != len(b):
        min_len = min(len(a), len(b))
        a = a[:min_len]
        b = b[:min_len]
    
    # Compute means
    mean_a = np.mean(a)
    mean_b = np.mean(b)
    
    # Compute correlation
    numerator = np.sum((a - mean_a) * (b - mean_b))
    denominator = np.sqrt(np.sum((a - mean_a)**2) * np.sum((b - mean_b)**2))
    
    if denominator == 0:
        return 0.0
    
    return float(numerator / denominator)


def histogram_bhattacharyya(hist1: List[float], hist2: List[float]) -> float:
    """
    Compute Bhattacharyya coefficient for histogram comparison.
    Returns value between 0 and 1 (1 = identical).
    Very sensitive to distribution differences.
    """
    if not hist1 or not hist2:
        return 0.0
    
    a = np.array(hist1, dtype=np.float64)
    b = np.array(hist2, dtype=np.float64)
    
    # Handle length mismatch
    if len(a) != len(b):
        min_len = min(len(a), len(b))
        a = a[:min_len]
        b = b[:min_len]
    
    # Normalize histograms
    sum_a = np.sum(a)
    sum_b = np.sum(b)
    
    if sum_a == 0 or sum_b == 0:
        return 0.0
    
    a = a / sum_a
    b = b / sum_b
    
    # Bhattacharyya coefficient
    bc = np.sum(np.sqrt(a * b))
    
    return float(bc)


def hamming_distance_normalized(hash1: str, hash2: str) -> float:
    """
    Compute normalized Hamming distance between two hex hash strings.
    Returns similarity score between 0 and 1 (1 = identical).
    """
    if not hash1 or not hash2:
        return 0.5  # Unknown, neutral score
    
    # Convert hex to binary
    try:
        bin1 = bin(int(hash1, 16))[2:].zfill(len(hash1) * 4)
        bin2 = bin(int(hash2, 16))[2:].zfill(len(hash2) * 4)
    except ValueError:
        return 0.5
    
    # Pad to same length
    max_len = max(len(bin1), len(bin2))
    bin1 = bin1.zfill(max_len)
    bin2 = bin2.zfill(max_len)
    
    # Count differing bits
    diff_bits = sum(c1 != c2 for c1, c2 in zip(bin1, bin2))
    
    # Return similarity (1 - normalized distance)
    return 1.0 - (diff_bits / max_len)


def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """
    Compute cosine similarity between two vectors.
    Returns value between -1 and 1 (1 = identical).
    """
    if not vec1 or not vec2:
        return 0.0
    
    a = np.array(vec1)
    b = np.array(vec2)
    
    # Handle length mismatch
    if len(a) != len(b):
        min_len = min(len(a), len(b))
        a = a[:min_len]
        b = b[:min_len]
    
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    
    if norm_a == 0 or norm_b == 0:
        return 0.0
    
    return float(np.dot(a, b) / (norm_a * norm_b))


def compare_single_features(new_features: Dict, stored_features: Dict) -> Tuple[float, Dict]:
    """
    Compare features of two images and return weighted similarity score.
    
    Args:
        new_features: {"color": [...], "shape": [...], "imageHash": "..."}
        stored_features: {"color": [...], "shape": [...], "imageHash": "..."}
    
    Returns:
        Tuple of (weighted_score, component_scores)
    """
    # Get feature arrays
    new_color = new_features.get("color", [])
    stored_color = stored_features.get("color", [])
    new_shape = new_features.get("shape", [])
    stored_shape = stored_features.get("shape", [])
    new_hash = new_features.get("imageHash", "")
    stored_hash = stored_features.get("imageHash", "")
    
    # Compute color similarity using both correlation and Bhattacharyya
    color_corr = histogram_correlation(new_color, stored_color)
    color_bhatt = histogram_bhattacharyya(new_color, stored_color)
    
    # Combine color metrics (correlation can be negative, Bhattacharyya is 0-1)
    # Use Bhattacharyya as primary (more strict), correlation as secondary
    color_sim = 0.6 * color_bhatt + 0.4 * max(0, color_corr)
    
    # Compute shape similarity
    shape_sim = cosine_similarity(new_shape, stored_shape)
    # Shape cosine should be high for similar objects, normalize to 0-1
    shape_sim = max(0, shape_sim)  # Clip negatives
    
    # Compute hash similarity
    hash_sim = hamming_distance_normalized(new_hash, stored_hash)
    
    # Compute weighted score
    weighted_score = (
        COLOR_WEIGHT * color_sim + 
        SHAPE_WEIGHT * shape_sim + 
        HASH_WEIGHT * hash_sim
    )
    
    component_scores = {
        'color_correlation': round(color_corr, 4),
        'color_bhattacharyya': round(color_bhatt, 4),
        'color_combined': round(color_sim, 4),
        'shape': round(shape_sim, 4),
        'hash': round(hash_sim, 4),
        'weighted_total': round(weighted_score, 4)
    }
    
    return weighted_score, component_scores


def compare_transformer_features(
    new_features_list: List[Dict], 
    stored_features_list: List[Dict]
) -> Tuple[float, str, Dict]:
    """
    Compare new images against all stored images for a transformer.
    Uses best match score to determine verification status.
    
    Args:
        new_features_list: List of feature dicts from new uploaded images
        stored_features_list: List of feature dicts from stored images
    
    Returns:
        Tuple of (best_score, status, details)
        - best_score: Highest similarity score found (0.0 to 1.0)
        - status: 'match' | 'grey_zone' | 'reject'
        - details: Dict with additional info
    """
    if not new_features_list or not stored_features_list:
        # No features to compare - allow by default
        return (1.0, 'match', {'reason': 'no_stored_features'})
    
    # Filter out invalid features (empty or with errors)
    valid_new = [f for f in new_features_list if f.get('color') and f.get('shape')]
    valid_stored = [f for f in stored_features_list if f.get('color') and f.get('shape')]
    
    if not valid_new:
        return (1.0, 'match', {'reason': 'no_valid_new_features'})
    
    if not valid_stored:
        return (1.0, 'match', {'reason': 'no_valid_stored_features'})
    
    # Compare each new image against all stored images
    all_scores = []
    all_components = []
    best_matches = []
    
    for i, new_feat in enumerate(valid_new):
        scores_for_this_image = []
        
        for j, stored_feat in enumerate(valid_stored):
            score, components = compare_single_features(new_feat, stored_feat)
            scores_for_this_image.append((score, j, components))
        
        # Best match for this new image
        best_score, best_stored_idx, best_components = max(scores_for_this_image, key=lambda x: x[0])
        all_scores.append(best_score)
        all_components.append(best_components)
        best_matches.append({
            'new_image_idx': i,
            'best_stored_idx': best_stored_idx,
            'score': round(best_score, 4),
            'components': best_components
        })
    
    # Use average of best scores as final score
    avg_score = sum(all_scores) / len(all_scores)
    min_score = min(all_scores)
    max_score = max(all_scores)
    
    # Determine status based on minimum score (all images should match)
    if min_score >= SAME_TRANSFORMER_THRESHOLD:
        status = 'match'
    elif min_score >= NEW_ANGLE_ZONE_MIN:
        status = 'grey_zone'
    else:
        status = 'reject'
    
    details = {
        'avg_score': round(avg_score, 4),
        'min_score': round(min_score, 4),
        'max_score': round(max_score, 4),
        'individual_scores': [round(s, 4) for s in all_scores],
        'best_matches': best_matches,
        'thresholds': {
            'match': SAME_TRANSFORMER_THRESHOLD,
            'grey_zone': NEW_ANGLE_ZONE_MIN
        }
    }
    
    return (round(min_score, 4), status, details)


def verify_transformer_images(
    new_features_list: List[Dict],
    stored_features_list: List[Dict]
) -> Dict:
    """
    Main verification function. Returns a structured result.
    
    Returns:
        {
            "verified": bool,           # True if match or user can proceed
            "score": float,             # Similarity score (0-1)
            "status": str,              # 'match' | 'grey_zone' | 'reject'
            "message": str,             # Human-readable message
            "requiresConfirmation": bool,  # True if user needs to confirm
            "details": dict             # Additional info
        }
    """
    score, status, details = compare_transformer_features(
        new_features_list, 
        stored_features_list
    )
    
    if status == 'match':
        return {
            "verified": True,
            "score": score,
            "status": "match",
            "message": "Images match the selected transformer.",
            "requiresConfirmation": False,
            "details": details
        }
    elif status == 'grey_zone':
        return {
            "verified": False,
            "score": score,
            "status": "grey_zone",
            "message": f"Images may be from a different angle (similarity: {score:.0%}). Please confirm this is the same transformer.",
            "requiresConfirmation": True,
            "details": details
        }
    else:  # reject
        return {
            "verified": False,
            "score": score,
            "status": "reject",
            "message": f"Images don't match the selected transformer (similarity: {score:.0%}). Please select the correct transformer or add as new.",
            "requiresConfirmation": False,
            "details": details
        }


if __name__ == "__main__":
    # Test with sample features
    print("Testing similarity module...")
    
    # Identical features - should match
    sample1 = [{"color": [0.1] * 192, "shape": [0.5] * 9, "imageHash": "abc123"}]
    result1 = verify_transformer_images(sample1, sample1)
    print(f"Identical: {result1['score']:.2%} - {result1['status']}")
    
    # Different color - should reject
    sample2 = [{"color": [0.9] * 192, "shape": [0.5] * 9, "imageHash": "xyz789"}]
    result2 = verify_transformer_images(sample2, sample1)
    print(f"Different: {result2['score']:.2%} - {result2['status']}")
