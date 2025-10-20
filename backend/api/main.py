from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles   # 👈 add this import
import os, shutil
from backend.evaluate import evaluate_transformer

app = FastAPI()

# ✅ Allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Serve Grad-CAM and other output files
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "outputs")
app.mount("/outputs", StaticFiles(directory=OUTPUT_DIR), name="outputs")

UPLOAD_DIR = "temp_uploads"
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
        path = os.path.join(UPLOAD_DIR, file.filename)
        with open(path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        saved_paths.append(path)

    result = evaluate_transformer(saved_paths)
    return result
