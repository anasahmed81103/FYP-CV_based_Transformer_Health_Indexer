from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os, shutil, uuid
from backend.evaluate import evaluate_transformer

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

    # Evaluate transformer (should return dict with predictions + gradcam paths)
    result = evaluate_transformer(saved_paths)

    return result
