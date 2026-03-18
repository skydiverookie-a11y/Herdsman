# Stage 1: Build Angular Frontend
FROM node:24-alpine AS frontend-build

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ .
RUN npx ng build --configuration=production

# Stage 2: Final Image with Backend + Frontend + Nginx
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx supervisor && \
    rm -rf /var/lib/apt/lists/* && \
    rm -f /etc/nginx/sites-enabled/default

# Install Python dependencies
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application
COPY backend/app/ app/
RUN mkdir -p /app/data

# Copy frontend build from Stage 1
COPY --from=frontend-build /app/dist/frontend/browser /usr/share/nginx/html

# Copy nginx and supervisor configuration
COPY docker/nginx.unified.conf /etc/nginx/sites-enabled/default
COPY docker/supervisord.conf /etc/supervisor/conf.d/herdsman.conf

VOLUME /app/data
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["supervisord", "-n", "-c", "/etc/supervisor/conf.d/herdsman.conf"]
