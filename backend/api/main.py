from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os, shutil, uuid
from backend.evaluate import evaluate_transformer
from backend.image_features import extract_image_features
from backend.similarity import verify_transformer_images

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "outputs")
app.mount("/outputs", StaticFiles(directory=OUTPUT_DIR), name="outputs")

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
    saved_paths = []
    for file in files:
        filename = f"{uuid.uuid4().hex}_{file.filename}"
        path = os.path.join(UPLOAD_DIR, filename)
        with open(path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        saved_paths.append(path)

    # Evaluate transformer (returns predictions, gradcam, and PMT-only image features)
    result = evaluate_transformer(saved_paths)

    return result
