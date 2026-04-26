
"""
runs when the container boots on Render. 
Since your .pth files are gitignored and not in the repo, the container starts with an empty checkpoints/ folder.
 This script downloads all three models from Supabase models bucket before FastAPI starts accepting requests.

"""

import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

MODELS = [
    "custom_cnn_best.pth",
    "efficientnet_b0_best.pth",
    "pmt_classifier_best.pth",
]

def download_models():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")

    if not url or not key:
        print("❌ SUPABASE_URL or SUPABASE_SERVICE_KEY not set — skipping model download")
        return

    supabase = create_client(url, key)
    os.makedirs("outputs/checkpoints", exist_ok=True)

    for filename in MODELS:
        local_path = os.path.join("outputs/checkpoints", filename)

        if os.path.exists(local_path):
            print(f"✅ Already exists, skipping: {filename}")
            continue

        try:
            print(f"⬇️  Downloading {filename} from Supabase...")
            data = supabase.storage.from_("models").download(filename)
            with open(local_path, "wb") as f:
                f.write(data)
            print(f"✅ Downloaded: {filename}")
        except Exception as e:
            print(f"❌ Failed to download {filename}: {e}")

if __name__ == "__main__":
    download_models()