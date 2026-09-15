# Deployment Guide — KE-Portal: Transformer Health Indexer

---

## Option A — Local Development (Recommended for Testing)

### Step 1: Python Backend (FastAPI)

```bash
python -m venv venv
# Windows:  venv\Scripts\activate
# Linux/Mac: source venv/bin/activate

pip install -r requirements.txt

cp .env.example backend/.env
# Edit backend/.env: fill SUPABASE_URL + SUPABASE_SERVICE_KEY
# (leave blank to run in local-only mode)

python -m uvicorn backend.api.main:app --reload --host 0.0.0.0 --port 8000
```

API docs: `http://localhost:8000/docs`

### Step 2: Next.js Frontend

```bash
cd frontend
npm install
# Edit frontend/.env.local: NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Open: `http://localhost:3000`  
Demo login: `alicena@gmail.com` / `123abcABC`

### Step 3: Flutter Mobile App (Optional)

```bash
cd mobile_app
# Edit mobile_app/.env: API_BASE_URL=http://<YOUR_LAN_IP>:3000
flutter pub get
flutter run -d web-server --web-hostname 0.0.0.0 --web-port 8080
```

---

## Option B — Docker

```bash
docker build -t ke-portal-api .
docker run -p 8000:8000 \
  -e SUPABASE_URL=your_url \
  -e SUPABASE_SERVICE_KEY=your_key \
  ke-portal-api
```

---

## Option C — Hugging Face Spaces (Free Cloud Demo)

The project front-matter is pre-configured for HF Spaces Docker SDK.

```bash
git remote add space https://huggingface.co/spaces/<username>/<space-name>
git push space main
```

Add secrets in Space Settings:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

Your demo will be live at `https://<username>-<space-name>.hf.space`

---

## Option D — Railway / Render

**Railway:**
```bash
railway login && railway init && railway up
```

**Render:**
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn backend.api.main:app --host 0.0.0.0 --port $PORT`

---

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `SUPABASE_URL` | Supabase project URL | Cloud features |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | Cloud features |
| `NEXT_PUBLIC_API_URL` | FastAPI URL for Next.js | Frontend |
| `DATABASE_URL` | PostgreSQL connection string | Frontend DB |
| `NEXTAUTH_SECRET` | NextAuth.js secret | Auth |
| `NEXTAUTH_URL` | Deployment URL | Auth |

---

## Model Checkpoints

| File | Size | Description |
|---|---|---|
| `outputs/checkpoints/efficientnet_b0_best.pth` | ~46 MB | Health regression model |
| `outputs/checkpoints/pmt_classifier_best.pth` | ~46 MB | PMT vs Non-PMT classifier |
| `outputs/checkpoints/custom_cnn_best.pth` | ~14 MB | Lightweight CNN baseline |

Checkpoints are git-ignored by default. Options:
- **Git LFS:** `git lfs track "*.pth"` then commit
- **HF Hub:** Upload and modify `backend/startup.py` to auto-download
- **Releases:** Attach as GitHub Release assets

---

## Standalone Inference (No Full Stack Needed)

```bash
python inference.py --source demo/
python inference.py --source your_image.jpg --save
python inference.py --webcam
```

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `FileNotFoundError: Checkpoint not found` | Place `.pth` files in `outputs/checkpoints/` or train first |
| CORS error in browser | Ensure backend CORS allows frontend URL |
| `401 Unauthorized` on frontend | Set `NEXTAUTH_SECRET` and `NEXTAUTH_URL` |
| Flutter can't reach API | Check `API_BASE_URL` in `mobile_app/.env` |
| Grad-CAM `AttributeError` | Ensure `MODEL_NAME=efficientnet_b0` in `core/config.py` |
