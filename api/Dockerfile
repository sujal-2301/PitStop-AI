FROM python:3.11-slim

# system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# install deps first (cacheable)
COPY api/requirements.txt /app/api/requirements.txt
RUN pip install --no-cache-dir -r /app/api/requirements.txt

# copy source
COPY api /app/api
COPY agent /app/agent
COPY sim /app/sim
COPY data /app/data

ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# CORS origin will be set via env
ENV FRONTEND_ORIGIN=http://localhost:3000

EXPOSE 8000
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
