# Implementierungsplan — Herdsman

## Kontext

Herdsman ist eine Self-hosted Web-App zum Verwalten von Ollama-Modellen. Das Grundgeruest (FastAPI-Skeleton, Docker-Config, Doku) steht. Jetzt beginnt die eigentliche Implementierung — Backend-Logik, Frontend, und Docker-Finalisierung.

## Phasen-Uebersicht

Die Implementierung erfolgt in 6 Phasen. Jede Phase ist einzeln testbar.

---

## Phase 1: Backend-Fundament (DB + Config + Auth)

### 1.1 Dependencies aktualisieren
- `backend/requirements.txt` — aiosqlite, python-jose, passlib[bcrypt], python-multipart ergaenzen

### 1.2 Config-Modul
- `backend/app/config.py` — Pydantic Settings: OLLAMA_HOST, ADMIN_USER, ADMIN_PASSWORD, SECRET_KEY, CACHE_TTL_SEARCH, CACHE_TTL_DETAILS, TOTAL_VRAM

### 1.3 Datenbank
- `backend/app/database.py` — aiosqlite Connection-Management, CREATE TABLE IF NOT EXISTS beim Startup (lifespan)
- Tabellen: `search_cache`, `model_cache`, `pull_history`, `settings`

### 1.4 Auth
- `backend/app/schemas/auth.py` — LoginRequest, TokenResponse
- `backend/app/services/auth.py` — verify_password, create_token, hash_password
- `backend/app/routers/auth.py` — POST /api/auth/login
- `backend/app/dependencies.py` — verify_token Dependency fuer geschuetzte Routen

### 1.5 main.py aktualisieren
- Lifespan mit DB-Init
- Auth-Router einbinden

**Test:** Backend starten, /health aufrufen, /api/auth/login mit ENV-Credentials testen, geschuetzte Route testen.

---

## Phase 2: Ollama-Service (lokale API)

### 2.1 Schemas
- `backend/app/schemas/models.py` — LocalModel, RunningModel, ModelDetails, PullProgress, VRAMEstimate

### 2.2 Ollama-Service
- `backend/app/services/ollama.py` — OllamaService Klasse:
  - `health_check()` — GET /api/tags als Ping
  - `list_local_models()` — GET /api/tags
  - `list_running_models()` — GET /api/ps
  - `show_model(name)` — POST /api/show
  - `pull_model(name)` — POST /api/pull (async generator, NDJSON → SSE)
  - `delete_model(name)` — DELETE /api/delete

### 2.3 VRAM-Service
- `backend/app/services/vram.py` — Quantisierungs-Lookup, VRAM-Schaetzung, Vergleich mit verfuegbarem VRAM

### 2.4 Routen
- `backend/app/routers/ollama.py` — Alle Endpoints fuer lokale Modelle:
  - GET /api/models — Lokale Modelle
  - GET /api/models/running — Laufende Modelle
  - GET /api/models/{name}/details — Modell-Details
  - POST /api/models/pull — Pull mit SSE-Response
  - DELETE /api/models/{name} — Modell loeschen
  - GET /api/ollama/status — Health/Connection Status

### 2.5 Health-Check Background Task
- Periodischer Health-Check (~30s) in main.py lifespan

**Test:** Endpoints mit laufender Ollama-Instanz testen. Pull-SSE-Stream im Browser/curl pruefen.

---

## Phase 3: Registry-Scraping + Cache

### 3.1 Schemas
- `backend/app/schemas/registry.py` — SearchResult, SearchResponse, ModelInfo

### 3.2 Scraping-Service
- `backend/app/services/registry.py` — RegistryService:
  - `search(query, category, sort, page)` — ollama.com/search scrapen, HTML parsen
  - `get_model_details(name)` — Modell-Seite scrapen
  - `get_model_tags(name)` — Tags/Varianten scrapen
  - Rate-Limiting: 1-2s Delay zwischen Requests

### 3.3 Cache-Service
- `backend/app/services/cache.py` — CacheService:
  - `get_cached(key, ttl)` / `set_cached(key, data)`
  - TTL-Pruefung bei jedem Read
  - Fallback-Flag wenn Daten aus Cache kommen

### 3.4 Routen
- `backend/app/routers/registry.py`:
  - GET /api/registry/search — Suche mit Filtern + Paginierung
  - GET /api/registry/models/{name} — Modell-Details
  - GET /api/registry/models/{name}/tags — Tags

**Test:** Suchendpoint testen, Cache-Verhalten pruefen (zweiter Request sollte schneller sein), Offline-Fallback testen.

---

## Phase 4: Settings + Pull-Queue

### 4.1 Settings
- `backend/app/routers/settings.py`:
  - GET /api/settings — Aktuelle Settings laden
  - PUT /api/settings — Settings speichern (VRAM, Ollama-Host, TTL)
  - PUT /api/settings/password — Passwort aendern
- `backend/app/services/settings.py` — Settings aus DB lesen/schreiben

### 4.2 Pull-Queue
- `backend/app/services/pull_queue.py` — Sequenzielle Pull-Queue:
  - Queue mit asyncio.Queue
  - Worker-Task der sequenziell abarbeitet
  - Status pro Pull (queued, pulling, done, error)
  - Duplikat-Erkennung

### 4.3 Pull-History
- In pull_queue.py: Nach erfolgreichem Pull → Eintrag in pull_history Tabelle

**Test:** Settings aendern und pruefen ob sie persistiert werden. Mehrere Pulls queuen und sequenzielle Abarbeitung pruefen.

---

## Phase 5: Angular Frontend

### 5.1 Projekt erstellen
- `ng new` im frontend/ Ordner (Standalone, SCSS, SSR aus)
- Angular Material installieren + Custom Dark Theme
- Grundlayout: Sidebar + Content-Area

### 5.2 Core-Setup
- Auth-Service + HTTP-Interceptor (JWT Token)
- Auth-Guard fuer geschuetzte Routen
- Login-Page
- API-Service (HttpClient Wrapper)
- SSE-Service fuer Pull-Fortschritt

### 5.3 Layout
- App-Shell: Schmale Icon-Sidebar (Home, Search, Models, Settings) + Router-Outlet
- Ollama-Status-Indikator in der Sidebar

### 5.4 Seiten
- **Dashboard** — Status-Card, laufende Modelle, Suchfeld, zuletzt gepullte Modelle
- **Registry-Suche** — Suchfeld, Filter, Ergebnis-Cards mit "Installed"-Badge, Paginierung
- **Modell-Details** — Info-Cards, Tags-Liste, Pull-Button mit VRAM-Warnung
- **Lokale Modelle** — Tabelle/Cards aller Modelle, Delete-Button mit Confirm-Dialog
- **Settings** — Formular fuer VRAM, Ollama-Host, TTL, Passwort-Aenderung

### 5.5 Docker
- `docker/Dockerfile.frontend` — Node Build + nginx
- `docker/docker-compose.yml` — Volumes fuer DB, ENV-Variablen ergaenzen

**Test:** App im Browser oeffnen, Login, Dashboard, Suche, Pull mit Fortschritt, Settings.

---

## Phase 6: Docker + Finalisierung

- docker-compose.yml finalisieren (Volumes, ENV, Health-Checks)
- Frontend nginx.conf fuer API-Proxy
- README.md mit Setup-Anleitung
- End-to-End Test mit Docker Compose

---

## Reihenfolge

Phase 1 → 2 → 3 → 4 → 5 → 6 (strikt sequenziell, jede Phase baut auf der vorherigen auf)
