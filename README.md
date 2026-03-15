# Herdsman

Self-hosted web app for managing [Ollama](https://ollama.com) models. Ollama doesn't provide a search API — Herdsman fills that gap with a registry browser (ollama.com scraping), local model management, and VRAM estimation.

## Features

- **Registry Browser** — Search and explore the Ollama model library directly from the UI
- **Local Model Management** — List, inspect, pull, and delete models on your Ollama instance
- **Pull Queue** — Sequential download queue with real-time progress via SSE (Server-Sent Events)
- **VRAM Estimation** — Estimate memory requirements based on parameter count and quantization level, shown in model lists and tag browser
- **Running Models** — Monitor currently loaded models and their VRAM usage with auto-refresh polling
- **VRAM Management** — Free individual models or all at once from GPU memory without deleting them
- **Test Prompt** — Send prompts to any local model directly from the dashboard
- **Settings UI** — Configure Ollama host, VRAM budget, cache TTLs, and change admin password
- **SQLite Cache** — Cached registry data with configurable TTLs (search: 24h, details: 7d)
- **Single-User Auth** — JWT-based authentication with 24h token expiry
- **Dark Theme** — Clean, modern UI inspired by Perplexica / Immich

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Python 3.12, FastAPI, async |
| Frontend | Angular 21, Standalone Components, Angular Material |
| Database | SQLite via aiosqlite |
| Scraping | BeautifulSoup + httpx |
| Auth | JWT (PyJWT + bcrypt) |
| Realtime | Server-Sent Events (SSE) |
| Deployment | Docker Compose + nginx reverse proxy |

## Screenshots

> *Coming soon*

## Quick Start (Docker)

```bash
git clone https://github.com/your-user/herdsman.git
cd herdsman/docker
docker compose up --build -d
```

The app is available at **http://localhost:4200**.

Default credentials: `admin` / `admin`

### Environment Variables

Override defaults by setting environment variables with the `HERDSMAN_` prefix in `docker-compose.yml` or a `.env` file:

```yaml
environment:
  - HERDSMAN_OLLAMA_HOST=http://host.docker.internal:11434
  - HERDSMAN_ADMIN_USER=admin
  - HERDSMAN_ADMIN_PASSWORD=change-me
  - HERDSMAN_SECRET_KEY=your-secret-key
```

## Local Development

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API docs available at http://localhost:8000/docs (Swagger UI).

### Frontend

```bash
cd frontend
npm install
ng serve
```

Dev server at http://localhost:4200. API requests are proxied to the backend.

## Configuration

All settings use the `HERDSMAN_` prefix and can be set via environment variables or a `.env` file.

| Variable | Description | Default |
|----------|-------------|---------|
| `HERDSMAN_OLLAMA_HOST` | Ollama API base URL | `http://host.docker.internal:11434` |
| `HERDSMAN_ADMIN_USER` | Admin username | `admin` |
| `HERDSMAN_ADMIN_PASSWORD` | Initial admin password | `admin` |
| `HERDSMAN_SECRET_KEY` | JWT signing secret | `change-me-in-production` |
| `HERDSMAN_JWT_ALGORITHM` | JWT algorithm | `HS256` |
| `HERDSMAN_JWT_EXPIRY_HOURS` | Token lifetime in hours | `24` |
| `HERDSMAN_CACHE_TTL_SEARCH` | Search cache TTL in seconds | `86400` (24h) |
| `HERDSMAN_CACHE_TTL_DETAILS` | Model details cache TTL in seconds | `604800` (7d) |
| `HERDSMAN_TOTAL_VRAM_GB` | Total GPU VRAM for estimation | `0.0` (disabled) |
| `HERDSMAN_DB_PATH` | SQLite database file path | `data/herdsman.db` |

## API Documentation

All endpoints (except login and health) require a valid JWT token in the `Authorization: Bearer <token>` header.

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Authenticate and receive a JWT token |

**Request body:**
```json
{ "username": "admin", "password": "admin" }
```

**Response:**
```json
{ "access_token": "eyJ..." }
```

### Ollama Status

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/ollama/status` | Connection status and host info |

### Models (Local)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/models` | List all local models |
| `GET` | `/api/models/running` | List currently loaded/running models |
| `GET` | `/api/models/{name}/details` | Show details for a local model |
| `POST` | `/api/models/pull` | Pull a model (returns SSE stream) |
| `POST` | `/api/models/unload` | Unload a model from VRAM (keep on disk) |
| `POST` | `/api/models/generate` | Send a prompt to a model |
| `GET` | `/api/models/queue` | Current pull queue status |
| `DELETE` | `/api/models/{name}` | Delete a local model |

**Pull request body:**
```json
{ "name": "llama3:8b-q4_K_M" }
```

**Unload request body:**
```json
{ "name": "llama3:8b-q4_K_M" }
```

**Generate request body:**
```json
{ "model": "llama3:8b-q4_K_M", "prompt": "Hello, how are you?" }
```

**SSE progress events:**
```json
{ "status": "downloading", "completed": 1234567, "total": 9876543 }
{ "status": "success", "name": "llama3:8b-q4_K_M" }
```

### Registry (ollama.com)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/registry/search` | Search the Ollama model registry |
| `GET` | `/api/registry/models/{name}/details` | Get registry details for a model |
| `GET` | `/api/registry/models/{name}/tags` | List available tags for a model |

**Search query parameters:**

| Param | Description |
|-------|-------------|
| `q` | Search query |
| `c` | Category filter |
| `o` | Sort order |
| `p` | Page number (default: 1) |

### Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/settings` | Get current settings |
| `PUT` | `/api/settings` | Update settings |
| `PUT` | `/api/settings/password` | Change admin password |

**Settings update body:**
```json
{
  "total_vram_gb": 24.0,
  "ollama_host": "http://localhost:11434",
  "cache_ttl_search": 86400,
  "cache_ttl_details": 604800
}
```

## Architecture

```
Herdsman/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, lifespan, router registration
│   │   ├── config.py            # Pydantic Settings (env-based)
│   │   ├── database.py          # aiosqlite connection + schema init
│   │   ├── dependencies.py      # JWT verify_token dependency
│   │   ├── routers/
│   │   │   ├── auth.py          # POST /api/auth/login
│   │   │   ├── ollama.py        # /api/models/*, /api/ollama/status
│   │   │   ├── registry.py      # /api/registry/search, /models/*
│   │   │   └── settings.py      # /api/settings, /api/settings/password
│   │   ├── schemas/
│   │   │   ├── auth.py          # LoginRequest, TokenResponse
│   │   │   ├── models.py        # LocalModel, RunningModel, PullProgress
│   │   │   └── registry.py      # SearchResult, SearchResponse, ModelInfo
│   │   └── services/
│   │       ├── auth.py          # Password hashing, JWT creation
│   │       ├── cache.py         # SQLite cache with TTL
│   │       ├── ollama.py        # OllamaService (API client)
│   │       ├── pull_queue.py    # Sequential pull queue (asyncio)
│   │       ├── registry.py      # RegistryService (ollama.com scraping)
│   │       ├── settings.py      # SettingsService (DB-persisted)
│   │       └── vram.py          # VRAM estimation + quantization lookup
│   └── requirements.txt
├── frontend/                    # Angular 21 app
│   └── src/app/
│       ├── core/                # Guards, interceptors, services
│       ├── layout/              # Sidebar navigation
│       └── pages/               # Login, Dashboard, Registry, Models, Settings
├── docker/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   ├── docker-compose.yml
│   └── nginx.conf               # API proxy + SPA fallback
└── CLAUDE.md
```

### Design Decisions

- **SQLite over Postgres** — No external database dependency. The cache and settings are lightweight; SQLite with aiosqlite is sufficient and simplifies deployment.
- **Scraping over API** — Ollama has no public registry API. Herdsman scrapes `ollama.com/search` and caches results in SQLite with configurable TTLs.
- **SSE over WebSockets** — Pull progress is a unidirectional stream. SSE is simpler, works through HTTP proxies, and handles reconnection natively.
- **Sequential Pull Queue** — Ollama handles one download at a time. The queue prevents conflicts and provides status tracking for pending pulls.
- **Single-User Auth** — Designed for self-hosted use. One admin user with JWT keeps things simple without requiring a user management system.

## VRAM Estimation

Herdsman estimates GPU memory requirements using the formula:

```
VRAM (GB) = Parameters (B) × Bytes per Parameter + Overhead (1 GB)
```

### Quantization Table

| Quantization | Bytes per Parameter | Example: 7B Model |
|-------------|--------------------|--------------------|
| FP16 | 2.000 | 15.0 GB |
| Q8_0 | 1.000 | 8.0 GB |
| Q6_K | 0.750 | 6.3 GB |
| Q5_K_M | 0.625 | 5.4 GB |
| Q4_K_M | 0.500 | 4.5 GB |
| Q4_0 | 0.500 | 4.5 GB |
| Q3_K_M | 0.375 | 3.6 GB |
| Q2_K | 0.250 | 2.8 GB |

Set your total VRAM in Settings to see fit indicators when browsing models.

## License

MIT
