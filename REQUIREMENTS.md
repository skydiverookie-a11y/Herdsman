# Herdsman — Ollama Model Manager

## Repository

https://github.com/skydiverookie-a11y/Herdsman

## Projektbeschreibung

Self-hosted Web-App zum Verwalten von Ollama-Modellen.
Ollama bietet keine Such-API an — nur HTML-Seiten auf ollama.com.
Herdsman schliesst diese Luecke mit einem Registry-Browser (ollama.com durchsuchen),
lokaler Modellverwaltung und VRAM-Schaetzung.

## Tech-Stack

| Komponente | Technologie |
|------------|-------------|
| Backend | Python 3.12 + FastAPI |
| Frontend | Angular (Standalone Components) + Angular Material |
| Datenbank | SQLite + aiosqlite (Registry-Cache, Pull-Historie) |
| Scraping | BeautifulSoup + httpx (fuer ollama.com) |
| Auth | Einfacher Login (ein Admin-User, JWT) |
| Realtime | SSE (Server-Sent Events) fuer Pull-Fortschritt |
| Deployment | Docker (docker-compose) |

## Design

- Orientiert an Perplexica / Immich
- Dark Theme als Default
- Schmale Icon-Sidebar links
- Spacious Layout mit abgerundeten Cards
- Clean und modern

## Features

### 1. Startseite (Dashboard)
- Oben: Ollama-Status (Connected/Disconnected) + laufende Modelle mit VRAM-Belegung
- Unten: Suchfeld + zuletzt gesuchte/gepullte Modelle

### 2. Registry-Suche
- Durchsucht `ollama.com/search` per Scraping
- Unterstuetzt Filter (Kategorie, Parameter-Groesse, Sortierung)
- Paginierung (ollama.com liefert 20 Ergebnisse pro Seite)
- Zeigt an ob ein Modell lokal bereits installiert ist (vorhanden ja/nein)

### 3. Modell-Details
- Zeigt Groesse, Parameter-Anzahl, Quantisierung, Faehigkeiten
- Verfuegbare Tags/Varianten eines Modells auflisten
- Modell-Beschreibung und Readme aus der Registry

### 4. Lokale Modellverwaltung
- Uebersicht aller lokal installierten Modelle
- Anzeige laufender Modelle inkl. VRAM-Belegung

### 5. Pull / Delete
- Modelle direkt ueber die UI pullen
- Fortschrittsanzeige via SSE (Server-Sent Events)
- Sequenzielle Pull-Queue: ein Pull gleichzeitig, weitere warten
- Doppelter Pull auf gleiches Modell wird verhindert (Button deaktiviert)
- Lokale Modelle loeschen — Warndialog wenn Modell aktuell geladen ist

### 6. Registry-Cache (SQLite)
- Suchergebnisse und Modell-Details werden lokal in SQLite gecacht
- TTL-basierte Invalidierung (Suchergebnisse 24h, Modell-Details 7d, konfigurierbar per ENV)
- Pull-Historie: wann wurde welches Modell installiert/geloescht
- Reduziert Scraping-Requests und macht die App offline-faehig fuer bereits gesehene Daten
- Fallback: gecachte Daten anzeigen wenn ollama.com nicht erreichbar (mit "Cached"-Hinweis)

### 7. VRAM-Schaetzung
- Formel: `VRAM = Parameter × Bytes/Param (nach Quantisierung) + Overhead (~1GB)`
- Gesamt-VRAM manuell in Settings konfigurierbar
- Aktuelle Belegung via Ollama `/api/ps`
- Warnung wenn ein Modell nicht in den VRAM passt

Quantisierungs-Tabelle:

| Quantisierung | Bits/Param | Bytes/Param |
|---------------|-----------|-------------|
| FP16          | 16        | 2.0         |
| Q8_0          | 8         | 1.0         |
| Q6_K          | 6         | 0.75        |
| Q5_K_M        | 5         | 0.625       |
| Q4_K_M        | 4         | 0.5         |
| Q4_0          | 4         | 0.5         |
| Q3_K_M        | 3         | 0.375       |
| Q2_K          | 2         | 0.25        |

### 8. Auth
- Einfacher Login mit einem Admin-User (Username/Passwort)
- Initiales Passwort per ENV (`ADMIN_USER`, `ADMIN_PASSWORD`)
- Passwort aenderbar ueber Settings-UI
- JWT-basierte Session (24h Expiry)

### 9. Ollama-Verbindung
- Health-Check beim App-Start und periodisch (~30s)
- Status-Indikator im UI (Connected/Disconnected)
- Registry-Suche funktioniert unabhaengig von Ollama-Verfuegbarkeit
- Pull/Delete Buttons deaktiviert wenn Ollama offline

### 10. Settings
- Gesamt-VRAM der GPU konfigurieren
- Ollama-Host URL
- Cache-TTL Werte
- Admin-Passwort aendern

## Technische Erkenntnisse

### Ollama Registry (ollama.com)

- **`ollama.com/api/tags`** — Liefert nur ~33 featured/populaere Modelle (nicht durchsuchbar)
- **`ollama.com/search?q=...&c=...&p=...`** — HTML-Antwort, 20 Ergebnisse pro Seite
  - `q` = Suchbegriff
  - `c` = Kategorie-Filter
  - `p` = Seite (Paginierung)
- **Kein CORS** bei ollama.com → Backend muss serverseitig scrapen (kein direkter Browser-Zugriff moeglich)
- **Rate-Limiting:** Konservativ scrapen (1-2s Delay), Cache bevorzugen

### Lokale Ollama API

| Endpoint | Beschreibung |
|----------|-------------|
| `GET /api/tags` | Alle lokal installierten Modelle |
| `GET /api/ps` | Aktuell laufende Modelle (inkl. VRAM-Info) |
| `POST /api/show` | Details zu einem bestimmten Modell |
| `POST /api/pull` | Modell herunterladen (Streaming-Response) |
| `DELETE /api/delete` | Modell loeschen |

### Deployment-Hinweise

- Default `OLLAMA_HOST=http://host.docker.internal:11434` (Docker Desktop, Windows/Mac)
- Auf Linux: `http://172.17.0.1:11434` oder `--network host` verwenden
- Ollama-Host ist ueber Settings-UI aenderbar
