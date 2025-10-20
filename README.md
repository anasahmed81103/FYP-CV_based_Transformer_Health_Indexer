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

---

in the root:
pip install -r requirements.txt

in front end:
npm i

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

for ease of understanding, here is the project herirarchy:

Transformer_Health_Index/
│
├── .gitignore
├── README.md
├── requirements.txt
│
├── 📁 data/ # All datasets (ignored in git)
│ ├── 📁 processed/
│ │ ├── train.csv
│ │ ├── val.csv
│ │ └── test.csv
│ └── 📁 raw/
│ ├── metadata.csv
│ └── 📁 images/
│ ├── image1.jpg
│ └── ...
│
├── 📁 core/ # Core ML utilities and preprocessing
│ ├── **init**.py
│ ├── augment.py
│ ├── config.py
│ ├── data_cleaning.py
│ ├── dataset.py
│ ├── hyperparameter_tuning.py
│ └── utils.py
│
├── 📁 backend/ # Model training and evaluation scripts
│ ├── **init**.py
│ ├── train.py
│ ├── evaluate.py
│ ├── gradCam.py
│ └── ...
│
├── 📁 models/ # Model architectures
│ ├── **init**.py
│ ├── custom_cnn.py
│ ├── efficientnet.py
│ └── resnet.py
│
├── 📁 outputs/ # Model artifacts and experiment results
│ ├── 📁 checkpoints/
│ │ └── custom_cnn_best.pth
│ ├── 📁 gradcam/
│ │ └── custom_cnn_gradcam.jpg
│ ├── 📁 logs/
│ └── 📁 metrics/
│ └── custom_cnn_best_metrics.csv
│
├── 📁 frontend/ # Next.js + Drizzle + Supabase portal
│ ├── .env.local
│ ├── 📁 db/
│ │ ├── index.ts
│ │ └── schema.ts
│ ├── 📁 drizzle/
│ │ ├── 0000_migration_stuff.sql
│ │ └── 📁 meta/
│ │ ├── journal.json
│ │ └── 0000_snapshot.json
│ ├── 📁 public/ # SVGs, static assets
│ ├── 📁 scripts/
│ │ └── migrate.ts
│ ├── 📁 src/app/
│ │ ├── 📁 api/ # Next.js API routes (login, signup, etc.)
│ │ ├── 📁 login/ # Login page (CSS + TSX)
│ │ ├── ... (other pages)
│ │ ├── CSS_GUIDE.md
│ │ ├── globals.css
│ │ ├── layout.tsx
│ │ ├── page.tsx
│ │ ├── page.module.css
│ │ └── shared.module.css
│ ├── .next/ # Next.js build (ignored)
│ ├── node_modules/ # Dependencies (ignored)
│ ├── package.json
│ └── tsconfig.json
│
└── ...
