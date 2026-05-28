FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install CPU-only PyTorch
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu \
    torch==2.7.1+cpu \
    torchvision==0.22.1+cpu \
    torchaudio==2.7.1+cpu

# Prevent Triton dependencies
ENV WHISPER_NO_TRT=1

# Upgrade packaging tools
RUN pip install --upgrade pip setuptools wheel

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

EXPOSE 8000

# Start FastAPI
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]