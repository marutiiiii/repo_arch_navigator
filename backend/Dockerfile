# Use a lightweight official Python runtime
FROM python:3.11-slim

# Install system dependencies (Git is mandatory for GitPython)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Prevent Python from writing .pyc files and buffer stdout
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=5000

# Install dependencies first (leverages Docker cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY . .

# Expose Flask API port
EXPOSE 5000

# Start server
# Run with Gunicorn WSGI server and dynamic $PORT with 120s timeout for git clones
CMD sh -c "gunicorn app:app --bind 0.0.0.0:${PORT:-5000} --workers 2 --timeout 120"
