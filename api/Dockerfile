FROM python:3.11-slim

# system deps (curl for healthchecks, docker CLI for MCP Gateway)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    ca-certificates \
    gnupg \
    lsb-release && \
    # Install Docker CLI
    install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg && \
    chmod a+r /etc/apt/keyrings/docker.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null && \
    apt-get update && \
    apt-get install -y --no-install-recommends docker-ce-cli docker-compose-plugin && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# install deps first (cacheable)
COPY api/requirements.txt /app/api/requirements.txt
RUN pip install --no-cache-dir -r /app/api/requirements.txt

# copy source
COPY api /app/api
COPY agent /app/agent
COPY sim /app/sim
COPY data /app/data
COPY docker-compose.yml /app/docker-compose.yml
COPY scripts /app/scripts
COPY .env /app/.env

ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# CORS origin will be set via env
ENV FRONTEND_ORIGIN=http://localhost:3000

EXPOSE 8000
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
