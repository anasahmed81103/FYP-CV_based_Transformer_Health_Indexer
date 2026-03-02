# ⚡ KE-Portal: Transformer Health Indexer

![Project Banner](https://img.shields.io/badge/AI-Powered-6366F1?style=for-the-badge) ![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white) ![Next JS](https://img.shields.io/badge/Next-black?style=for-the-badge&logo=next.js&logoColor=white) ![Flutter](https://img.shields.io/badge/Flutter-02569B?style=for-the-badge&logo=flutter&logoColor=white) ![PyTorch](https://img.shields.io/badge/PyTorch-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)

An advanced Computer Vision and Deep Learning system for real-time **Pole Mounted Transformer (PMT)** health analysis. Predict failures before they happen with state-of-the-art AI technology integrated beautifully into both a Web Portal and a Mobile Application.

---

## 🌟 Key Features

*   **Intelligence Pipeline:** 
    *   **PMT Classifier Verification:** Non-associated images are immediately filtered using a dedicated classifying neural network to optimize computational load.
    *   **Health Regression Engine:** Evaluates 13 critical structural parameters (e.g., Oil Leakages, Rust, Bushing Cracks) using an **EfficientNet-B0** model to output a concrete Health Defect Percentage.
*   **Grad-CAM Visualizations:** Automatically overlays predictive interactive heatmaps (Grad-CAM) marking exactly where structural defects exist on the original field photograph.
*   **Role-Based Access Control (RBAC):** Strict security tiers (Admin, User, Suspended).
*   **Cross-Platform Architecture:**
    *   **Web Portal**: Next.js & Drizzle ORM powered frontend.
    *   **Mobile App**: Flutter application encompassing GPS mapping, automated Reverse Geocoding (Nominatim), and built-in **Speech-to-Text microphone feedback**.
*   **In-Depth History & Auditing:** PostgreSQL data lakes logging image assets, generated heatmaps, specific geolocation footprinting, and manually collected technician notes.

---

## 🚀 Getting Started

### 1. Prerequisites
You must manually configure the raw dataset environment initially due to heavy file sizes. Create a folder named `data` in the root repository.

```text
Transformer_Health_Index/
├── data/
│   ├── raw/
│   │   ├── metadata.csv
│   │   └── images/
```

### 2. Backend Setup (PyTorch Intelligence Engine)
Create an isolated Python environment and install the ML requirements.

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

**Generate the Processed Datasets & Train Models:**
```bash
python core/data_cleaning.py
python backend/train.py
```

**Start the Deep Learning Server:**
_Note: Bind to `0.0.0.0` if you plan to access the API remotely via your Mobile App on the same LAN._
```bash
python -m uvicorn backend.api.main:app --reload --host 0.0.0.0
```

### 3. Frontend Setup (Next.js Web Portal)
The web portal acts as the routing orchestrator and provides the primary visual dashboard.

```bash
cd frontend
npm install
npm run dev
```
_Visit `http://localhost:3000` to interact with the Next.js Dashboard._

**Test Account:**
*   **Email:** `alicena@gmail.com`
*   **Password:** `123abcABC`

### 4. Mobile App Setup (Flutter)
The newly integrated mobile application allows field technicians to rapidly evaluate transformers with voice notes and automated geofencing.

```bash
cd mobile_app
flutter run -d web-server --web-hostname <YOUR_LAN_IP>
```
_Configure `<YOUR_LAN_IP>` (e.g. `192.168.100.15`) inside `mobile_app/.env` and `lib/services/api_service.dart` to securely bind requests through the Next.js reverse proxy gateway!_

---

## 📁 Project Architecture Map

```text
Transformer_Health_Index/
│
├── 📁 backend/                       # Model evaluations, Grad-CAM, and FastAPI
├── 📁 core/                          # Data cleaning, custom PyTorch datasets, and Augmentations
├── 📁 models/                        # PyTorch Architectures (Custom CNN, ResNet, EfficientNet, PMT Classifier)
│
├── 📁 frontend/                      # Web Portal
│   ├── 📁 src/app/                   # React Next.js UI Structure, Dashboards, Admin UI
│   └── 📁 db/                        # Drizzle ORM Schema arrays & PostgreSQL routing
│
├── 📁 mobile_app/                    # Flutter Field Application
│   ├── 📁 lib/screens/               # Stateful Mobile Views (Dashboards, Maps, About)
│   └── 📁 lib/services/              # Bridging Dart logic to the Next.js / FastAPI Gateway
│
├── 📁 outputs/                       # Non-tracked Model Artifacts (.pth models, Heatmaps, MAE/R2 Reports)
├── 📁 temp_uploads/                  # Live inference media buffer
└── 📁 data/                          # Unignored Raw Dataset mapping
```

---
_© 2025 KE Portal. Developed to modernize and secure field infrastructure matrices._
