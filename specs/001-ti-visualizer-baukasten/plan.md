# Plan 001: TI Visualizer – interaktiver Netzwerk-Baukasten

**Status:** Entwurf, überarbeitet am 2026-11-04: UI-Konzept nach dem
Mockup, Speichern und Teilen über Dateien und Links, Deployment auf
GitHub Pages. Zur Freigabe durch Justin.
**Basis:** [spec.md](./spec.md) (in Überarbeitung),
[regelwerk.md](./regelwerk.md), Mockup in `design/mockup/`

## Leitentscheidungen

| # | Entscheidung | Begründung |
|---|---|---|
| D1 | **Reines Frontend** (TypeScript, React), **kein Backend** | Vom Nutzer festgelegt (2026-11-03). Fachdaten sind rein lesend und klein. |
| D2 | **Fachdaten als versionierte JSON-Dateien** in `catalog/`, beim Build ins Frontend gebündelt | Vom Nutzer gewünscht. Versionierung über Git und Versionsverzeichnis. |
| D3 | **Topologien und Einstellungen** lokal im Browser (IndexedDB), austauschbar über **Dateien** und **Links** (Abschnitt „Speichern, Dateien und Teilen“) | Vom Nutzer gewünscht (2026-11-04): Vorlagen und Einstellungen sollen auch Dritte in einem anderen Browser öffnen können, ohne Server und ohne Konto. |
| D4 | Die Regel-Engine ist **datengetrieben**: Regeln, Aktionen, Abläufe, Prüfregeln stehen als JSON | Änderungen am Regelwerk brauchen ein Daten-Update statt Code. |
| D5 | **Validierung zur Build-Zeit**: Katalog und mitgelieferte Vorlagen werden in der CI gegen ihre Schemas geprüft; bei Fehlern wird nicht deployt | Fehlerhafte Daten erreichen nie die öffentliche Seite. |
| D6 | **React Flow** (xyflow) als Canvas | Knoten als React-Komponenten, eigene Kanten mit Label und Paket-Animation, `isValidConnection` für die Regel-Engine, Tastatur und Kontextmenü möglich. |
| D7 | Simulation ist ein **abgespielter Ablauf aus Schritten**, keine Protokollimplementierung | Lernzweck. |
| D8 | **Öffentliches Deployment auf GitHub Pages** per GitHub Actions bei Push auf `main` | Vom Nutzer festgelegt. Repo wird öffentlich. |
| D9 | **Nur Deutsch** in v1, Texte im Katalog bzw. in einer Textdatei, nicht im Code verstreut | Vom Nutzer festgelegt. |
| D10 | **Barrierefreiheit**: Rot-Grün-Schwäche und volle Tastaturbedienung | Vom Nutzer festgelegt. |
| D11 | **Das Mockup ist die visuelle Vorlage**, nicht der Code: Layout, Tokens, Formen, Kantenstile und Zustände werden nachgebaut; `support.js`, `image-slot.js` und die Mockup-Logik werden nicht übernommen | Die Mockup-Logik weicht vom Regelwerk ab (Verbotsliste, Rollenbindung, Grenzwerte). Fachlich gilt das Regelwerk. |
| D12 | **Karten sind Zustand des Kartenterminals**, keine eigenen Knoten | Entschieden 2026-11-03 (Regelwerk K-1, K-2). |
| D13 | **Zod-Schemas** als einzige Quelle für Katalog-, Datei- und Topologie-Format | Laufzeitprüfung (Import, Links) und TypeScript-Typen aus einer Quelle. |
| D14 | **Single-Page-App ohne Router**; geteilte Inhalte kommen über das URL-Fragment (`#…`) bzw. einen Query-Parameter | GitHub Pages kennt kein Server-Routing. Das Fragment wird nie an den Server geschickt. |
| D15 | Kanten sind **ungerichtet** und verbinden zwei **Anschlüsse** (Regelwerk 2) | Spec FR-14. |
| D16 | Katalog-JSON wird **von Claude aus Spec und Regelwerk abgeleitet** und von Justin geprüft | Spec und Regelwerk bleiben Quelle der Wahrheit. |
| D17 | Katalog, Engines und Persistenz starten unabhängig von der UI | Parallel umsetzbar. |
| D18 | **Jede Regel des Regelwerks ist ein eigener Testfall** | Erfolgskriterium der Spec. |
| D19 | **MIT-Lizenz** und **Impressum** mit Verweis auf die Bachelorarbeit; die App verlinkt das Impressum dauerhaft im Fußbereich | Vom Nutzer festgelegt. |
| D20 | **Design-System „Organic“** aus dem Mockup als CSS-Variablen (`tokens.css`), Komponenten mit **CSS Modules**; kein UI-Framework | Das Mockup bringt fertige Tokens für Hell und Dunkel mit. Ein Framework wie MUI würde die Optik überdecken. |
| D21 | **Schriften selbst ausgeliefert** (`@fontsource/figtree`, `@fontsource/caprasimo`) statt Google Fonts | Keine Anfragen an Dritte beim Seitenaufruf; einfacheres Impressum/Datenschutz. |
| D22 | **Icons aus Lucide** (`lucide-react`, ISC-Lizenz), ergänzt um wenige eigene SVGs | Die Icon-Pfade im Mockup stammen aus dieser Familie. |
| D23 | **Ein Dateiformat `.tiv.json`** für Topologie, Einstellungen und Arbeitsstand, unterschieden über `kind` | Ein Import-Dialog für alles; Dritte brauchen nur die Datei. |
| D24 | **Drei Wege zum Teilen:** Datei, Vorlagen-Bibliothek im Repo, Link | Deckt Weitergabe per E-Mail/Moodle, kuratierte Vorlagen für alle und schnelles Teilen ab. |
| D25 | **Undo/Redo** im Topologie-Store (Verlauf mit 80 Schritten, wie im Mockup) | FR-16. |
| D26 | **CI/CD-Pipeline mit GitHub Actions** in festen Stufen: Statische Prüfung → Unit-Tests mit Coverage → Sonar-Analyse mit Quality Gate → Build-Test → E2E-Tests mit Playwright → Deployment | Vom Nutzer gewünscht (2026-11-04). Nur was alle Stufen besteht, wird veröffentlicht. |
| D27 | **SonarQube Cloud** (ehemals SonarCloud) für Codequalität, Sicherheit und Coverage | Für öffentliche Repos kostenlos, direkt mit GitHub verbunden, kommentiert Pull Requests. |
| D28 | **Architekturdiagramme als Mermaid** in [architektur.md](./architektur.md) | GitHub zeigt Mermaid direkt an; Diagramme liegen versioniert als Text neben dem Plan. |
| D29 | **KI-Review am Pull Request** mit der Claude Code GitHub Action (Modell Opus), nur als Kommentar, **kein Pflicht-Check** | Vom Nutzer gewünscht (2026-11-04). Prüft Spec- und Regelwerk-Treue, was Sonar und Tests nicht abdecken; macht den KI-gestützten Entwicklungsprozess für die Bachelorarbeit auswertbar. |

## Technologie-Stack

| Bereich | Wahl |
|---|---|
| Sprache, Build | TypeScript, Vite, pnpm |
| UI | React, React Flow, CSS Modules, `lucide-react`, `@fontsource/*` |
| Zustand | Zustand (Stores für Katalog, Topologie, Oberfläche, Simulation, Einstellungen) |
| Schemas | Zod |
| Speicher | IndexedDB über `idb-keyval` |
| Teilen per Link | `lz-string` (Komprimierung ins URL-Fragment) |
| Tests | Vitest mit `@vitest/coverage-v8`, Playwright (Chromium, Firefox, WebKit), `@axe-core/playwright` |
| Qualität | ESLint, Prettier, `tsc --noEmit`, SonarQube Cloud |
| CI/CD | GitHub Actions, Dependabot, Claude Code GitHub Action (KI-Review) |
| Deployment | GitHub Pages |

## Repo-Layout

```
src/
  app/            App-Shell, Layout, Tastaturkürzel, Startansicht
  ui/             wiederverwendbare Bausteine (Button, Dialog, Menü, Tag, Toast, Panel)
  canvas/         React-Flow-Knoten, -Kanten, Zonen, Minimap, Verbinden
  panels/         Palette, Detailpanel, Simulations-Player, Tutorial, Herausforderungen
  dialogs/        Karte stecken, Speichern/Laden, Vorlagen, Import, Teilen,
                  Sicherheitsprüfung, Tastaturkürzel, Impressum
  engine/         reine TS-Funktionen: Regeln, Pfade, Aktionen, Simulation,
                  Prüfregeln, Konfiguration (ohne React)
  store/          Zustand-Stores
  persistence/    IndexedDB, Dateiformat, Import/Export, Links, Migrationen
  schema/         Zod-Schemas (Katalog, Topologie, Einstellungen, Datei)
  styles/         tokens.css, globale Styles, Kategorie- und Kantenstile
  assets/         Persona-Bilder (WebP), eigene Icons
catalog/          versionierte Fachdaten (siehe Katalog)
public/
  vorlagen/       Vorlagen-Bibliothek: index.json + *.tiv.json
tests/e2e/        Playwright-Suiten (smoke, share, a11y, …)
.github/workflows ci.yml, deploy.yml, nightly.yml, _pipeline.yml
.github/dependabot.yml
.github/review-richtlinien.md   Prüfpunkte für den KI-Review
sonar-project.properties
playwright.config.ts, vitest.config.ts, .size-limit.json
design/mockup/    visuelle Vorlage (nicht im Build)
```

## Architektur

```
┌──────────────────────────── Browser ────────────────────────────┐
│  UI (React)                                                       │
│  Kopfleiste · Palette · Canvas · Detailpanel · Player · Dialoge   │
│        │ liest/schreibt                                           │
│  Stores (Zustand): Katalog · Topologie (+Undo) · UI · Sim · Einst.│
│        │ ruft                                                     │
│  Engines (reines TS): Regeln · Pfade · Aktionen · Simulation ·    │
│                       Prüfregeln · Konfiguration                  │
│        │                                                          │
│  Persistenz: IndexedDB · Datei (.tiv.json) · Link (#t=…)          │
└────────┬───────────────────────────────────┬────────────────────┘
         │ lädt beim Start (gleicher Server)  │ optional, nur auf Nutzerwunsch
   GitHub Pages: App + Katalog + /vorlagen    fremde URL (?vorlage=…)
```

Ausführliche Diagramme (Systemkontext, Bausteine, Datenfluss beim
Teilen, Simulation, CI/CD): **[architektur.md](./architektur.md)**.

Engines kennen weder React noch den Browser-Speicher. Dadurch sind sie
vollständig mit Vitest testbar, und jede Regel des Regelwerks ist ein
Testfall (D18).

## UI-Konzept nach dem Mockup

Referenz: `design/mockup/TI Visualizer.dc.html` (Template bis Zeile 1076)
und `design/mockup/screenshots/`. Zielgröße Desktop 1440 × 900, Tablet als
Zusatz.

### Layout

```
┌───────────────────────────── Kopfleiste (62 px) ─────────────────────────────┐
│ Logo · Topologiename · Geräteanzahl │ Modus Einfach/Erweitert │ Suchen │      │
│ Rückgängig/Wiederholen │ Vorlagen │ Speichern │ Teilen │ Prüfung │ ☾ │ ?      │
├──────────────┬──────────────────────────────────────────────┬────────────────┤
│ Palette      │ Canvas (Gitter, Zonen, Knoten, Kanten)       │ Detailpanel    │
│ (links,      │                                              │ (rechts,       │
│ einklappbar, │                                  Minimap     │ einblendbar,   │
│ anpinnbar)   │                          Zoom + / − / Fit    │ anpinnbar)     │
├──────────────┴──────────────────────────────────────────────┴────────────────┤
│ Simulations-Player (nur während einer Aktion) · Fußzeile mit Impressum        │
└──────────────────────────────────────────────────────────────────────────────┘
Überlagert: Startansicht, Dialoge, Kontextmenü, Tutorial-Karte, Toasts
```

### Komponenten (Mockup → Umsetzung)

| Mockup-Bereich | Komponente | Spec |
|---|---|---|
| Startansicht mit Preset-Karten | `StartScreen`, `PresetCard` (Vorschau der Topologie) | FR-2 |
| Kopfleiste | `AppHeader`, `ModeSwitch`, `ThemeToggle`, `SearchBox` | FR-13, FR-22 |
| Gerätepalette, gruppiert und einklappbar | `Palette`, `PaletteGroup`, `PaletteItem` (Drag & Drop, Enter) | FR-1 |
| Geräteknoten mit Kategorie-Leiste, Icon, Kurzname, Name | `DeviceNode` (+ Anschluss-Punkte im Modus Erweitert) | FR-1, FR-14 |
| Karten-Chips im Terminal (z. B. „SMC-B“) | `CardChip` im `DeviceNode`, Dialog `PlugCardDialog` | FR-18 |
| Kanten mit Label („SOAP/TLS“, „IPsec IKEv2“) | `ConnectionEdge` je Verbindungsart (Regelwerk 3) | FR-3, FR-11 |
| Zonen (z. B. „Telematikinfrastruktur“) | `ZoneNode` (Gruppe in React Flow) | FR-15 |
| Ungültige Verbindung, Meldung | `Toast` mit Icon und Text | FR-4 |
| Kontextmenü mit ausgegrauten Einträgen | `ContextMenu`, `MenuItem` (Schloss-Icon + Begründung) | FR-6, FR-7 |
| Anschluss wählen (Erweitert) | `PortPicker` | FR-14 |
| Detailpanel | `DetailPanel` (Gerät, Kante, Zone; Protokolltabelle; Einstellungen) | FR-11, FR-17 |
| Simulations-Player | `SimPlayer` (Play/Pause, Schritt, Tempo, Abbrechen, Fortschritt, Erklärtext `aria-live`) | FR-9, FR-10 |
| Sicherheitsprüfung | `SecurityDialog` (Befunde nach Schwere, Klick hebt Gerät hervor) | FR-19 |
| Tutorial mit Personas | `TutorialCard` (Avatar, Schritt x/y, Vor/Zurück) | FR-20 |
| Herausforderungen | `ChallengePanel` (Aufgabe, Symptome, Status gelöst) | FR-21 |
| Speichern und Laden | `LibraryDialog` (lokal gespeicherte Topologien) | FR-5 |
| Vorlagen | `TemplatesDialog` (Presets + Vorlagen-Bibliothek) | FR-2 |
| Tastaturkürzel | `ShortcutsDialog` | FR-22 |
| Konnektor/TI-Gateway-Hinweis | `ExclusionDialog` | FR-4 |
| — (neu) | `ImportDialog`, `ShareDialog`, `ImpressumDialog` | FR-5, D19, D24 |

### Design-Tokens und Stile

- **Basis:** `design/mockup/_ds/organic-…/styles.css` wird zu
  `src/styles/tokens.css` (Farben, Rampen, Abstände, Radien, Schatten).
- **Dunkelmodus:** die Überschreibungen aus dem Mockup
  (`renderVals`, `darkVars`) als `:root[data-theme="dark"]`; Standard
  folgt `prefers-color-scheme`, umschaltbar in der Kopfleiste.
- **Kategorien:** Farbe hell/dunkel und Form aus dem Mockup (`CAT`):
  Primärsysteme rund, Smartcards Pille, Kartenterminals mit Kerbe,
  Netzwerk eckig, Fachdienste Sechseck. Neue Kategorien (Zentrale Dienste,
  Versicherte) bekommen eigene Form und Farbe aus der Okabe-Ito-Palette.
- **Kanten:** Farbe, Strichstärke und Strichmuster je Verbindungsart aus
  dem Mockup (`EDGEKIND`); Status nie nur über Farbe (D10).
- **Fokus:** `--tiv-focus`, 3 px Rahmen, auf allen bedienbaren Elementen.
- **Bewegung:** Paket-Animation und Puls nur ohne
  `prefers-reduced-motion`.
- **Prüfung:** ein Test berechnet die Kontraste aller Text-/Hintergrund-
  Paare der Tokens (WCAG AA).

### Tablet und kleine Bildschirme

- Ab < 1100 px: Palette und Detailpanel werden Überlagerungen statt
  fester Spalten.
- Unter 700 px: Hinweis, dass der Baukasten für größere Bildschirme
  gedacht ist; Vorlagen lassen sich trotzdem ansehen und abspielen.

## Katalog (Fachdaten, FR-12)

```
catalog/
  active.json                { "version": "1" }
  1/
    meta.json                Version, Datum, Notiz
    categories.json          Kategorien mit Farbe, Form, Reihenfolge
    device-types.json        Regelwerk 1 (inkl. Modus, Icon, Anschlüsse)
    port-kinds.json          Regelwerk 2.1, 2.3
    connection-rules.json    Erlaubnisliste, Regelwerk 4.2
    reason-rules.json        Begründungsliste, Regelwerk 4.3
    base-checks.json         Grundprüfungen, Regelwerk 4.1
    exclusion-rules.json     Regelwerk 4.4
    protocols.json           Protokolle und Kantenbeschriftungen, Regelwerk 3
    actions.json             Aktionen mit Voraussetzungen, Regelwerk 6
    flows.json               Abläufe mit Schritten und Erklärtexten, Regelwerk 7
    config-defaults.json     Einstellungen und Standardwerte, Regelwerk 8
    checks.json              Prüfregeln, Regelwerk 9
    challenges.json          Herausforderungen, Regelwerk 10
    presets.json             Presets, Regelwerk 13
    tutorial.json            Tutorial-Schritte und Personas
    glossary.json            Begriffe aus dem Mockup-Glossar
    sources.json             Quellen-IDs → Links (aus quellen.md)
```

- Jeder Eintrag mit fachlichem Inhalt trägt `source` (Verweis auf
  `sources.json`) und `status` (bestätigt, plausibel, Vereinfachung).
  Das Detailpanel zeigt die Quelle an; das macht die App für die
  Bachelorarbeit nachvollziehbar.
- Prüfregeln und Voraussetzungen sind als kleine, deklarative Ausdrücke
  beschrieben (z. B. `{ "card": "hba", "unlocked": true }`), die die
  Engine auswertet. Kein ausführbarer Code im JSON.
- Ein Vitest-Test prüft Schemas und Referenzen (jede Regel zeigt auf
  existierende Typen, Anschlüsse, Protokolle, Quellen).

## Speichern, Dateien und Teilen

### Was gespeichert wird

| Daten | Inhalt | Wo |
|---|---|---|
| **Topologie** | Geräte, Positionen, Kanten mit Anschlüssen, Zonen, gesteckte Karten mit Ablaufdatum und PIN-Status, Geräteeinstellungen, Störungen, Beschreibung | IndexedDB, Datei, Link |
| **Einstellungen** | Hell/Dunkel/System, Modus Einfach/Erweitert, Simulationstempo, angepinnte Panels, Animationen reduzieren, Tutorial-Fortschritt, gelöste Herausforderungen | IndexedDB, Datei |
| **Arbeitsstand** | Einstellungen + alle eigenen Topologien | Datei |

Der aktuelle Stand wird automatisch in IndexedDB gesichert (Autosave),
damit ein Neuladen nichts verliert. Benannte Topologien legt der Nutzer
im Dialog „Speichern und Laden“ an.

### Dateiformat `.tiv.json`

```json
{
  "format": "ti-visualizer",
  "kind": "topology",
  "schemaVersion": 1,
  "catalogVersion": "1",
  "exportedAt": "2026-11-04T10:00:00Z",
  "data": {
    "name": "Arztpraxis mit CardLink",
    "description": "Praxis mit Konnektor im Parallelbetrieb",
    "nodes": [
      { "id": "kt1", "type": "kt", "x": 120, "y": 80,
        "cards": [{ "kind": "smcb", "expires": "2028-06-30", "unlocked": true }],
        "config": { "ip": "192.168.10.13", "paired": true } }
    ],
    "edges": [{ "id": "e1", "a": "kt1", "portA": "lan0", "b": "sw1", "portB": "p1" }],
    "zones": [{ "id": "z1", "label": "Praxisnetz", "x": 0, "y": 0, "w": 600, "h": 400, "tone": "accent-2" }]
  }
}
```

- `kind`: `topology`, `settings` oder `workspace` (Arbeitsstand mit
  `settings` und `topologies[]`).
- Ein Schema (Zod) für alle drei Arten; derselbe Code prüft Dateien,
  Links und die Vorlagen-Bibliothek.
- **Migration:** ältere `schemaVersion` laufen durch eine
  Migrationskette. Weicht `catalogVersion` ab, wird gegen den aktuellen
  Katalog geprüft; Verstöße werden gemeldet und markiert, nicht
  stillschweigend entfernt.

### Wege zu einem anderen Browser oder zu Dritten (D24)

| Weg | So funktioniert es | Geeignet für |
|---|---|---|
| **1. Datei** | „Exportieren“ erzeugt eine `.tiv.json`. Chrome/Edge: Speichern-Dialog über die File System Access API, erneutes Speichern in dieselbe Datei möglich. Firefox/Safari: normaler Download. Öffnen per „Importieren“, Drag & Drop auf die Canvas oder Dateiauswahl | Weitergabe per E-Mail, Moodle, USB; eigener Arbeitsstand auf einem anderen Rechner |
| **2. Vorlagen-Bibliothek** | Dateien in `public/vorlagen/` mit einer `index.json` (Titel, Beschreibung, Schwierigkeit, Tags). Der Dialog „Vorlagen“ listet sie neben den Presets. Neue Vorlagen kommen per Pull Request ins Repo; die CI prüft sie (D5) | Kuratierte Vorlagen für alle Besucher, z. B. Lehrbeispiele zur Bachelorarbeit |
| **3. Link** | „Teilen“ komprimiert die Topologie mit `lz-string` ins URL-Fragment: `…/ti-visualizer/#t=…`. Wer den Link öffnet, sieht eine Vorschau und übernimmt sie mit einem Klick. Zusätzlich lädt `?vorlage=<URL>` eine `.tiv.json` von einer fremden Adresse (z. B. GitHub Gist), nach Bestätigung | Schnelles Teilen ohne Datei; Vorlagen außerhalb des Repos |

Grenzen beim Link: Ab etwa 8 KB komprimiert empfiehlt die App die Datei
statt des Links. Das Laden von fremden Adressen klappt nur, wenn der
Server es erlaubt (CORS); GitHub Gist und `raw.githubusercontent.com`
erlauben es. Einstellungen werden nie per Link übertragen, nur Topologien.

### Sicherheit beim Öffnen fremder Dateien und Links

- Jede Datei und jeder Link läuft durch das Zod-Schema; unbekannte Felder
  werden verworfen, unbekannte Gerätetypen gemeldet.
- Größenlimit 1 MB pro Datei.
- Texte (Namen, Beschreibungen) werden nur als Text angezeigt, nie als
  HTML.
- Fremde Inhalte ersetzen den aktuellen Stand nie ohne Rückfrage; vorher
  wird der aktuelle Stand automatisch gesichert.
- `?vorlage=` zeigt vor dem Laden die Herkunftsadresse an.

## Presets (Standardausstattung)

Verbindlich ist [Regelwerk, Abschnitt 13](./regelwerk.md#13-presets).
Presets liegen im Katalog (`presets.json`) und nutzen dasselbe
Topologie-Schema wie Dateien.

| Preset | Kurzfassung |
|---|---|
| Arztpraxis | PVS, Konnektor, 2 Kartenterminals (SMC-B, HBA, eGK), Switch, VPN-Zugangsdienst, sechs Fachdienste |
| Apotheke | AVS, Konnektor, 1 Kartenterminal (SMC-B, eGK), Switch, VPN-Zugangsdienst, IDP, E-Rezept, ePA |
| Krankenhaus | KIS, 2 PCs, **TI-Gateway**, 2 Kartenterminals, Switches, Router, VPN-Zugangsdienst, sechs Fachdienste |
| Klinikum | KIS, RIS, LIS, PCs, Tablet, **Highspeed-Konnektor**, 3 Kartenterminals, Switches, AP, Router, Zonen, sechs Fachdienste |

## Regel-Engine (FR-3, FR-4, FR-14)

`validateConnection(topology, a, portA?, b, portB?, catalog) → { ok, reason?, ruleId? }`

Umsetzung der Prüflogik aus [Regelwerk 4.0](./regelwerk.md#40-prüflogik-entschieden-2026-11-03):

1. Grundprüfungen (Selbstverbindung, Doppelung, freier verträglicher
   Anschluss, Kartenterminal an höchstens einem Konnektor) und
   Ausschlüsse (Konnektor/TI-Gateway). Schlägt eine fehl: ungültig.
2. Steht das Paar in der Erlaubnisliste (für den aktuellen Modus)? Dann
   gültig.
3. Sonst ungültig; `reason` ist der Text der passenden Begründungsregel
   oder die allgemeine Meldung mit den erlaubten Partnern.

Im Modus Einfach wählt `autoPorts` das erste freie, verträgliche
Anschlusspaar; im Modus Erweitert öffnet sich der `PortPicker`.

## Aktions- und Simulations-Engine (FR-6 bis FR-10, FR-18)

- **Verfügbarkeit:** `availableActions(node, topology, catalog)` liefert
  alle Aktionen des Gerätetyps mit `enabled` und `disabledReason`.
  Voraussetzungen werden über den **verbundenen Pfad** geprüft
  (Regelwerk 6), inklusive Kartenzustand, Störungen und, im Modus
  Erweitert, der Prüfregeln, die den Pfad unterbrechen (z. B. fehlende
  TI-Route).
- **Pfadauflösung:** Suche über die Kanten vom auslösenden Gerät. Bei
  `pathKind: local` (NFDM/eMP) über den Konnektor bis zur eGK, ohne VPN
  und Fachdienst.
- **Abspielen:** Schritte aus `flows.json` werden auf den Pfad gebunden.
  Zustandsautomat `idle → running(n) ⇄ paused → done | cancelled`;
  Play/Pause, Schritt vor/zurück, Tempo, Abbrechen.
- **Sicherheitsprüfung:** `runChecks(topology, mode)` liefert Befunde
  nach Regelwerk 9; dieselbe Funktion erkennt gelöste Herausforderungen.

## CI/CD-Pipeline und Deployment (D8, D26, D27)

Übersicht als Diagramm: [architektur.md, Abschnitt 5](./architektur.md#5-cicd-pipeline).

### Workflows

| Datei | Auslöser | Zweck |
|---|---|---|
| `.github/workflows/ci.yml` | Pull Request, Push auf jeden Branch | Stufen 1 bis 5; Ergebnis als Status-Check am PR |
| `.github/workflows/deploy.yml` | Push auf `main` (nach Merge), manuell | Stufen 1 bis 5, danach Stufe 6 Deployment |
| `.github/workflows/nightly.yml` | täglich nachts | volle E2E-Suite in allen Browsern, Abhängigkeitsprüfung |
| `.github/dependabot.yml` | wöchentlich | Updates für npm-Pakete und Actions |

Gemeinsame Schritte liegen in einem wiederverwendbaren Workflow
(`.github/workflows/_pipeline.yml`, `workflow_call`), damit CI und Deploy
garantiert dasselbe prüfen.

### Stufen

| Stufe | Job | Inhalt | Bricht ab, wenn |
|---|---|---|---|
| 1 | `static` | `pnpm install --frozen-lockfile` · ESLint · Prettier-Check · `tsc --noEmit` | Lint- oder Typfehler |
| 2 | `unit` | Vitest mit Coverage (`@vitest/coverage-v8`, Bericht `lcov`), Katalog- und Vorlagen-Validierung, Regel-Tests (D18), Kontrastprüfung der Tokens | ein Test fehlschlägt oder Coverage der Engines unter 90 % bzw. gesamt unter 80 % |
| 3 | `sonar` | SonarQube-Cloud-Analyse mit dem Coverage-Bericht aus Stufe 2; Quality Gate wird abgewartet | Quality Gate rot |
| 3b | `ai-review` | nur bei Pull Requests: KI-Review nach `.github/review-richtlinien.md`, Ergebnis als PR-Kommentar | bricht nie ab (nur Hinweise) |
| 4 | `build` | `vite build` mit `BASE_PATH=/ti-visualizer/`; Prüfung der Bundle-Größe; `dist/` als Artefakt | Build-Fehler oder Haupt-Bundle > 500 KB (gzip) |
| 5 | `e2e` | Playwright gegen `vite preview` mit dem Build aus Stufe 4; Axe-Checks; Tastatur-Durchlauf; Export/Import zwischen zwei Browser-Kontexten | ein E2E- oder Axe-Test fehlschlägt |
| 6 | `deploy` | nur in `deploy.yml`: `actions/upload-pages-artifact` mit `dist/`, `actions/deploy-pages`, danach Smoke-Test gegen die öffentliche Adresse | Upload, Deploy oder Smoke-Test schlägt fehl |

Stufe 1 läuft zuerst; 2, 3b und 4 laufen parallel; 3 wartet auf 2, 5 auf 4.
Deploy startet nur, wenn alle anderen Jobs grün sind.

### Sonar-Prüfung (D27)

- **Dienst:** SonarQube Cloud, Organisation `jurie2000`, Projekt
  `jurie2000_ti-visualizer`. Kostenlos, solange das Repo öffentlich ist.
- **Einbindung:** offizielle Action `SonarSource/sonarqube-scan-action`
  (Version gepinnt) mit `SONAR_TOKEN` als Repository-Secret;
  `sonar.qualitygate.wait=true`, damit der Job auf das Ergebnis wartet.
- **Konfiguration** in `sonar-project.properties`:
  - `sonar.sources=src`, `sonar.tests=src,tests`,
    `sonar.test.inclusions=**/*.test.ts,**/*.test.tsx,tests/**`
  - `sonar.javascript.lcov.reportPaths=coverage/lcov.info`
  - `sonar.exclusions=design/**,catalog/**,public/**`
- **Quality Gate „Sonar way“** für neuen Code: keine neuen Bugs und
  Schwachstellen, Security Hotspots geprüft, Coverage auf neuem Code
  ≥ 80 %, Duplikate ≤ 3 %.
- **Pull Requests:** Sonar kommentiert Befunde direkt im PR (PR-Decoration).
- **Ergänzend:** GitHub CodeQL für JavaScript/TypeScript und
  `pnpm audit` im Nightly; Dependabot hält Abhängigkeiten aktuell.

### KI-Review (D29)

- **Werkzeug:** offizielle Claude Code GitHub Action von Anthropic
  (`anthropics/claude-code-action`, Version gepinnt), Modell Opus.
- **Auslöser:** automatisch bei geöffnetem oder aktualisiertem Pull
  Request, wenn Dateien in `src/`, `catalog/`, `public/vorlagen/` oder
  `specs/` geändert sind; zusätzlich auf Zuruf mit `@claude` in einem
  PR-Kommentar.
- **Prüfpunkte** in `.github/review-richtlinien.md`, mit Fokus auf das,
  was Sonar und Tests nicht sehen:
  - Stimmt die Änderung mit Spec und Regelwerk überein (Regel-IDs,
    Voraussetzungen, Abläufe)?
  - Hat jede neue oder geänderte Regel einen Testfall (D18)?
  - Hat jeder neue Katalogeintrag `source` und `status`?
  - Werden Zustände nie nur über Farbe angezeigt, ist alles per Tastatur
    bedienbar (D10)?
  - Werden fremde Dateien und Links durch das Schema geprüft und Texte
    nie als HTML ausgegeben?
  - Nennt der Pull Request die Task-ID?
  - Stil, Formatierung und allgemeine Codequalität sind **nicht**
    Aufgabe des KI-Reviews (das machen ESLint, Prettier, Sonar).
- **Ausgabe:** ein zusammenfassender PR-Kommentar plus Inline-Kommentare
  an den betroffenen Zeilen, auf Deutsch, Befunde nach Schwere sortiert.
- **Kein Pflicht-Check:** Der Job ist im Branch-Schutz nicht als
  erforderlich eingetragen. Über den Merge entscheidet ein Mensch.
- **Sicherheit:**
  - `ANTHROPIC_API_KEY` als Repository-Secret.
  - Automatischer Lauf nur für Pull Requests aus diesem Repo. Pull
    Requests aus Forks bekommen kein Secret und laufen nur nach
    manueller Freigabe (Umgebung mit erforderlicher Freigabe).
  - Rechte des Jobs minimal: Lesen des Codes, Schreiben nur von
    PR-Kommentaren; die KI darf keine Commits pushen und nicht mergen.
- **Kosten begrenzen:** Pfadfilter, maximale Laufzeit und Zugzahl pro
  Lauf, kein Lauf bei Entwurfs-PRs.
- **Auswertung für die Bachelorarbeit:** Befunde je PR werden mit Label
  „KI-Befund übernommen“ bzw. „verworfen“ markiert; so lässt sich am Ende
  zeigen, welchen Anteil der KI-Review hatte.

### Unit- und Komponententests

- **Vitest** für Engines, Schemas, Persistenz (mit `fake-indexeddb`) und
  Stores.
- **React Testing Library** für Komponenten mit Logik (Kontextmenü,
  PortPicker, SimPlayer, Import-Dialog).
- Tests liegen neben dem Code (`*.test.ts`), Testdaten-Topologien in
  `src/test/fixtures/`.

### Build-Test

- Produktions-Build mit genau der `BASE_PATH`, die auch deployt wird.
- Prüfungen nach dem Build: `dist/index.html` existiert, alle Assets
  liegen unter `/ti-visualizer/`, `dist/vorlagen/index.json` ist gültig,
  Bundle-Größe unter der Grenze (`size-limit`).

### End-to-End-Tests mit Playwright

| Suite | Inhalt | Browser in CI | Browser nightly |
|---|---|---|---|
| `smoke` | App lädt, Startansicht, Preset öffnen | Chromium | alle |
| `build-and-connect` | Gerät ergänzen, gültig und ungültig verbinden, Begründung sichtbar | Chromium | alle |
| `actions-sim` | Kontextmenü, ausgegraute Aktion, Simulation abspielen und abbrechen | Chromium | alle |
| `share` | Export in Kontext A → Import in neuem Kontext B; Link `#t=…` in neuem Kontext; Einstellungen-Datei | Chromium, Firefox | alle |
| `a11y` | Axe auf Hauptansichten und Dialogen, Durchlauf nur per Tastatur | Chromium | alle |
| `visual` | Screenshots Hell/Dunkel der Hauptansichten | – | Chromium (Vergleich mit Referenzbildern) |

- Bei Fehlern lädt die Pipeline Trace, Video und Screenshots als
  Artefakt hoch.
- Nach dem Deploy prüft ein `smoke`-Lauf die öffentliche Adresse.

### Branch-Schutz und Ablauf

- `main` ist geschützt: Merge nur per Pull Request, Pflicht-Checks
  `static`, `unit`, `sonar`, `build`, `e2e`. Der KI-Review (`ai-review`)
  läuft mit, ist aber kein Pflicht-Check.
- Arbeitsweise: Branch je Task (`task/T-xxx-…`), PR mit Task-ID,
  Merge nach grünen Checks; Deploy läuft danach automatisch.

### GitHub Pages

- **Adresse:** `https://jurie2000.github.io/ti-visualizer/`.
- **Vite `base`:** aus `BASE_PATH`, Standard `/ti-visualizer/`; eigene
  Domain später über `CNAME` und `base: '/'`.
- **Vorlagen:** `public/vorlagen/` wird mit ausgeliefert.
- **Caching:** JS/CSS mit Hash; `index.html` und `vorlagen/index.json`
  ohne Hash.
- **Kein Server-Routing nötig** (D14).
- **Einmalig:** Repo öffentlich stellen; *Settings → Pages → Source:
  GitHub Actions*; Umgebung `github-pages` nur für `main`; SonarQube
  Cloud mit dem Repo verbinden und `SONAR_TOKEN` hinterlegen;
  `ANTHROPIC_API_KEY` als Secret anlegen und die Claude GitHub App
  installieren;
  Branch-Schutz für `main` einrichten.

## Barrierefreiheit (D10)

**Rot-Grün-Schwäche**
- Zustände (gültig/ungültig, aktiv/ausgegraut, läuft/fertig, Befund-
  Schwere) nie allein über Farbe: zusätzlich Icon, Muster oder
  Linienstil und Text.
- Farbpalette farbenblind-sicher (Okabe-Ito), Kategorien zusätzlich mit
  eigener Form.
- Kontrast nach WCAG AA, automatisch geprüft.

**Tastaturbedienung**
- Alles ohne Maus erreichbar: Palette, Knoten, Kanten, Kontextmenü,
  Panels, Player, Dialoge.
- Gerät hinzufügen per Enter, Verbinden per Quelle/Ziel-Auswahl,
  Kontextmenü per Menütaste oder Shift+F10, Knoten verschieben mit
  Pfeiltasten, Esc schließt.
- Simulation: Leertaste Play/Pause, Pfeiltasten Schritt, Esc Abbrechen;
  Erklärtext als `aria-live`.
- Semantik: Rollen und Labels für Knoten und Kanten.

Tests: Axe in Playwright, ein E2E-Durchlauf nur per Tastatur.

## Abdeckung der Anforderungen

| FR | Umsetzung |
|---|---|
| FR-1 | `Palette` aus `device-types` und `categories`, Suche |
| FR-2 | `StartScreen`, `TemplatesDialog`, `presets.json`, Vorlagen-Bibliothek |
| FR-3, FR-4 | React-Flow-Verbinden, `validateConnection`, `Toast` mit Begründung |
| FR-5 | IndexedDB, Datei `.tiv.json`, Link |
| FR-6, FR-7 | `availableActions`, `ContextMenu` mit ausgegrauten Einträgen |
| FR-8 | Pfadsuche, `pathKind` |
| FR-9, FR-10 | `SimPlayer`, Zustandsautomat |
| FR-11 | `DetailPanel` aus `protocols` und `sources` |
| FR-12 | Katalog in `catalog/`, `schemaVersion`, Migrationen |
| FR-13 | `ModeSwitch`, Modus-Feld in Katalog und Erlaubnisliste |
| FR-14 | Anschlüsse in `device-types`, `PortPicker`, `autoPorts` |
| FR-15 | `ZoneNode` |
| FR-16 | Undo/Redo (D25), Kopieren/Einfügen, automatisch anordnen, Minimap, Einpassen |
| FR-17 | Einstellungen im `DetailPanel`, `config-defaults.json` |
| FR-18 | `CardChip`, `PlugCardDialog`, Störung per Kontextmenü |
| FR-19 | `runChecks`, `SecurityDialog` |
| FR-20 | `TutorialCard`, `tutorial.json` |
| FR-21 | `ChallengePanel`, `challenges.json`, Status in den Einstellungen |
| FR-22 | `ThemeToggle`, `ShortcutsDialog` |

## Teststrategie

- **Katalog und Vorlagen (Vitest):** Schemas, Referenzen, Quellenangaben
- **Regel-Engine:** ein Testfall je Regel (D18), Konsistenztest
  Erlaubnis- gegen Begründungsliste
- **Aktionen:** je Aktion eine Topologie, in der sie aktiv ist, und eine,
  in der sie mit der erwarteten Begründung ausgegraut ist
- **Simulation:** Schrittfolge je Ablauf, Abbruch, `local` ohne VPN und
  Fachdienst
- **Prüfregeln:** je Regel ein positiver und ein negativer Fall; jede
  Herausforderung ist lösbar und wird als gelöst erkannt
- **Persistenz:** Roundtrip IndexedDB; Export/Import je `kind`;
  Link-Roundtrip; kaputte und zu große Dateien werden mit Meldung
  abgelehnt; Migration alter `schemaVersion`
- **Barrierefreiheit:** Axe, Tastatur-E2E, Kontraste der Tokens
- **E2E (Playwright):** Preset laden → Gerät ergänzen → ungültig
  verbinden → Aktion → Simulation abbrechen; Export in Browser A →
  Import in neuem Browser-Kontext B (simuliert „anderer Browser“);
  Link öffnen in neuem Kontext
- **Optischer Abgleich:** Screenshots der Hauptansichten im Vergleich
  zu `design/mockup/screenshots/` (manuelle Abnahme), danach als
  Referenzbilder für die `visual`-Suite
- **Wo die Tests laufen:** siehe Abschnitt „CI/CD-Pipeline und
  Deployment“

## Umsetzungsphasen (Grundlage für `tasks.md`)

| Phase | Inhalt | Ergebnis |
|---|---|---|
| P0 | Grundgerüst: Vite, React, TS, Lint, Vitest, Tokens, Schriften, App-Shell mit Impressum; **komplette Pipeline** (Stufen 1–6, Sonar, KI-Review, Playwright-Smoke, Branch-Schutz) | Leere App öffentlich erreichbar, jede Änderung läuft durch die Pipeline |
| P1 | Zod-Schemas, Katalog aus dem Regelwerk, Regel-Engine, Tests | Regeln vollständig getestet |
| P2 | Palette, Canvas, Knoten und Kanten im Mockup-Stil, Verbinden mit Begründung, Startansicht, Presets | Topologien bauen |
| P3 | IndexedDB, Datei-Export/-Import, Arbeitsstand, Einstellungen, Vorlagen-Bibliothek, Link-Teilen | Austausch mit anderen Browsern |
| P4 | Kontextmenü, Aktionen, Pfade, Simulation, Detailpanel | Abläufe abspielen |
| P5 | Modus Erweitert: Anschlüsse, Einstellungen, Zonen, Editor-Hilfen, Sicherheitsprüfung | Erweiterte Ansicht |
| P6 | Tutorial, Herausforderungen | Lernfunktionen |
| P7 | Barrierefreiheit-Feinschliff, Tablet-Layout, E2E, optische Abnahme | Release v1 |

## Risiken und offene Punkte

- [x] Visuelles Konzept: Mockup in `design/mockup/`.
- [x] Aktionsvoraussetzungen: [Regelwerk 6](./regelwerk.md#6-aktionen-und-voraussetzungen).
- [x] Lizenz: MIT (D19).
- [ ] Inhalte je Ablauf (Erklärtexte) fachlich abnehmen.
- [ ] Zielbrowser: aktuelle Chrome, Edge, Firefox, Safari. File System
  Access API nur in Chrome/Edge; Firefox/Safari nutzen Download/Upload.
- [ ] Impressum: Anschrift vor dem öffentlichen Start klären.
- [ ] Vor dem Öffentlichstellen: Git-Historie auf private Daten prüfen.
- [ ] Vorlagen-Bibliothek: Wer darf Vorlagen beitragen (nur Justin oder
  auch Dritte per Pull Request)?
- **Risiko:** Daten in IndexedDB gehen beim Löschen der Browserdaten
  verloren. Gegenmittel: Hinweis in der App, Export als Arbeitsstand.
- **Risiko:** Lange Links werden von manchen Messengern abgeschnitten.
  Gegenmittel: Größengrenze, Empfehlung der Datei.
- **Risiko:** `?vorlage=` hängt von CORS der fremden Adresse ab.
  Gegenmittel: verständliche Fehlermeldung, Hinweis auf Datei-Import.
- **Risiko:** Katalogänderungen brauchen einen neuen Build; per Actions
  ist das ein Push auf `main`.
- **Risiko:** SonarQube Cloud ist nur für öffentliche Repos kostenlos.
  Bleibt das Repo privat, entfällt Stufe 3 oder läuft lokal per
  SonarQube Community Build in Docker.
- **Risiko:** Der KI-Review kostet API-Guthaben pro Pull Request und
  kann falsche Befunde liefern. Gegenmittel: Pfadfilter, Laufzeitgrenze,
  nur Kommentar statt Pflicht-Check, Entscheidung beim Menschen.
- **Risiko:** E2E-Tests in drei Browsern verlängern die Pipeline.
  Gegenmittel: in CI nur Chromium (Firefox für `share`), alle Browser
  nightly.

## Nächster Schritt

`tasks.md` aus den Phasen P0 bis P7 ableiten (Task-ID, Bezug auf FR und
Regel-ID, Testkriterium). Erster Task: P0, damit die leere App früh
öffentlich erreichbar ist.
