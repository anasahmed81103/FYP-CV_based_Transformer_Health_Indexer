This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

=============================================================
for configuration, do the following:
-------------------------------------------
in front end:
npm i

in root also:
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

=============================================

keep in mind that the data folder has been ignored due to its possibly huge sizes in the future. therefore everyone has to create it manually on their system.
the folder is named "data", and its directly inside the root folder. it has a "raw" and "processed" inside it. the raw folder has an "images" folder and a metadata.csv.
the contents of the processes folder will be generated on program execution.

sequence for model execution:
-data_cleaning.py
-train.py
-evaluate.py
-gradcam.py

-backend and its other modules like core and models have been setup so that they can run from root
-to run front end, first cd frontend, and then npm run dev


test account: alicena@gmail.com
              123abcABC

==============================================
execute the whole:

start backend:
python -m uvicorn backend.api.main:app --reload   

start front end:
cd frontend
npm run dev

==============================================

for ease of understanding, here is the project herirarchy:

Transformer_Health_Index/
│
├── .gitignore                        # Ignore rules (venv, node_modules, data, etc.)
├── README.md                         # Project overview and setup instructions
├── requirements.txt                  # Python dependencies
│
├── 📁 venv/                          # Python virtual environment (ignored in git)
│
├── 📁 data/                          # Raw & processed datasets (ignored in git)
│   ├── 📁 raw/
│   │   ├── metadata.csv
│   │   └── 📁 images/
│   │       ├── image1.jpg
│   │       └── ...
│   └── 📁 processed/
│       ├── train.csv
│       ├── val.csv
│       └── test.csv
│
├── 📁 core/                          # Core machine learning utilities
│   ├── __init__.py
│   ├── augment.py                    # Data augmentation logic
│   ├── config.py                     # Global config constants & paths
│   ├── data_cleaning.py              # Cleaning / preprocessing
│   ├── dataset.py                    # Custom PyTorch dataset definitions
│   ├── hyperparameter_tuning.py      # Optimization / tuning scripts
│   └── utils.py                      # Shared helper functions
│
├── 📁 models/                        # Model architectures
│   ├── __init__.py
│   ├── custom_cnn.py
│   ├── efficientnet.py
│   └── resnet.py
│
├── 📁 backend/                       # Model training, evaluation, and API
│   ├── __init__.py
│   ├── train.py                      # Training pipeline
│   ├── evaluate.py                   # Evaluation + model predictions
│   ├── gradCam.py                    # Grad-CAM generation for visualization
│   └── 📁 api/
│       ├── main.py                   # FastAPI app (serves /predict endpoint)
│       └── __init__.py
│
├── 📁 outputs/                       # All generated model artifacts (ignored)
│   ├── 📁 checkpoints/               # Saved model weights (.pth)
│   │   └── custom_cnn_best.pth
│   ├── 📁 gradcam/                   # Grad-CAM visualizations
│   │   ├── gradcam_0.jpg
│   │   └── gradcam_1.jpg
│   ├── 📁 logs/                      # Training logs
│   └── 📁 metrics/                   # CSV reports (MAE, R², etc.)
│       └── custom_cnn_best_metrics.csv
│
├── 📁 frontend/                      # Next.js + Supabase web portal
│   ├── .env.local                    # Frontend environment variables
│   ├── 📁 db/                        # Drizzle ORM setup
│   │   ├── index.ts
│   │   └── schema.ts
│   ├── 📁 drizzle/                   # SQL migrations
│   │   ├── 0000_migration_stuff.sql
│   │   └── 📁 meta/
│   │       ├── journal.json
│   │       └── 0000_snapshot.json
│   ├── 📁 public/                    # Static assets (SVGs, icons)
│   ├── 📁 scripts/                   # Drizzle or utility scripts
│   │   └── migrate.ts
│   ├── 📁 src/app/                   # Main Next.js app
│   │   ├── 📁 api/                   # Next.js API routes → talk to FastAPI
│   │   ├── 📁 login/                 # Login page
│   │   ├── 📁 user_dashboard/        # Dashboard → model integration
│   │   ├── 📁 user_history/          # History of past predictions
│   │   ├── CSS_GUIDE.md
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── page.module.css
│   │   └── shared.module.css
│   ├── .next/                        # Build output (ignored)
│   ├── node_modules/                 # JS dependencies (ignored)
│   ├── package.json
│   ├── tsconfig.json
│   └── next.config.ts                # Frontend configuration (domains, etc.)
│
└── 📁 temp_uploads/                  # Temporary user image uploads (ignored)


