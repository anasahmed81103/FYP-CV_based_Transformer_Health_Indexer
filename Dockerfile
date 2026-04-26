
# docker image creation for  
# tells Render exactly how to build your FastAPI service into a container. 
# It installs Python, system libraries OpenCV needs (libgl1 etc), your pip packages, and copies your code. 
# Without this Render doesn't know how to run your app.



FROM python:3.12.1-slim

# System dependencies for OpenCV and PyTorch
RUN apt-get update && apt-get install -y \
  libgl1 \
  libglib2.0-0 \
  libsm6 \
  libxext6 \
  libxrender-dev \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy entire project
COPY . .

# Create necessary directories
RUN mkdir -p temp_uploads outputs/checkpoints

# Start FastAPI
CMD ["uvicorn", "backend.api.main:app", "--host", "0.0.0.0", "--port", "8000"]