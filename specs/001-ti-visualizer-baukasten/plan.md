# Plan 001: TI Visualizer, interaktiver Netzwerk-Baukasten

**Status:** Entwurf, überarbeitet am 2026-11-04: UI-Konzept nach dem
Mockup, Speichern über Dateien, Deployment auf
GitHub Pages. Zur Freigabe durch Justin.
**Basis:** [spec.md](./spec.md) (in Überarbeitung),
[regelwerk.md](./regelwerk.md), Mockup in `design/mockup/`

## Leitentscheidungen

| # | Entscheidung | Begründung |
|---|---|---|
| D1 | **Reines Frontend** (TypeScript, React), **kein Backend** | Vom Nutzer festgelegt (2026-11-03). Fachdaten sind rein lesend und klein. |
| D2 | **Fachdaten als versionierte JSON-Dateien** in `catalog/`, beim Build ins Frontend gebündelt | Vom Nutzer gewünscht. Versionierung über Git und Versionsverzeichnis. |
| D3 | **Es gibt eine Rolle: den Benutzer.** Gespeicherte Topologien und Einstellungen liegen als **Datei** (`.tiv.json`) beim Benutzer und lassen sich in jedem Browser öffnen, unabhängig von Cache, Cookies oder Browser-Speicher. IndexedDB dient nur als Autosave (Abschnitt „Speichern und Dateien“) | Vom Nutzer festgelegt (2026-11-04). Kein Konto und kein Server nötig, die Datei ist der verlässliche Speicherort. |
| D4 | Die Regel-Engine ist **datengetrieben**: Regeln, Aktionen, Abläufe, Prüfregeln stehen als JSON | Änderungen am Regelwerk brauchen ein Daten-Update statt Code. |
| D5 | **Validierung zur Build-Zeit**: Katalog und Presets werden in der CI gegen ihre Schemas geprüft. Bei Fehlern wird nicht deployt | Fehlerhafte Daten erreichen nie die öffentliche Seite. |
| D6 | **React Flow** (xyflow) als Canvas | Knoten als React-Komponenten, eigene Kanten mit Label und Paket-Animation, `isValidConnection` für die Regel-Engine, Tastatur und Kontextmenü möglich. |
| D7 | Simulation ist ein **abgespielter Ablauf aus Schritten**, keine Protokollimplementierung | Lernzweck. |
| D8 | **Öffentliches Deployment auf GitHub Pages** per GitHub Actions bei Push auf `main` | Vom Nutzer festgelegt. Repo wird öffentlich. |
| D9 | **Nur Deutsch** in v1, Texte im Katalog bzw. in einer Textdatei, nicht im Code verstreut | Vom Nutzer festgelegt. |
| D10 | **Barrierefreiheit**: Rot-Grün-Schwäche und volle Tastaturbedienung | Vom Nutzer festgelegt. |
| D11 | **Das Mockup ist die visuelle Vorlage**, nicht der Code: Layout, Tokens, Formen, Kantenstile und Zustände werden nachgebaut. `support.js`, `image-slot.js` und die Mockup-Logik werden nicht übernommen | Die Mockup-Logik weicht vom Regelwerk ab (Verbotsliste, Rollenbindung, Grenzwerte). Fachlich gilt das Regelwerk. |
| D12 | **Karten sind Zustand des Kartenterminals**, keine eigenen Knoten | Entschieden 2026-11-03 (Regelwerk K-1, K-2). |
| D13 | **Zod-Schemas** als einzige Quelle für Katalog-, Datei- und Topologie-Format | Laufzeitprüfung beim Öffnen von Dateien und TypeScript-Typen aus einer Quelle. |
| D14 | **Single-Page-App ohne Router**, keine Inhalte über die URL | GitHub Pages kennt kein Server-Routing. Mit nur einer Ansicht entfallen 404-Probleme. |
| D15 | Kanten sind **ungerichtet** und verbinden zwei **Anschlüsse** (Regelwerk 2) | Spec FR-14. |
| D16 | Katalog-JSON wird **von Claude aus Spec und Regelwerk abgeleitet** und von Justin geprüft | Maßgeblich bleiben Spec und Regelwerk. |
| D17 | Katalog, Engines und Persistenz starten unabhängig von der UI | Parallel umsetzbar. |
| D18 | **Jede Regel des Regelwerks ist ein eigener Testfall** | Erfolgskriterium der Spec. |
| D19 | **MIT-Lizenz** und **Impressum** mit Verweis auf die Bachelorarbeit. Die App verlinkt das Impressum dauerhaft im Fußbereich | Vom Nutzer festgelegt. |
| D20 | **Design-System „Organic“** aus dem Mockup als CSS-Variablen (`tokens.css`), Komponenten mit **CSS Modules**, ohne UI-Framework | Das Mockup bringt fertige Tokens für Hell und Dunkel mit. Ein Framework wie MUI würde die Optik überdecken. |
| D21 | **Schriften selbst ausgeliefert** (`@fontsource/figtree`, `@fontsource/caprasimo`) statt Google Fonts | Beim Seitenaufruf gehen keine Anfragen an Dritte. Das vereinfacht den Datenschutzhinweis. |
| D22 | **Icons aus Lucide** (`lucide-react`, ISC-Lizenz), ergänzt um wenige eigene SVGs | Die Icon-Pfade im Mockup stammen aus dieser Familie. |
| D23 | **Eine Datei `.tiv.json` enthält immer eine Topologie, Einstellungen nur optional dazu.** Einstellungen werden nie allein gespeichert. Beim Speichern sind sie per Häkchen „Einstellungen mitspeichern“ wählbar (Standard aus). Beim Öffnen wird nur die Topologie übernommen. Enthält die Datei Einstellungen, fragt die App, ob sie übernommen werden sollen (Standard nein) | Vom Nutzer festgelegt (2026-11-04). Weitergegebene Dateien bringen nie ungefragt fremden Tutorial-Fortschritt, gelöste Herausforderungen oder eine fremde Ansicht mit. Eigene Einstellungen lassen sich trotzdem auf ein anderes Gerät mitnehmen. |
| D24 | **Weitergeben nur als Datei.** Kein Link mit Topologie, keine Vorlagen-Bibliothek in v1 | Vom Nutzer festgelegt (2026-11-04). Ein einziger Weg ist einfacher zu bauen, zu testen und abzusichern. Die Datei lässt sich per E-Mail, Moodle oder USB weitergeben. |
| D25 | **Undo/Redo** im Topologie-Store (Verlauf mit 80 Schritten, wie im Mockup) | FR-16. |
| D26 | **CI/CD-Pipeline mit GitHub Actions** in festen Stufen: Statische Prüfung → Unit-Tests mit Coverage → Sonar-Analyse mit Quality Gate → Build-Test → E2E-Tests mit Playwright → Deployment | Vom Nutzer gewünscht (2026-11-04). Nur was alle Stufen besteht, wird veröffentlicht. |
| D27 | **SonarQube Cloud** (ehemals SonarCloud) für Codequalität, Sicherheit und Coverage | Für öffentliche Repos kostenlos, direkt mit GitHub verbunden, kommentiert Pull Requests. |
| D28 | **Architekturdiagramme als Mermaid** in [architektur.md](./architektur.md) | GitHub zeigt Mermaid direkt an. Diagramme liegen versioniert als Text neben dem Plan. |
| D29 | **KI-Review am Pull Request** mit der Claude Code GitHub Action (Modell Opus), nur als Kommentar, **kein Pflicht-Check** | Vom Nutzer gewünscht (2026-11-04). Prüft Spec- und Regelwerk-Treue, was Sonar und Tests nicht abdecken. Macht den KI-gestützten Entwicklungsprozess für die Bachelorarbeit auswertbar. |
| D30 | **Rückverfolgbarkeit Regel → Test → Katalog wird automatisch geprüft** (Skripte in der CI) | Erzwingt D18 und hält Regelwerk und Katalog synchron. Liefert einen Nachweis für die Bachelorarbeit. |
| D31 | **Testqualität wird zusätzlich zur Coverage gemessen**: Property-based Tests (`fast-check`) und Mutation-Testing (StrykerJS) für die Engines | Coverage zeigt nur, welcher Code läuft, nicht ob Tests Fehler finden. |
| D32 | **Architekturregeln werden erzwungen** (`dependency-cruiser`) | Die Schichten aus [architektur.md](./architektur.md) bleiben getrennt. Engines bleiben ohne React testbar. |
| D33 | **Security by Design** nach OWASP: Abhängigkeiten mit SBOM und Schwachstellen-Tracking, statische und dynamische Sicherheitsprüfung, Injection-Tests für alle Eingabewege, abgesicherte Lieferkette | Die App öffnet Dateien von anderen Benutzern (D24) und ist öffentlich erreichbar. |
| D34 | **Speichern nur als Datei, Autosave nur als Sicherheitsnetz**: Der Browser hält ausschließlich den aktuellen Arbeitsstand und die Einstellungen. Es gibt keine Bibliothek gespeicherter Topologien im Browser | Vom Nutzer festgelegt (2026-11-04). Folgt aus D3. Schützt vor Datenverlust durch Neuladen oder Absturz, ohne dass Topologien von Browserdaten abhängen. |
| D35 | **Datenmodell mit Basistypen und Varianten**: gemeinsame Felder in Basistypen (`Element`, `NetConfig`, `Card`), Varianten über ein Unterscheidungsfeld (`kind` bei Karten). Welche Geräte Karten oder Einstellungen haben, legen **Fähigkeiten im Katalog** fest, nicht eine Klasse pro Gerätetyp | Weniger doppelte Felder, ungültige Kombinationen sind schon vom Typ her ausgeschlossen. Fähigkeiten statt Unterklassen halten das Modell datengetrieben (D4). Diagramm: [architektur.md, Abschnitt 3](./architektur.md#3-datenmodell) |

## Technologie-Stack

| Bereich | Wahl |
|---|---|
| Sprache, Build | TypeScript, Vite, pnpm |
| UI | React, React Flow, CSS Modules, `lucide-react`, `@fontsource/*` |
| Zustand | Zustand (Stores für Katalog, Topologie, Oberfläche, Simulation, Einstellungen) |
| Schemas | Zod |
| Speicher | Datei (`.tiv.json`, File System Access API mit Download/Upload als Rückfall), Autosave in IndexedDB über `idb-keyval` |
| Tests | Vitest mit `@vitest/coverage-v8`, Playwright (Chromium, Firefox, WebKit), `@axe-core/playwright` |
| Qualität | ESLint (`typescript-eslint` strict, `jsx-a11y`, `react-hooks`, `no-unsanitized`), Prettier, `tsc --noEmit` (strict), SonarQube Cloud, `dependency-cruiser`, `knip`, `fast-check`, StrykerJS, Lighthouse CI, `size-limit`, `lefthook`, `commitlint` |
| Sicherheit | CodeQL, `gitleaks`, Dependency-Review-Action, `pnpm audit`, OSV-Scanner, CycloneDX-SBOM, OWASP Dependency-Track, OWASP ZAP, OpenSSF Scorecard, Build-Provenienz |
| CI/CD | GitHub Actions, Dependabot, Claude Code GitHub Action (KI-Review) |
| Deployment | GitHub Pages |

## Repo-Layout

```
src/
  app/            App-Shell, Layout, Tastaturkürzel, Startansicht
  ui/             wiederverwendbare Bausteine (Button, Dialog, Menü, Tag, Toast, Panel)
  canvas/         React-Flow-Knoten, -Kanten, Zonen, Minimap, Verbinden
  panels/         Palette, Detailpanel, Simulations-Player, Tutorial, Herausforderungen
  dialogs/        Karte stecken, Öffnen,
                  Sicherheitsprüfung, Tastaturkürzel, Impressum
  engine/         reine TS-Funktionen: Regeln, Pfade, Aktionen, Simulation,
                  Prüfregeln, Konfiguration (ohne React)
  store/          Zustand-Stores
  persistence/    Dateiformat, Speichern/Öffnen, Autosave, Migrationen
  schema/         Zod-Schemas (Katalog, Topologie, Einstellungen, Datei)
  styles/         tokens.css, globale Styles, Kategorie- und Kantenstile
  assets/         Persona-Bilder (WebP), eigene Icons
catalog/          versionierte Fachdaten (siehe Katalog)
tests/e2e/        Playwright-Suiten (smoke, datei, a11y, …)
.github/workflows ci.yml, deploy.yml, nightly.yml, _pipeline.yml
.github/dependabot.yml
.github/review-richtlinien.md   Prüfpunkte für den KI-Review
sonar-project.properties
playwright.config.ts, vitest.config.ts, .size-limit.json
stryker.config.json, .dependency-cruiser.cjs, knip.json, lighthouserc.json
lefthook.yml, commitlint.config.ts
.github/pull_request_template.md, .github/CODEOWNERS
SECURITY.md
.zap/rules.tsv                  begründete Ausnahmen für den ZAP-Scan
scripts/                        check-traceability.ts, check-regelwerk-katalog.ts,
                                metrics.ts
tests/security/                 Injection-Korpus und Sicherheits-E2E
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
│  Persistenz: Datei (.tiv.json) · Autosave                         │
└────────┬─────────────────────────────────────────────────────────┘
         │ lädt beim Start (gleicher Server)
   GitHub Pages: App + Katalog
```

Ausführliche Diagramme (Systemkontext, Bausteine, Speichern und
Öffnen, Simulation, CI/CD): **[architektur.md](./architektur.md)**.

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
│ Rückgängig/Wiederholen │ Öffnen │ Speichern │ Prüfung │ ☾ │ ?                │
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
| Detailpanel | `DetailPanel` (Gerät, Kante, Zone, Protokolltabelle, Einstellungen) | FR-11, FR-17 |
| Simulations-Player | `SimPlayer` (Play/Pause, Schritt, Tempo, Abbrechen, Fortschritt, Erklärtext `aria-live`) | FR-9, FR-10 |
| Sicherheitsprüfung | `SecurityDialog` (Befunde nach Schwere, Klick hebt Gerät hervor) | FR-19 |
| Tutorial mit Personas | `TutorialCard` (Avatar, Schritt x/y, Vor/Zurück) | FR-20 |
| Herausforderungen | `ChallengePanel` (Aufgabe, Symptome, Status gelöst) | FR-21 |
| Speichern und Laden | `OpenDialog` (Datei öffnen oder Preset wählen), Speichern über Strg+S bzw. „Speichern“ | FR-2, FR-5 |
| Tastaturkürzel | `ShortcutsDialog` | FR-22 |
| Konnektor/TI-Gateway-Hinweis | `ExclusionDialog` | FR-4 |
| neu | `ImpressumDialog`, Hinweis „nicht als Datei gespeichert“ | FR-5, D19, D34 |

### Design-Tokens und Stile

- **Basis:** `design/mockup/_ds/organic-…/styles.css` wird zu
  `src/styles/tokens.css` (Farben, Rampen, Abstände, Radien, Schatten).
- **Dunkelmodus:** die Überschreibungen aus dem Mockup
  (`renderVals`, `darkVars`) als `:root[data-theme="dark"]`. Standard
  folgt `prefers-color-scheme`, umschaltbar in der Kopfleiste.
- **Kategorien:** Farbe hell/dunkel und Form aus dem Mockup (`CAT`):
  Primärsysteme rund, Smartcards Pille, Kartenterminals mit Kerbe,
  Netzwerk eckig, Fachdienste Sechseck. Neue Kategorien (Zentrale Dienste,
  Versicherte) bekommen eigene Form und Farbe aus der Okabe-Ito-Palette.
- **Kanten:** Farbe, Strichstärke und Strichmuster je Verbindungsart aus
  dem Mockup (`EDGEKIND`). Status nie nur über Farbe (D10).
- **Fokus:** `--tiv-focus`, 3 px Rahmen, auf allen bedienbaren Elementen.
- **Bewegung:** Paket-Animation und Puls nur ohne
  `prefers-reduced-motion`.
- **Prüfung:** ein Test berechnet die Kontraste aller Text-/Hintergrund-
  Paare der Tokens (WCAG AA).

### Tablet und kleine Bildschirme

- Ab < 1100 px: Palette und Detailpanel werden Überlagerungen statt
  fester Spalten.
- Unter 700 px: Hinweis, dass der Baukasten für größere Bildschirme
  gedacht ist. Presets und Dateien lassen sich trotzdem ansehen und abspielen.

## Katalog (Fachdaten, FR-12)

```
catalog/
  active.json                { "version": "1" }
  1/
    meta.json                Version, Datum, Notiz
    categories.json          Kategorien mit Farbe, Form, Reihenfolge
    device-types.json        Regelwerk 1 (inkl. Modus, Icon, Anschlüsse, Fähigkeiten)
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
  Das Detailpanel zeigt die Quelle an. Das macht die App für die
  Bachelorarbeit nachvollziehbar.
- Prüfregeln und Voraussetzungen sind als kleine, deklarative Ausdrücke
  beschrieben (z. B. `{ "card": "hba", "unlocked": true }`), die die
  Engine auswertet. Kein ausführbarer Code im JSON.
- Ein Vitest-Test prüft Schemas und Referenzen (jede Regel zeigt auf
  existierende Typen, Anschlüsse, Protokolle, Quellen).

## Speichern und Dateien

### Was gespeichert wird

| Daten | Inhalt |
|---|---|
| **Einstellungen** | Hell/Dunkel/System, Modus Einfach/Erweitert, Simulationstempo, angepinnte Panels, Animationen reduzieren, Tutorial-Fortschritt, gelöste Herausforderungen |
| **Topologie** | Geräte, Positionen, Kanten mit Anschlüssen, Zonen, gesteckte Karten mit Ablaufdatum und PIN-Status, Geräteeinstellungen, Störungen, Beschreibung |

Die Topologie steht immer in der Datei, die Einstellungen nur, wenn der
Benutzer sie mitspeichert (D23). Der Autosave hält beides im Browser.

### Speichern, Öffnen und Autosave (D34)

| | So funktioniert es |
|---|---|
| **Speichern** | Schreibt die Topologie in eine `.tiv.json`. Ein Häkchen „Einstellungen mitspeichern“ fügt die Einstellungen hinzu (Standard aus, die Wahl merkt sich die App). Chrome/Edge: Beim ersten Speichern wählt der Benutzer einen Ort, danach schreibt Strg+S zurück in dieselbe Datei (File System Access API). Firefox/Safari: jedes Speichern erzeugt einen Download |
| **Öffnen** | Dialog „Öffnen“ mit zwei Quellen: Datei (Auswahl oder Drag & Drop auf die Canvas) oder Preset. Übernommen wird immer nur die Topologie. Enthält die Datei Einstellungen, fragt die App „Einstellungen aus der Datei übernehmen?“ (Standard nein). Ein Preset setzt ebenfalls nur die Topologie |
| **Weitergeben** | Die Datei per E-Mail, Moodle oder USB weitergeben. Wer sie öffnet, bekommt dieselbe Topologie. Die eigenen Einstellungen bleiben, solange er nicht ausdrücklich zustimmt (D23, D24) |
| **Autosave** | Die App sichert den aktuellen Stand kurz nach jeder Änderung in IndexedDB. Es gibt genau einen Stand, keine Liste. Beim nächsten Start fragt sie: „Letzten Stand wiederherstellen?“ |
| **Ungespeicherte Änderungen** | Die Kopfleiste zeigt „nicht als Datei gespeichert“, solange sich der Stand von der zuletzt gespeicherten Datei unterscheidet. Beim Schließen des Tabs fragt der Browser nach (`beforeunload`) |
| **Grenzen des Autosave** | Nur im selben Browser auf demselben Gerät. Weg nach dem Löschen der Browserdaten und im privaten Modus. Die App weist beim ersten Start darauf hin |

### Dateiformat `.tiv.json` (D23, D35)

Aufbau und Typen als Diagramm: [architektur.md, Abschnitt 3](./architektur.md#3-datenmodell).

```json
{
  "format": "ti-visualizer",
  "schemaVersion": 1,
  "exportedAt": "2026-11-04T10:00:00Z",
  "catalogVersion": "1",
  "settings": {
    "theme": "dunkel",
    "mode": "erweitert",
    "simSpeed": 1.5,
    "reducedMotion": false,
    "tutorialStep": 4,
    "solvedChallenges": ["kein-rezept-am-empfang"]
  },
  "topology": {
    "name": "Arztpraxis mit CardLink",
    "description": "Praxis mit Konnektor im Parallelbetrieb",
    "nodes": [
      {
        "id": "kt1", "type": "kt", "label": "Empfang", "fault": false,
        "position": { "x": 120, "y": 80 },
        "cards": [
          { "kind": "smcb", "expires": "2028-06-30", "unlocked": true },
          { "kind": "egk", "expires": "2029-12-31" }
        ],
        "config": { "ip": "192.168.10.13", "mask": "255.255.255.0", "paired": true, "workplace": "AP-1" }
      }
    ],
    "edges": [
      { "id": "e1", "fault": false,
        "ends": [ { "node": "kt1", "port": "lan0" }, { "node": "sw1", "port": "p1" } ] }
    ],
    "zones": [
      { "id": "z1", "label": "Praxisnetz", "tone": "accent-2",
        "area": { "x": 0, "y": 0, "w": 600, "h": 400 } }
    ]
  }
}
```

**Typen (Zod, daraus die TypeScript-Typen):**

| Typ | Aufbau | Unterschieden über |
|---|---|---|
| `TivFile` | `format`, `schemaVersion`, `exportedAt`, `catalogVersion`, `settings`, `topology` | |
| `Settings` | Felder aus der Tabelle „Was gespeichert wird“ | |
| `Topology` | `name`, `description`, `nodes`, `edges`, `zones` | |
| `Element` | `id`, `label?` | |
| `Node`, `Edge`, `Zone` | erweitern `Element`. Node und Edge haben zusätzlich `fault` (`Disruptable`) | |
| `Point`, `Rect`, `Endpoint` | kleine Wertobjekte für Position, Fläche und Kantenende | |
| `Card`, `PinCard` | `Card` für die eGK, `PinCard` (HBA, SMC-B) zusätzlich mit `unlocked` | `kind` |
| `NetConfig` | `ip`, `mask`, `gateway`, `dns`, `vlan`, `dhcp` | |
| `KonnektorConfig`, `TerminalConfig`, `ClientConfig`, `RouterConfig`, `InfraConfig` | erweitern `NetConfig` um die Felder aus Regelwerk 8. `InfraConfig` (Switch, Access Point) hat keine Zusatzfelder | Fähigkeit des Gerätetyps |

**Prüfungen gegen den Katalog:** `cards` nur bei Gerätetypen mit der
Fähigkeit `cardSlots`, `config` nur bei einer Fähigkeit
`netConfig:<variante>`, die zugleich die Variante festlegt. Kanten haben
genau zwei Enden, beide zeigen auf vorhandene Knoten und Anschlüsse.

- Ein Schema (Zod) für die Datei, die Presets und den Autosave.
- Eine Datei ohne `topology` wird abgelehnt. `settings` ist optional,
  eine Datei nur mit `settings` ist ungültig.
- **Migration:** ältere `schemaVersion` laufen durch eine
  Migrationskette. Weicht `catalogVersion` ab, wird gegen den aktuellen
  Katalog geprüft. Verstöße werden gemeldet und markiert, nicht
  stillschweigend entfernt.

### Sicherheit beim Öffnen fremder Dateien

- Jede Datei läuft durch das Zod-Schema. Unbekannte Felder
  werden verworfen, unbekannte Gerätetypen gemeldet.
- Größenlimit 1 MB pro Datei.
- Texte (Namen, Beschreibungen) werden nur als Text angezeigt, nie als
  HTML.
- Fremde Inhalte ersetzen den aktuellen Stand nie ohne Rückfrage. Vorher
  wird der aktuelle Stand automatisch gesichert.

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
3. Sonst ungültig. `reason` ist der Text der passenden Begründungsregel
   oder die allgemeine Meldung mit den erlaubten Partnern.

Im Modus Einfach wählt `autoPorts` das erste freie, verträgliche
Anschlusspaar. Im Modus Erweitert öffnet sich der `PortPicker`.

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
  Zustandsautomat `idle → running(n) ⇄ paused → done | cancelled`.
  Play/Pause, Schritt vor/zurück, Tempo, Abbrechen.
- **Sicherheitsprüfung:** `runChecks(topology, mode)` liefert Befunde
  nach Regelwerk 9. Dieselbe Funktion erkennt gelöste Herausforderungen.

## CI/CD-Pipeline und Deployment (D8, D26, D27)

Übersicht als Diagramm: [architektur.md, Abschnitt 5](./architektur.md#5-cicd-pipeline).

### Workflows

| Datei | Auslöser | Zweck |
|---|---|---|
| `.github/workflows/ci.yml` | Pull Request, Push auf jeden Branch | Stufen 1 bis 5. Ergebnis als Status-Check am PR |
| `.github/workflows/deploy.yml` | Push auf `main` (nach Merge), manuell | Stufen 1 bis 5, danach Stufe 6 Deployment |
| `.github/workflows/nightly.yml` | täglich nachts | volle E2E-Suite in allen Browsern, Mutation-Testing, OWASP ZAP gegen die öffentliche Seite, OSV-Scanner, Kennzahlen |
| `.github/workflows/codeql.yml` | PR, Push auf `main`, wöchentlich | CodeQL-Analyse (JavaScript/TypeScript) |
| `.github/workflows/scorecard.yml` | wöchentlich | OpenSSF Scorecard für die Lieferkette |
| `.github/dependabot.yml` | wöchentlich | Updates für npm-Pakete und Actions |

Gemeinsame Schritte liegen in einem wiederverwendbaren Workflow
(`.github/workflows/_pipeline.yml`, `workflow_call`), damit CI und Deploy
sicher dasselbe prüfen.

### Stufen

| Stufe | Job | Inhalt | Bricht ab, wenn |
|---|---|---|---|
| 1 | `static` | `pnpm install --frozen-lockfile` · ESLint · Prettier-Check · `tsc --noEmit` · Architekturregeln (`dependency-cruiser`) · ungenutzter Code (`knip`) · Rückverfolgbarkeit Regelwerk ↔ Katalog | Lint-, Typ- oder Architekturfehler, Regelwerk und Katalog weichen ab |
| 1b | `security` | Secret-Scan (`gitleaks`) · bei PRs `actions/dependency-review-action` (neue Abhängigkeiten mit Schwachstellen oder unerlaubter Lizenz) · `pnpm audit --audit-level=high` | Secret gefunden, Abhängigkeit mit hoher/kritischer Schwachstelle oder verbotener Lizenz |
| 2 | `unit` | Vitest mit Coverage (`@vitest/coverage-v8`, Bericht `lcov`), Property-based Tests, Katalog- und Preset-Validierung, Regel-Tests (D18) mit Prüfung „jede Regel hat einen Test“, Kontrastprüfung der Tokens | ein Test fehlschlägt, eine Regel-ID ohne Test ist oder Coverage unter den Grenzen liegt (Engines 90 % Zeilen/85 % Zweige, gesamt 80 %) |
| 3 | `sonar` | SonarQube-Cloud-Analyse mit dem Coverage-Bericht aus Stufe 2. Quality Gate wird abgewartet | Quality Gate rot |
| 3b | `ai-review` | nur bei Pull Requests: KI-Review nach `.github/review-richtlinien.md`, Ergebnis als PR-Kommentar | bricht nie ab (nur Hinweise) |
| 4 | `build` | `vite build` mit `BASE_PATH=/ti-visualizer/`. Prüfung der Bundle-Größe. CSP-Meta-Tag vorhanden. SBOM (CycloneDX) erzeugen. Lighthouse CI. `dist/` als Artefakt | Build-Fehler, Haupt-Bundle > 500 KB (gzip), Lighthouse unter 90 in Performance, Barrierefreiheit oder Best Practices |
| 5 | `e2e` | Playwright gegen `vite preview` mit dem Build aus Stufe 4. Axe-Checks. Tastatur-Durchlauf. Export/Import zwischen zwei Browser-Kontexten. **Injection-Suite** (`tests/security/`) | ein E2E-, Axe- oder Injection-Test fehlschlägt |
| 6 | `deploy` | nur in `deploy.yml`: Build-Provenienz signieren (`actions/attest-build-provenance`), `actions/upload-pages-artifact` mit `dist/`, `actions/deploy-pages`, danach Smoke-Test gegen die öffentliche Adresse | Upload, Deploy oder Smoke-Test schlägt fehl |

Stufe 1 und 1b laufen zuerst. Danach laufen 2, 3b und 4 parallel. Stufe 3 wartet auf 2, Stufe 5 auf 4.
Deploy startet nur, wenn alle anderen Jobs grün sind.

### Sonar-Prüfung (D27)

- **Dienst:** SonarQube Cloud, Organisation `jurie2000`, Projekt
  `jurie2000_ti-visualizer`. Kostenlos, solange das Repo öffentlich ist.
- **Einbindung:** offizielle Action `SonarSource/sonarqube-scan-action`
  (Version gepinnt) mit `SONAR_TOKEN` als Repository-Secret.
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
- **Ergänzend:** CodeQL, Abhängigkeitsprüfung und weitere
  Sicherheitsjobs siehe Abschnitt „Cyber-Security“.

### KI-Review (D29)

- **Werkzeug:** offizielle Claude Code GitHub Action von Anthropic
  (`anthropics/claude-code-action`, Version gepinnt), Modell Opus.
- **Auslöser:** automatisch bei geöffnetem oder aktualisiertem Pull
  Request, wenn Dateien in `src/`, `catalog/` oder
  `specs/` geändert sind. Zusätzlich auf Zuruf mit `@claude` in einem
  PR-Kommentar.
- **Prüfpunkte** in `.github/review-richtlinien.md`, mit Fokus auf das,
  was Sonar und Tests nicht sehen:
  - Stimmt die Änderung mit Spec und Regelwerk überein (Regel-IDs,
    Voraussetzungen, Abläufe)?
  - Hat jede neue oder geänderte Regel einen Testfall (D18)?
  - Hat jeder neue Katalogeintrag `source` und `status`?
  - Werden Zustände nie nur über Farbe angezeigt, ist alles per Tastatur
    bedienbar (D10)?
  - Werden geöffnete Dateien durch das Schema geprüft und Texte
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
    PR-Kommentaren. Die KI darf keine Commits pushen und nicht mergen.
- **Kosten begrenzen:** Pfadfilter, maximale Laufzeit und Zugzahl pro
  Lauf, kein Lauf bei Entwurfs-PRs.
- **Auswertung für die Bachelorarbeit:** Befunde je PR werden mit Label
  „KI-Befund übernommen“ bzw. „verworfen“ markiert. So lässt sich am Ende
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
  liegen unter `/ti-visualizer/`,
  Bundle-Größe unter der Grenze (`size-limit`).

### End-to-End-Tests mit Playwright

| Suite | Inhalt | Browser in CI | Browser nightly |
|---|---|---|---|
| `smoke` | App lädt, Startansicht, Preset öffnen | Chromium | alle |
| `build-and-connect` | Gerät ergänzen, gültig und ungültig verbinden, Begründung sichtbar | Chromium | alle |
| `actions-sim` | Kontextmenü, ausgegraute Aktion, Simulation abspielen und abbrechen | Chromium | alle |
| `datei` | Speichern in Kontext A → Öffnen in neuem Kontext B: Topologie kommt an, Einstellungen nur nach Zustimmung. Datei ohne Einstellungen. Autosave und Wiederherstellen | Chromium, Firefox | alle |
| `a11y` | Axe auf Hauptansichten und Dialogen, Durchlauf nur per Tastatur | Chromium | alle |
| `visual` | Screenshots Hell/Dunkel der Hauptansichten | nicht in CI | Chromium (Vergleich mit Referenzbildern) |

- Bei Fehlern lädt die Pipeline Trace, Video und Screenshots als
  Artefakt hoch.
- Nach dem Deploy prüft ein `smoke`-Lauf die öffentliche Adresse.

### Branch-Schutz und Ablauf

- `main` ist geschützt: Merge nur per Pull Request, Pflicht-Checks
  `static`, `security`, `unit`, `sonar`, `build`, `e2e`, `codeql`. Der KI-Review (`ai-review`)
  läuft mit, ist aber kein Pflicht-Check.
- Arbeitsweise: Branch je Task (`task/T-xxx-…`), PR mit Task-ID,
  Merge nach grünen Checks. Deploy läuft danach automatisch.

### GitHub Pages

- **Adresse:** `https://jurie2000.github.io/ti-visualizer/`.
- **Vite `base`:** aus `BASE_PATH`, Standard `/ti-visualizer/`. Eigene
  Domain später über `CNAME` und `base: '/'`.
- **Caching:** JS/CSS mit Hash. `index.html` ohne Hash.
- **Kein Server-Routing nötig** (D14).
- **Einmalig:** Repo öffentlich stellen. *Settings → Pages → Source:
  GitHub Actions*. Umgebung `github-pages` nur für `main`. SonarQube
  Cloud mit dem Repo verbinden und `SONAR_TOKEN` hinterlegen.
  `ANTHROPIC_API_KEY` als Secret anlegen und die Claude GitHub App
  installieren.
  Branch-Schutz für `main` einrichten.

## Codequalität und Testabdeckung (D30 bis D32)

### Rückverfolgbarkeit (D30)

| Prüfung | So funktioniert sie | Ergebnis |
|---|---|---|
| **Jede Regel hat einen Test** | `scripts/check-traceability.ts` liest alle Regel-IDs aus `regelwerk.md` (z. B. V-3, G-4, K-4, P-17) und sucht sie in den Testnamen (`it("[P-17] …")`) | CI bricht ab, wenn eine Regel-ID ohne Test ist. Bericht `traceability.md` als Artefakt (Regel → Test → Status) |
| **Regelwerk und Katalog stimmen überein** | `scripts/check-regelwerk-katalog.ts` liest die Tabellen aus `regelwerk.md` (Erlaubnisliste, Begründungsliste, Aktionen, Prüfregeln) und vergleicht sie mit `catalog/*.json` | CI bricht ab bei fehlenden oder zusätzlichen Einträgen, abweichendem Status oder fehlender Quelle |
| **Jede Anforderung ist abgedeckt** | Tests und Tasks tragen FR-IDs. Das Skript prüft FR-1 bis FR-22 | Bericht „FR → Tasks → Tests“ |

### Testarten und Ziele

| Testart | Werkzeug | Gegenstand | Ziel |
|---|---|---|---|
| Unit | Vitest | Engines, Schemas, Persistenz, Stores | Engines ≥ 90 % Zeilen, ≥ 85 % Zweige. Gesamt ≥ 80 % |
| Property-based (D31) | `fast-check` | Engines und Import | Grundsätze siehe unten |
| Mutation (D31) | StrykerJS (Vitest-Runner) | `src/engine/`, `src/persistence/` | Mutation Score ≥ 80 % (nightly, Bericht als Artefakt) |
| Komponenten | React Testing Library | Bausteine mit Logik | kritische Interaktionen abgedeckt |
| E2E | Playwright | Nutzerabläufe, Speichern/Öffnen, a11y, Sicherheit | alle Suiten grün |
| Visuell | Playwright `toHaveScreenshot` | Hauptansichten hell/dunkel | keine ungewollte Abweichung |
| Performance/Qualität | Lighthouse CI | gebaute Seite | ≥ 90 in Performance, Barrierefreiheit, Best Practices |

**Grundsätze für Property-based Tests** (zufällige Topologien und Eingaben):
- Verbinden ist symmetrisch: A mit B ergibt dasselbe wie B mit A (D15).
- Kein Paar der Erlaubnisliste wird von einer Begründungsregel erfasst.
- Speichern → Öffnen ergibt dieselbe Topologie. Mitgespeicherte
  Einstellungen kommen nur nach Zustimmung an.
- Migration ist idempotent: zweimal migrieren = einmal migrieren.
- Beliebige, auch kaputte Eingaben bringen den Import nie zum Absturz.
  Sie werden angenommen oder mit Meldung abgelehnt (Fuzzing).
- `runChecks` ist deterministisch und hängt nicht von der Reihenfolge
  der Knoten ab.

### Statische Qualität

- **TypeScript** mit `strict`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `noImplicitOverride`.
- **ESLint:** `typescript-eslint` (`strict-type-checked`),
  `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`,
  `eslint-plugin-no-unsanitized` (verbietet `innerHTML` & Co.).
- **Architekturregeln (D32)** mit `dependency-cruiser`:
  - `engine/` importiert weder React noch `store/`, `persistence/` oder
    Browser-APIs.
  - `ui/`, `canvas/`, `panels/`, `dialogs/` greifen nicht direkt auf
    `persistence/` zu, nur über Stores.
  - keine zirkulären Abhängigkeiten.
- **`knip`:** keine ungenutzten Dateien, Exporte oder Abhängigkeiten.
- **Sonar** (D27) als übergreifende Bewertung.

### Arbeitsablauf

- **Vor dem Commit:** `lefthook` mit `lint-staged` (ESLint, Prettier nur
  für geänderte Dateien) und `gitleaks` für Secrets.
- **Commit-Nachrichten:** `commitlint` mit Conventional Commits und
  Pflicht-Task-ID, z. B. `feat(engine): T-012 Erlaubnisliste prüfen`.
- **Pull-Request-Vorlage** (`.github/pull_request_template.md`):
  Task-ID, betroffene FR- und Regel-IDs, Tests ergänzt, Screenshot bei
  UI-Änderung, Sicherheitsrelevanz ja/nein.
- **`CODEOWNERS`:** Änderungen an `specs/`, `catalog/` und
  `.github/workflows/` brauchen die Freigabe von Justin.

### Kennzahlen für die Bachelorarbeit

`scripts/metrics.ts` schreibt je Pipeline-Lauf eine Zeile in
`metrics/verlauf.csv` (eigener Branch `metrics`): Datum, Commit,
Coverage, Mutation Score, Sonar-Bewertungen, Anzahl Tests, Regeln mit
Test, Lighthouse-Werte, offene Schwachstellen, KI-Review-Befunde
übernommen/verworfen. Daraus entstehen die Verlaufsgrafiken für die
Arbeit.

## Cyber-Security (D33)

### Bedrohungsmodell (kurz, nach STRIDE)

| Bedrohung | Wo | Gegenmaßnahme |
|---|---|---|
| **Tampering / Injection:** präparierte `.tiv.json` mit Skript- oder HTML-Inhalt | Öffnen | Zod-Schema mit festen Wertebereichen, Texte nur als Text, `no-unsanitized`, CSP, Injection-Tests |
| **Denial of Service im Browser:** riesige Datei, tief verschachteltes JSON | Öffnen | Größenlimit 1 MB, Knoten-/Kantenlimit, Abbruch mit Meldung |
| **Prototype Pollution:** Schlüssel wie `__proto__`, `constructor` | JSON-Import | Zod verwirft unbekannte Schlüssel. Test mit diesen Schlüsseln |
| **Spoofing:** weitergegebene Datei gibt sich als offizielles Preset aus | Öffnen | offizielle Presets kommen nur aus dem Katalog, geöffnete Dateien sind immer als eigene Datei gekennzeichnet und ersetzen den Stand nur nach Rückfrage |
| **Information Disclosure:** Daten verlassen den Browser | gesamte App | keine Laufzeit-Netzwerkzugriffe außer zur eigenen Seite (Same-Origin). Keine Tracker. Schriften selbst ausgeliefert |
| **Supply Chain:** kompromittierte Abhängigkeit oder Action | Build, CI | Lockfile, SBOM, Dependency-Review, gepinnte Actions, minimale Rechte, Provenienz |
| **Elevation of Privilege in der CI:** Fork-PR greift auf Secrets zu | GitHub Actions | keine Secrets für Fork-PRs, `permissions` minimal, kein `pull_request_target` mit Checkout fremden Codes |

### Abhängigkeiten und SBOM

| Baustein | Zweck | Wann |
|---|---|---|
| **SBOM (CycloneDX)** mit `@cyclonedx/cyclonedx-npm` | Stückliste aller Abhängigkeiten, als Artefakt an jedem Build und an jedem Release | Stufe 4 |
| **OWASP Dependency-Track** | Dashboard, das SBOMs fortlaufend gegen neue Schwachstellen prüft und Lizenzen bewertet | nightly Upload der SBOM. Dependency-Track läuft lokal per Docker (`dependencytrack/apiserver` und `frontend`) oder auf einem eigenen Server. Ohne Server entfällt nur das Dashboard, die übrigen Prüfungen bleiben |
| **Dependency-Review-Action** | blockiert PRs, die Abhängigkeiten mit bekannten Schwachstellen (ab „hoch“) oder unerlaubten Lizenzen einführen. Erlaubt: MIT, ISC, BSD, Apache-2.0, 0BSD, CC0 | Stufe 1b |
| **`pnpm audit` und OSV-Scanner** | Abgleich mit GitHub Advisory DB und OSV | Stufe 1b bzw. nightly |
| **Dependabot** | Sicherheits- und Versionsupdates für npm und Actions | wöchentlich und bei Warnungen sofort |
| **GitHub Dependency Graph und Security Alerts** | Grundlage für Dependabot und Dependency-Review | dauerhaft aktiv |

### Statische und dynamische Sicherheitsprüfung

- **SAST:** CodeQL (`security-extended`), Sonar-Sicherheitsregeln,
  `eslint-plugin-no-unsanitized`.
- **Secrets:** GitHub Secret Scanning mit Push Protection, `gitleaks` in
  Pre-Commit und CI.
- **DAST:** OWASP ZAP Baseline-Scan (`zaproxy/action-baseline`) nightly
  gegen die öffentliche Seite und in der CI gegen `vite preview`.
  Warnungen zu HTTP-Headern, die GitHub Pages nicht setzen lässt, stehen
  begründet in `.zap/rules.tsv`.
- **Lieferkette:** OpenSSF Scorecard wöchentlich. Ziel ≥ 7 von 10.

### Injection-Tests (`tests/security/`)

Ein Korpus bösartiger Eingaben (angelehnt an OWASP XSS Filter Evasion
und OWASP Testing Guide) wird über **jeden Eingabeweg** geschickt:
Datei öffnen, Drag & Drop, Autosave wiederherstellen, Topologiename,
Beschreibung, Zonenname, Gerätebezeichnung, Einstellungen in der Datei.

| Testfall | Erwartung |
|---|---|
| `<script>`, `<img src=x onerror=…>`, `<svg onload=…>`, `javascript:`-URLs in Texten | Text erscheint wörtlich. Kein Skript läuft (Playwright prüft `window.__pwned`, Dialoge und Konsole) |
| HTML/CSS in Zonenfarbe oder Tönen (`tone`) | abgelehnt, nur feste Werte erlaubt |
| beliebige Parameter oder Fragmente in der URL (`?…`, `#…`) | ignoriert, es wird nichts geladen oder ausgeführt |
| JSON mit `__proto__`, `constructor`, `prototype` | Schlüssel verworfen, `Object.prototype` unverändert |
| 10 MB Datei, 100 000 Knoten, Verschachtelungstiefe 1 000 | Abbruch mit Meldung, App bleibt bedienbar |
| unbekannte Gerätetypen, kaputte Referenzen (Kante zu fehlendem Knoten) | gemeldet, nicht stillschweigend übernommen |
| Unicode-Tricks (Steuerzeichen, Rechts-nach-links-Zeichen) in Namen | sichtbar markiert oder entfernt |

Zusätzlich deckt das Fuzzing mit `fast-check` (Abschnitt
„Codequalität“) zufällige Eingaben ab.

### Härtung der Seite

- **Content Security Policy** als Meta-Tag in `index.html` (GitHub Pages
  erlaubt keine eigenen Header):
  `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'`.
  In P0 wird geprüft, ob
  React Flow ohne `'unsafe-inline'` bei `style-src` auskommt.
- **Referrer-Policy** als Meta-Tag (`no-referrer`).
- Keine Drittanbieter-Skripte, keine Analyse-Tools, keine Cookies.
- Externe Links mit `rel="noopener noreferrer"`.

### CI-Härtung

- Actions per Commit-SHA gepinnt (Dependabot aktualisiert sie).
- `permissions:` je Workflow minimal, Standard `contents: read`.
- Fork-PRs ohne Secrets. KI-Review und Sonar für Forks nur nach
  Freigabe.
- Umgebung `github-pages` nur für `main`.
- Build-Provenienz per `actions/attest-build-provenance`.

### Meldeweg

`SECURITY.md` beschreibt, wie Schwachstellen gemeldet werden. Dafür wird
im Repo „Private vulnerability reporting“ aktiviert.

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
- Simulation: Leertaste Play/Pause, Pfeiltasten Schritt, Esc Abbrechen.
  Erklärtext als `aria-live`.
- Semantik: Rollen und Labels für Knoten und Kanten.

Tests: Axe in Playwright, ein E2E-Durchlauf nur per Tastatur.

## Abdeckung der Anforderungen

| FR | Umsetzung |
|---|---|
| FR-1 | `Palette` aus `device-types` und `categories`, Suche |
| FR-2 | `StartScreen`, `OpenDialog`, `presets.json` |
| FR-3, FR-4 | React-Flow-Verbinden, `validateConnection`, `Toast` mit Begründung |
| FR-5 | Datei `.tiv.json` mit Topologie und optional Einstellungen, Autosave (D23, D34) |
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

- **Katalog und Presets (Vitest):** Schemas, Referenzen, Quellenangaben
- **Regel-Engine:** ein Testfall je Regel (D18), Konsistenztest
  Erlaubnis- gegen Begründungsliste
- **Aktionen:** je Aktion eine Topologie, in der sie aktiv ist, und eine,
  in der sie mit der erwarteten Begründung ausgegraut ist
- **Simulation:** Schrittfolge je Ablauf, Abbruch, `local` ohne VPN und
  Fachdienst
- **Prüfregeln:** je Regel ein positiver und ein negativer Fall. Jede
  Herausforderung ist lösbar und wird als gelöst erkannt
- **Persistenz:** Autosave und Wiederherstellen, Hinweis auf ungespeicherte Änderungen. Speichern und Öffnen mit
  und ohne Einstellungen, Rückfrage beim Übernehmen der Einstellungen. Kaputte und zu große Dateien werden mit Meldung
  abgelehnt. Migration alter `schemaVersion`
- **Barrierefreiheit:** Axe, Tastatur-E2E, Kontraste der Tokens
- **Testqualität:** Property-based Tests und Mutation-Testing (siehe
  „Codequalität und Testabdeckung“)
- **Sicherheit:** Injection-Suite über alle Eingabewege, ZAP-Scan,
  Fuzzing (siehe „Cyber-Security“)
- **E2E (Playwright):** Preset laden → Gerät ergänzen → ungültig
  verbinden → Aktion → Simulation abbrechen. Speichern in Browser A →
  Öffnen in neuem Browser-Kontext B (simuliert „anderer Browser“)
- **Optischer Abgleich:** Screenshots der Hauptansichten im Vergleich
  zu `design/mockup/screenshots/` (manuelle Abnahme), danach als
  Referenzbilder für die `visual`-Suite
- **Wo die Tests laufen:** siehe Abschnitt „CI/CD-Pipeline und
  Deployment“

## Umsetzungsphasen (Grundlage für `tasks.md`)

| Phase | Inhalt | Ergebnis |
|---|---|---|
| P0 | Grundgerüst: Vite, React, TS, Lint, Vitest, Tokens, Schriften, App-Shell mit Impressum. **Komplette Pipeline** (Stufen 1 bis 6, Sonar, KI-Review, Playwright-Smoke, Branch-Schutz), Qualitätswerkzeuge (strict TS, ESLint-Regelsätze, dependency-cruiser, knip, lefthook, commitlint, PR-Vorlage), Sicherheitsgrundlagen (CSP, gitleaks, Dependency-Review, CodeQL, SBOM, `SECURITY.md`) | Leere App öffentlich erreichbar, jede Änderung läuft durch die Pipeline |
| P1 | Zod-Schemas, Katalog aus dem Regelwerk, Regel-Engine, Tests. Rückverfolgbarkeits-Skripte, Property-based Tests, Mutation-Testing | Regeln vollständig und nachweisbar getestet |
| P2 | Palette, Canvas, Knoten und Kanten im Mockup-Stil, Verbinden mit Begründung, Startansicht, Presets | Topologien bauen |
| P3 | Speichern und Öffnen als Datei (Topologie, optional Einstellungen), Autosave. Injection-Suite und Fuzzing für alle Eingabewege | Austausch mit anderen Browsern, abgesichert |
| P4 | Kontextmenü, Aktionen, Pfade, Simulation, Detailpanel | Abläufe abspielen |
| P5 | Modus Erweitert: Anschlüsse, Einstellungen, Zonen, Editor-Hilfen, Sicherheitsprüfung | Erweiterte Ansicht |
| P6 | Tutorial, Herausforderungen | Lernfunktionen |
| P7 | Barrierefreiheit-Feinschliff, Tablet-Layout, E2E, optische Abnahme. ZAP-Scan, Scorecard, Dependency-Track, Kennzahlen-Auswertung | Release v1 |

## Risiken und offene Punkte

- [x] Visuelles Konzept: Mockup in `design/mockup/`.
- [x] Aktionsvoraussetzungen: [Regelwerk 6](./regelwerk.md#6-aktionen-und-voraussetzungen).
- [x] Lizenz: MIT (D19).
- [ ] Inhalte je Ablauf (Erklärtexte) fachlich abnehmen.
- [ ] Zielbrowser: aktuelle Chrome, Edge, Firefox, Safari. File System
  Access API nur in Chrome/Edge. Firefox/Safari nutzen Download/Upload.
- [ ] Impressum: Anschrift vor dem öffentlichen Start klären.
- [ ] Vor dem Öffentlichstellen: Git-Historie auf private Daten prüfen.
- **Risiko:** Der Autosave geht beim Löschen der Browserdaten verloren.
  Abhilfe: Er ist nur Sicherheitsnetz. Hinweis „nicht als Datei
  gespeichert“ und Rückfrage beim Schließen (D34).
- **Risiko:** Katalogänderungen brauchen einen neuen Build. Per Actions
  ist das ein Push auf `main`.
- **Risiko:** SonarQube Cloud ist nur für öffentliche Repos kostenlos.
  Bleibt das Repo privat, entfällt Stufe 3 oder läuft lokal per
  SonarQube Community Build in Docker.
- **Risiko:** Der KI-Review kostet API-Guthaben pro Pull Request und
  kann falsche Befunde liefern. Abhilfe: Pfadfilter, Laufzeitgrenze,
  nur Kommentar statt Pflicht-Check, Entscheidung beim Menschen.
- **Risiko:** Mutation-Testing und ZAP brauchen lange. Abhilfe: nur
  nightly, nur für `engine/` und `persistence/`.
- **Risiko:** Dependency-Track braucht einen laufenden Server.
  Abhilfe: lokal per Docker für die Auswertung in der Arbeit. Die
  Pipeline-Prüfungen (Dependency-Review, audit, OSV) laufen unabhängig
  davon.
- **Risiko:** Eine strenge CSP kann Bibliotheken mit Inline-Styles
  stören. Abhilfe: Prüfung in P0, Ausnahme nur begründet.
- **Risiko:** E2E-Tests in drei Browsern verlängern die Pipeline.
  Abhilfe: in CI nur Chromium (Firefox für `datei`), alle Browser
  nightly.

## Nächster Schritt

`tasks.md` aus den Phasen P0 bis P7 ableiten (Task-ID, Bezug auf FR und
Regel-ID, Testkriterium). Erster Task: P0, damit die leere App früh
öffentlich erreichbar ist.
