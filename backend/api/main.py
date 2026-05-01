from dotenv import load_dotenv
import os
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# Download models from Supabase if not present locally
from backend.startup import download_models
download_models()

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os, shutil, uuid
from backend.evaluate import evaluate_transformer
from backend.image_features import extract_image_features
from backend.similarity import verify_transformer_images
from backend.supabase_adjustments import (
    fetch_learned_adjustments,
    store_adjustment_history,
    update_learned_adjustments,
)



app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# now no output folder needed for holding gradcam images 
# OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "outputs")
# app.mount("/outputs", StaticFiles(directory=OUTPUT_DIR), name="outputs")

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "temp_uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


class VerifyRequest(BaseModel):
    stored_features: List[Dict[str, Any]]


@app.post("/verify-transformer")
async def verify_transformer(
    files: list[UploadFile] = File(...),
    stored_features: str = Form(...),  # JSON string of stored features
):
    """
    Verify that uploaded images match the stored transformer features.
    
    Returns:
        {
            "verified": bool,
            "score": float,
            "status": "match" | "grey_zone" | "reject",
            "message": str,
            "requiresConfirmation": bool,
            "details": dict
        }
    """
    import json
    
    # Parse stored features from JSON string
    try:
        stored_features_list = json.loads(stored_features) if stored_features else []
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid stored_features JSON")
    
    # If no stored features, allow by default (first upload)
    if not stored_features_list:
        return {
            "verified": True,
            "score": 1.0,
            "status": "match",
            "message": "No previous images to compare. Proceeding with upload.",
            "requiresConfirmation": False,
            "details": {"reason": "no_stored_features"}
        }
    
    # Save uploaded files temporarily and extract features
    saved_paths = []
    try:
        for file in files:
            filename = f"verify_{uuid.uuid4().hex}_{file.filename}"
            path = os.path.join(UPLOAD_DIR, filename)
            with open(path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            saved_paths.append(path)
        
        # Extract features from new images
        new_features_list = []
        for path in saved_paths:
            try:
                features = extract_image_features(path)
                new_features_list.append(features)
            except Exception as e:
                print(f"⚠️ Failed to extract features from {path}: {e}")
        
        # If no valid features extracted, reject
        if not new_features_list:
            return {
                "verified": False,
                "score": 0.0,
                "status": "reject",
                "message": "Could not extract features from uploaded images.",
                "requiresConfirmation": False,
                "details": {"reason": "feature_extraction_failed"}
            }
        
        # Compare features
        result = verify_transformer_images(new_features_list, stored_features_list)
        
        return result
        
    finally:
        # Clean up temporary verification files
        for path in saved_paths:
            try:
                os.remove(path)
            except:
                pass


@app.post("/extract-hashes")
async def extract_hashes(
    files: list[UploadFile] = File(...),
):
    """
    Extract image hashes from uploaded files for duplicate checking.
    Fast operation - only computes perceptual hash, not full features.
    
    Returns:
        {
            "hashes": ["hash1", "hash2", ...],
            "count": int
        }
    """
    from backend.image_features import compute_image_hash
    import cv2
    
    hashes = []
    saved_paths = []
    
    try:
        for file in files:
            filename = f"hash_{uuid.uuid4().hex}_{file.filename}"
            path = os.path.join(UPLOAD_DIR, filename)
            with open(path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            saved_paths.append(path)
            
            # Extract hash only (fast)
            try:
                image = cv2.imread(path)
                if image is not None:
                    image_resized = cv2.resize(image, (256, 256))
                    hash_value = compute_image_hash(image_resized)
                    hashes.append(hash_value)
            except Exception as e:
                print(f"⚠️ Failed to compute hash for {file.filename}: {e}")
        
        return {
            "hashes": hashes,
            "count": len(hashes)
        }
        
    finally:
        # Clean up
        for path in saved_paths:
            try:
                os.remove(path)
            except:
                pass


@app.post("/predict")
async def predict(
    transformer_id: str = Form(...),
    location: str = Form(...),
    date: str = Form(...),
    time: str = Form(...),
    files: list[UploadFile] = File(...),
):
    import numpy as np
    from backend.adjustment_layer import apply_adjustments
    from backend.adaptation import adaptive_layer

    saved_paths = []

    # --- Save uploaded files ---
    for file in files:
        filename = f"{uuid.uuid4().hex}_{file.filename}"
        path = os.path.join(UPLOAD_DIR, filename)
        with open(path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        saved_paths.append(path)

    # --- Step 1: Model Prediction ---
    result = evaluate_transformer(saved_paths)

    # --- Step 2: Apply GLOBAL learned adjustments (Supabase) ---
    try:
        learned = fetch_learned_adjustments()
    except Exception as e:
        print(f"⚠️ Failed to load learned adjustments from Supabase: {e}")
        learned = {}

    if "paramsScores" in result:
        result["paramsScores"] = apply_adjustments(result["paramsScores"], learned)

    # --- Step 3: Apply ADAPTIVE (case-based) learning ---
    try:
        if "paramsScores" in result and len(saved_paths) > 0:
            param_keys = list(result["paramsScores"].keys())
            param_values = np.array(list(result["paramsScores"].values()), dtype=float)

            # Extract features from first image
            features = extract_image_features(saved_paths[0])

            adjusted_values = adaptive_layer.adjust(param_values, features)

            # Convert back to dictionary
            result["paramsScores"] = {
                key: float(val)
                for key, val in zip(param_keys, adjusted_values)
            }

    except Exception as e:
        print(f"⚠️ Adaptive layer failed: {e}")

    # Keep top metric consistent with adjusted parameter scores.
    if "paramsScores" in result and result["paramsScores"]:
        result["healthIndex"] = float(sum(float(v) for v in result["paramsScores"].values()))

    return result


@app.post("/submit-corrections")
async def submit_corrections(
    transformer_id: str = Form(...),
    original_scores: str = Form(...),
    corrected_scores: str = Form(...),
    files: list[UploadFile] = File(...)
):
    import json
    import numpy as np
    import uuid
    import shutil
    from backend.adaptation import adaptive_layer

    # --- Parse incoming data ---
    try:
        original = json.loads(original_scores)
        corrected = json.loads(corrected_scores)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON in scores")

    print("\n--- CORRECTIONS RECEIVED ---")
    print("Transformer ID:", transformer_id)
    print("Original Scores:", original)
    print("Corrected Scores:", corrected)

    # --- Compute adjustments ---
    adjustments = []
    for o, c in zip(original, corrected):
        diff = c["score"] - o["score"]

        adjustments.append({
            "parameter": o["name"],
            "original": o["score"],
            "corrected": c["score"],
            "difference": diff
        })

    print("Adjustments:", adjustments)

    # ==============================
    # ✅ LEVEL 2: STORE HISTORY (Supabase)
    # ==============================
    try:
        store_adjustment_history(transformer_id, adjustments)
        print("✅ Adjustments saved successfully to Supabase")
    except Exception as e:
        print("❌ Failed to save adjustments to Supabase:", e)

    # ==============================
    # ✅ LEVEL 3: GLOBAL LEARNING (Supabase)
    # ==============================
    try:
        update_learned_adjustments(adjustments, learning_rate=0.1)
        print("✅ Learned adjustments updated in Supabase")
    except Exception as e:
        print("❌ Failed to update learned adjustments in Supabase:", e)

    # ==============================
    # 🔥 LEVEL 3: ADAPTIVE LEARNING
    # ==============================

    try:
        predicted_array = np.array([o["score"] for o in original], dtype=float)
        corrected_array = np.array([c["score"] for c in corrected], dtype=float)

        features = None

        # Extract features from first image
        if files:
            temp_path = os.path.join(os.path.dirname(__file__), f"temp_{uuid.uuid4().hex}.jpg")

            with open(temp_path, "wb") as buffer:
                shutil.copyfileobj(files[0].file, buffer)

            try:
                features = extract_image_features(temp_path)
            finally:
                os.remove(temp_path)

        # Store in adaptive memory
        if features is not None:
            adaptive_layer.update(predicted_array, corrected_array, features)
            print("✅ Adaptive memory updated")

    except Exception as e:
        print(f"⚠️ Adaptive update failed: {e}")

    # ==============================

    return {
        "status": "success",
        "message": "Corrections received successfully",
        "adjustments": adjustments
    }

