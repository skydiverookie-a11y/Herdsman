# Herdsman — Ollama Model Manager

Self-hosted Web-App zum Verwalten von Ollama-Modellen.
Ollama bietet keine Such-API — Herdsman schliesst diese Luecke mit Registry-Browser
(ollama.com Scraping), lokaler Modellverwaltung und VRAM-Schaetzung.

## Tech-Stack

| Komponente | Technologie |
|------------|-------------|
| Backend | Python 3.12 + FastAPI |
| Frontend | Angular (Standalone Components) + Angular Material |
| Datenbank | SQLite + aiosqlite (Cache, Historie) |
| Scraping | BeautifulSoup + httpx |
| Auth | Einfacher Login (ein Admin-User, JWT 24h Expiry) |
| Realtime | SSE (Server-Sent Events) fuer Pull-Fortschritt |
| Deployment | Docker (docker-compose), allgemein deploybar |

## Projektstruktur

```
Herdsman/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI-App, Lifespan, Router-Registrierung
│   │   ├── config.py            # Pydantic Settings (ENV-basiert)
│   │   ├── database.py          # aiosqlite Connection + Schema-Init
│   │   ├── dependencies.py      # JWT verify_token Dependency
│   │   ├── models/              # (reserviert)
│   │   ├── routers/
│   │   │   ├── auth.py          # POST /api/auth/login
│   │   │   ├── ollama.py        # /api/models/*, /api/ollama/status
│   │   │   ├── registry.py      # /api/registry/search, /models/*
│   │   │   └── settings.py      # /api/settings, /api/settings/password
│   │   ├── schemas/
│   │   │   ├── auth.py          # LoginRequest, TokenResponse
│   │   │   ├── models.py        # LocalModel, RunningModel, PullProgress, etc.
│   │   │   └── registry.py      # SearchResult, SearchResponse, ModelInfo
│   │   └── services/
│   │       ├── auth.py          # Password hashing, JWT creation/decode
│   │       ├── cache.py         # SQLite-basierter Cache mit TTL
│   │       ├── ollama.py        # OllamaService (Ollama API Client)
│   │       ├── pull_queue.py    # Sequenzielle Pull-Queue mit asyncio
│   │       ├── registry.py      # RegistryService (ollama.com Scraping)
│   │       ├── settings.py      # SettingsService (DB-persistiert)
│   │       └── vram.py          # VRAM-Schaetzung + Quantisierungs-Lookup
│   └── requirements.txt
├── frontend/                    # Angular 21 App
│   └── src/app/
│       ├── core/
│       │   ├── guards/auth.guard.ts
│       │   ├── interceptors/auth.interceptor.ts
│       │   └── services/{api,auth,sse}.service.ts
│       ├── layout/sidebar.ts
│       └── pages/{login,dashboard,registry-search,model-details,local-models,settings}/
├── docker/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   ├── docker-compose.yml
│   └── nginx.conf               # API-Proxy + SPA-Fallback
└── REQUIREMENTS.md
```

## Design

- **Vorbild:** Perplexica / Immich
- **Dark Theme** als Default
- Schmale **Icon-Sidebar** links (Navigation)
- **Spacious Layout** mit abgerundeten Cards
- Clean, modern, wenig visuelle Ablenkung

## Auth

- Ein Admin-User mit Username/Passwort
- Initiales Passwort per ENV (`ADMIN_USER`, `ADMIN_PASSWORD`)
- Passwort aenderbar ueber Settings-UI
- JWT-basierte Session (24h Expiry)

## Datenbank (SQLite)

- **Lib:** aiosqlite (async SQLite fuer FastAPI)
- **DB-Datei:** `data/herdsman.db` (im Docker via Volume persistiert)
- **Zweck:**
  - Registry-Cache mit TTL (Suchergebnisse 24h, Modell-Details 7d, konfigurierbar per ENV)
  - Pull-Historie (Zeitstempel, Modellname, Tag)
- **Kein ORM** — direktes SQL mit aiosqlite, Pydantic fuer Mapping
- **Migrationen:** `CREATE TABLE IF NOT EXISTS` beim App-Start

## Scraping

- **Rate-Limiting:** Konservativ (1-2s Delay zwischen Requests), Cache bevorzugen
- **Fallback:** Gecachte Daten anzeigen (mit "Cached"-Hinweis), bei Parse-Fehlern klare Fehlermeldung

## VRAM-Schaetzung

- **Formel:** `VRAM = Parameter × Bytes/Param (nach Quantisierung) + Overhead (~1GB)`
- **Gesamt-VRAM:** Manuell in Settings konfigurierbar
- **Aktuelle Belegung:** Via Ollama `/api/ps`
- **Quantisierungen:** FP16(2.0), Q8_0(1.0), Q6_K(0.75), Q5_K_M(0.625), Q4_K_M(0.5), Q4_0(0.5), Q3_K_M(0.375), Q2_K(0.25)

## Ollama-Verbindung

- Health-Check beim App-Start + periodisch (~30s)
- Status-Indikator im UI (Connected/Disconnected)
- Pull/Delete deaktiviert wenn Ollama offline
- Registry-Suche funktioniert unabhaengig

## Pull-Verhalten

- Fortschritt via SSE (Server-Sent Events)
- Sequenzielle Queue: ein Pull gleichzeitig, weitere warten
- Doppelter Pull auf gleiches Modell wird verhindert
- Loeschen eines laufenden Modells: Warndialog

## Wichtige Konventionen

- **Sprache:** Code und Kommentare auf Englisch, Doku auf Deutsch
- **Backend:** FastAPI mit async, Pydantic v2 fuer Schemas
- **Frontend:** Angular Standalone Components, Angular Material, Dark Theme
- **Ollama-Verbindung:** Eine Instanz, per `OLLAMA_HOST` ENV konfigurierbar (Default: `http://host.docker.internal:11434`)
- **CORS:** allow_origins=["*"] (fuer Entwicklung)

## Ollama APIs

### Registry (ollama.com) — kein CORS, Backend muss scrapen

- `ollama.com/search?q=...&c=...&p=...` — HTML, 20 Ergebnisse/Seite
  - `q` = Suchbegriff, `c` = Kategorie, `p` = Seite

### Lokale Ollama API

| Endpoint | Methode | Beschreibung |
|----------|---------|-------------|
| `/api/tags` | GET | Alle lokalen Modelle |
| `/api/ps` | GET | Laufende Modelle (inkl. VRAM) |
| `/api/show` | POST | Modell-Details |
| `/api/pull` | POST | Modell herunterladen (Streaming) |
| `/api/delete` | DELETE | Modell loeschen |

## Aktueller Stand

- **Backend:** Vollstaendig implementiert (Auth, Ollama-Service, Registry-Scraping, Cache, Settings, Pull-Queue)
- **Frontend:** Angular 21 mit Material Dark Theme, 5 Seiten (Dashboard, Registry, Model-Details, Local Models, Settings)
- **Docker:** Komplett (Backend + Frontend Dockerfiles, docker-compose mit Volumes + Health-Checks, nginx API-Proxy)

## Entwicklung

```bash
# Backend lokal starten
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Docker
cd docker && docker compose up --build
```
