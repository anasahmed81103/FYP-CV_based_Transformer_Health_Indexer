FROM python:3.12.1-slim

RUN apt-get update && apt-get install -y \
  libgl1 \
  libglib2.0-0 \
  libsm6 \
  libxext6 \
  libxrender-dev \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p temp_uploads outputs/checkpoints
RUN chmod -R 777 /app

CMD ["uvicorn", "backend.api.main:app", "--host", "0.0.0.0", "--port", "8000"]