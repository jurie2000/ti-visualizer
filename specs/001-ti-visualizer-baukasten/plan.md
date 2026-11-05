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
| D26 | **CI/CD-Pipeline mit GitHub Actions** in festen Stufen: Statische Prüfung → Unit-Tests mit Coverage → Sonar-Analyse mit Quality Gate → Build-Test → E2E-Tests mit Playwright → Deployment. **Schlanker Kern ab P0**, weitere Prüfungen erst nach P7 und optional (Ausbaustufen) | Vom Nutzer gewünscht (2026-11-04), Umfang nach dem Prüfbericht gekürzt. Die Zeit in P0 gehört dem fachlichen Kern. |
| D27 | **SonarQube Cloud** (ehemals SonarCloud) für Codequalität, Sicherheit und Coverage | Für öffentliche Repos kostenlos, direkt mit GitHub verbunden, kommentiert Pull Requests. |
| D28 | **Architekturdiagramme als Mermaid** in [architektur.md](./architektur.md) | GitHub zeigt Mermaid direkt an. Diagramme liegen versioniert als Text neben dem Plan. |
| D29 | **KI-Review am Pull Request** mit der Claude Code GitHub Action (Modell Opus), nur als Kommentar, **kein Pflicht-Check** | Vom Nutzer gewünscht (2026-11-04). Prüft Spec- und Regelwerk-Treue, was Sonar und Tests nicht abdecken. Macht den KI-gestützten Entwicklungsprozess für die Bachelorarbeit auswertbar. |
| D30 | **Rückverfolgbarkeit Regel → Test → Katalog wird automatisch geprüft** (Skripte in der CI) | Erzwingt D18 und hält Regelwerk und Katalog synchron. Liefert einen Nachweis für die Bachelorarbeit. |
| D31 | **Testqualität wird zusätzlich zur Coverage gemessen**: Property-based Tests (`fast-check`) ab P1, Mutation-Testing (StrykerJS) optional einmal für die Auswertung in der Arbeit | Coverage zeigt nur, welcher Code läuft, nicht ob Tests Fehler finden. |
| D32 | **Architekturregeln werden erzwungen** (`dependency-cruiser`) | Die Schichten aus [architektur.md](./architektur.md) bleiben getrennt. Engines bleiben ohne React testbar. |
| D33 | **Security by Design** nach OWASP: Schema-Prüfung und Injection-Tests für alle Eingabewege, CSP, gitleaks, Dependabot, Sonar. SBOM, Dependency-Track, ZAP, Scorecard und Provenienz optional nach P7 | Die App öffnet Dateien von anderen Benutzern (D24) und ist öffentlich erreichbar. |
| D34 | **Speichern nur als Datei, Autosave nur als Sicherheitsnetz**: Der Browser hält ausschließlich den aktuellen Arbeitsstand und die Einstellungen. Es gibt keine Bibliothek gespeicherter Topologien im Browser | Vom Nutzer festgelegt (2026-11-04). Folgt aus D3. Schützt vor Datenverlust durch Neuladen oder Absturz, ohne dass Topologien von Browserdaten abhängen. |
| D35 | **Datenmodell mit Basistypen und Varianten**: gemeinsame Felder in Basistypen (`Element`, `NetConfig`, `Card`), Varianten über ein Unterscheidungsfeld (`kind` bei Karten). Welche Geräte Karten oder Einstellungen haben, legen **Fähigkeiten im Katalog** fest, nicht eine Klasse pro Gerätetyp | Weniger doppelte Felder, ungültige Kombinationen sind schon vom Typ her ausgeschlossen. Fähigkeiten statt Unterklassen halten das Modell datengetrieben (D4). Diagramm: [architektur.md, Abschnitt 3](./architektur.md#3-datenmodell) |
| D36 | **Der Modus ändert nur die Darstellung, nie die Topologie.** Im Modus Einfach sind Geräte mit „In Einfach sichtbar: nein“ ausgeblendet und ihre Wege als Sammelkanten zusammengefasst. Der Modus gehört zu den Einstellungen | Vom Nutzer festgelegt (2026-11-04, Prüfbericht Befund 2). So lassen sich alle Presets in beiden Modi zeigen, und der Moduswechsel verliert nichts. Regelwerk Abschnitt 11 |

## Technologie-Stack

| Bereich | Wahl |
|---|---|
| Sprache, Build | TypeScript, Vite, pnpm |
| UI | React, React Flow, CSS Modules, `lucide-react`, `@fontsource/*` |
| Zustand im Browser | Bibliothek „Zustand“ (Stores für Katalog, Topologie, Oberfläche, Simulation, Einstellungen) |
| Schemas | Zod |
| Speicher | Datei (`.tiv.json`, File System Access API mit Download/Upload als Rückfall), Autosave in IndexedDB über `idb-keyval` |
| Tests | Vitest mit `@vitest/coverage-v8`, `fast-check`, React Testing Library, Playwright (Chromium, Firefox), `@axe-core/playwright` |
| Qualität | ESLint (`typescript-eslint` strict, `jsx-a11y`, `react-hooks`, `no-unsanitized`), Prettier, `tsc --noEmit` (strict), SonarQube Cloud, `dependency-cruiser`, `size-limit`, `lefthook`. Optional: StrykerJS, Lighthouse CI, `knip`, `commitlint` |
| Sicherheit | `gitleaks`, GitHub Secret Scanning, Dependabot, Sonar, CodeQL. Optional: Dependency-Review-Action, `pnpm audit`, OSV-Scanner, CycloneDX-SBOM, OWASP Dependency-Track, OWASP ZAP, OpenSSF Scorecard, Build-Provenienz |
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
  .dependency-cruiser.cjs, lefthook.yml
.github/pull_request_template.md, .github/CODEOWNERS
SECURITY.md
scripts/                        check-traceability.ts, check-regelwerk-katalog.ts
tests/security/                 Injection-Korpus und Sicherheits-E2E
(optional nach P7: stryker.config.json, lighthouserc.json, knip.json,
 commitlint.config.ts, .zap/rules.tsv, scripts/metrics.ts)
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
| neu: Sammelkante im Modus Einfach | `GroupEdge` (fasst Wege über ausgeblendete Geräte zusammen, Klick zeigt sie) | FR-13, D36 |
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
| neu | `ImpressumDialog` (mit Katalogversion und Stand der Fachdaten), Hinweis „nicht als Datei gespeichert“, `ImportFindingsDialog` (Importbefunde) | FR-5, D19, D34 |
| neu: Textalternative zur Fläche | `TopologyList` (Geräte und Verbindungen als Liste, für Screenreader) | D10 |

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
    device-types.json        Regelwerk 1 (inkl. Sichtbarkeit in Einfach, Icon, Anschlüsse, Fähigkeiten)
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
    presets.json             Presets mit allen Kanten und festem simDate, Regelwerk 13
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
| **Einstellungen** | Hell/Dunkel/System, Modus Einfach/Erweitert, Simulationstempo, angepinnte Panels, Animationen reduzieren, Tutorial-Fortschritt, gelöste Herausforderungen, Wahl „Einstellungen mitspeichern“ |
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
| `Topology` | `name`, `description`, `simDate` (Simulationsdatum für Ablaufdaten, Regelwerk K-3), `nodes`, `edges`, `zones` | |
| `Element` | `id`, `label?` | |
| `Node`, `Edge`, `Zone` | erweitern `Element`. Node und Edge haben zusätzlich `fault` (`Disruptable`) | |
| `Point`, `Rect`, `Endpoint` | kleine Wertobjekte für Position, Fläche und Kantenende | |
| `Card`, `PinCard` | `Card` für die eGK mit `expires` und `pinActive` (Regelwerk K-7), `PinCard` (HBA, SMC-B) mit `expires` und `unlocked` | `kind` |
| `NetConfig` | `ip`, `mask`, `gateway`, `dns`, `vlan`, `dhcp` | |
| `KonnektorConfig`, `TerminalConfig`, `ClientConfig`, `RouterConfig`, `InfraConfig` | erweitern `NetConfig` um die Felder aus Regelwerk 8 (Spalte „Feld“). KonnektorConfig gilt auch für TI-Gateway und Highspeed-Konnektor. `InfraConfig` (Switch, Access Point, Firewall) hat keine Zusatzfelder | Fähigkeit des Gerätetyps (Regelwerk 1.9) |

**Prüfungen gegen den Katalog:** `cards` nur bei Gerätetypen mit der
Fähigkeit `cardSlots`, `config` nur bei einer Fähigkeit
`netConfig:<variante>`, die zugleich die Variante festlegt. Kanten haben
genau zwei Enden, beide zeigen auf vorhandene Knoten und Anschlüsse.

- Ein Schema (Zod) für die Datei, die Presets und den Autosave.
- Eine Datei ohne `topology` wird abgelehnt. `settings` ist optional,
  eine Datei nur mit `settings` ist ungültig.
- **Versionen:**
  - Ältere `schemaVersion` laufen durch eine Migrationskette.
  - Eine neuere `schemaVersion` als die App kennt wird mit der Meldung
    „Datei stammt aus einer neueren Version“ abgelehnt.
  - Weicht `catalogVersion` ab (gebündelt ist nur der aktive Katalog),
    wird gegen den aktiven Katalog geprüft. Verstöße stehen in den
    Importbefunden und werden von der Sicherheitsprüfung angezeigt, nicht
    stillschweigend entfernt.

### Sicherheit beim Öffnen fremder Dateien

- Jede Datei läuft durch das Zod-Schema. Übernommen werden nur bekannte
  Felder. Alles, was nicht übernommen wird (unbekannte Felder und
  Gerätetypen, kaputte Verweise), steht in einer **Liste der
  Importbefunde**, die der Benutzer nach dem Öffnen sieht. Nichts
  verschwindet stillschweigend.
- **Grenzen:** 1 MB pro Datei, höchstens 500 Knoten, 2 000 Kanten und
  50 Zonen, Namen bis 100 Zeichen, Beschreibungen bis 2 000 Zeichen.
- **Schema-Regeln:** IDs sind eindeutig, ein Einzelanschluss trägt
  höchstens eine Kante, jede Kante zeigt auf vorhandene Knoten und
  Anschlüsse.
- Texte (Namen, Beschreibungen) werden nur als Text angezeigt, nie als
  HTML.
- **Vor dem Ersetzen:** Hat der aktuelle Stand ungespeicherte Änderungen,
  bietet die App an, ihn zuerst als Datei zu speichern. Zusätzlich bleibt
  der alte Stand als Rückgängig-Schritt erhalten. Der Autosave allein
  reicht dafür nicht, weil er sofort den neuen Stand sichert.

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
   Anschluss, Kartenterminal an höchstens einem Zugang) und Ausschlüsse
   (Konnektor/TI-Gateway). Schlägt eine fehl: ungültig.
2. Steht das Paar in der Erlaubnisliste? Dann gültig. Der Modus spielt
   keine Rolle (D36). „Zugang“ steht für Konnektor,
   Highspeed-Konnektor und TI-Gateway.
3. Sonst ungültig. `reason` ist der Text der passenden Begründungsregel
   oder die allgemeine Meldung mit den erlaubten Partnern.

Im Modus Einfach wählt `autoPorts` das erste freie, verträgliche
Anschlusspaar. Im Modus Erweitert öffnet sich der `PortPicker`.

Karten werden nicht verbunden, sondern gesteckt (`plugCard`, Regelwerk
Abschnitt 5). Die Darstellung im Modus Einfach berechnet
`collapseHidden(topology, catalog)`: Wege über ausgeblendete Geräte
werden zu Sammelkanten (D36).

## Aktions- und Simulations-Engine (FR-6 bis FR-10, FR-18)

- **Verfügbarkeit:** `availableActions(node, topology, catalog)` liefert
  alle Aktionen des Gerätetyps mit `enabled` und `disabledReason`.
  Voraussetzungen werden über den **verbundenen Pfad** geprüft
  (Regelwerk 6), inklusive Kartenzustand, Störungen und, im Modus
  Erweitert, der Prüfregeln, die den Pfad unterbrechen (z. B. fehlende
  TI-Route).
- **Pfadauflösung:** Suche über die Kanten vom auslösenden Gerät nach
  der Rollenfolge aus Regelwerk 6.0 (Auslöser, LAN, Zugang, Router und
  Internet, VPN, Zentrales Netz, Dienst). Wege am Zugang vorbei zählen
  nicht als TI-Pfad. Bei `pathKind: local` (NFDM/eMP) über den Zugang bis
  zur eGK, ohne VPN und Fachdienst.
- **Abspielen:** Schritte aus `flows.json` werden auf den Pfad gebunden.
  Zustandsautomat `idle → running(n) ⇄ paused → done | cancelled`.
  Play/Pause, Schritt vor/zurück, Tempo, Abbrechen.
- **Während der Simulation** ist die Topologie gesperrt. Öffnen einer
  Datei, Moduswechsel, Rückgängig und Störungen brechen sie ab.
  Fachlicher Zustand (ob ein Rezept existiert) wird nicht geführt
  (Regelwerk 7, Vereinfachung).
- **Sicherheitsprüfung:** `runChecks(topology, mode)` liefert Befunde
  nach Regelwerk 9. Dieselbe Funktion erkennt gelöste Herausforderungen.

## CI/CD-Pipeline und Deployment (D8, D26, D27)

Übersicht als Diagramm: [architektur.md, Abschnitt 5](./architektur.md#5-cicd-pipeline).

### Ausbaustufen (entschieden 2026-11-04)

Die Pipeline wächst mit dem Projekt. Der Kern steht ab P0, alles andere
kommt erst, wenn die App fachlich steht.

| Stufe | Bausteine |
|---|---|
| **Kern ab P0** | ESLint, Prettier, `tsc` · Vitest mit Coverage · SonarQube Cloud · Build-Test mit Bundle-Größe · Playwright (Smoke) mit Axe · Deploy auf GitHub Pages · gitleaks · Dependabot · CodeQL (seit 2026-11-05, kein Pflicht-Check) · Branch-Schutz · KI-Review (kein Pflicht-Check) |
| **ab P1** | Rückverfolgbarkeit Regel → Test (D30) · Architekturregeln mit `dependency-cruiser` (D32) · Property-based Tests mit `fast-check` (D31) |
| **ab P3** | Injection-Suite und Fuzzing für das Öffnen von Dateien |
| **optional nach P7** | Mutation-Testing (StrykerJS, einmal für die Auswertung in der Arbeit) · Lighthouse CI · `knip` · Dependency-Review und `pnpm audit` · SBOM mit OWASP Dependency-Track · OWASP ZAP · OpenSSF Scorecard · Build-Provenienz · Kennzahlen-Export · `commitlint` · E2E in allen Browsern nightly |

### Workflows

| Datei | Auslöser | Zweck |
|---|---|---|
| `.github/workflows/ci.yml` | Pull Request, Push auf jeden Branch außer `main` | Stufen 1 bis 5. Ergebnis als Status-Check am PR |
| `.github/workflows/deploy.yml` | Push auf `main` (nach Merge), manuell | Stufen 1 bis 5, danach Stufe 6 Deployment |
| `.github/dependabot.yml` | wöchentlich | Updates für npm-Pakete und Actions |
| CodeQL Default-Setup (Repo-Einstellung, keine Datei) | Pull Request, Push auf `main`, wöchentlich | SAST für JavaScript/TypeScript und Actions, Suite `extended`. Kein Pflicht-Check |
| `.github/workflows/nightly.yml` | optional nach P7 | E2E in allen Browsern und die optionalen Prüfungen |

Gemeinsame Schritte liegen in einem wiederverwendbaren Workflow
(`.github/workflows/_pipeline.yml`, `workflow_call`), damit CI und Deploy
sicher dasselbe prüfen.

### Stufen (Kern)

| Stufe | Job | Inhalt | Bricht ab, wenn |
|---|---|---|---|
| 1 | `static` | `pnpm install --frozen-lockfile` · ESLint · Prettier-Check · `tsc --noEmit` · gitleaks · ab P1 `dependency-cruiser` | Lint-, Typ- oder Architekturfehler, Secret gefunden |
| 2 | `unit` | Vitest mit Coverage (`@vitest/coverage-v8`, Bericht `lcov`), Katalog- und Preset-Validierung (inklusive A-5), Regel-Tests (D18), Kontrastprüfung der Tokens. Ab P1 Property-based Tests und „jede Regel hat einen Test“ | ein Test fehlschlägt, eine Regel-ID ohne Test ist oder Coverage unter den Grenzen liegt (Engines 90 % Zeilen/85 % Zweige, gesamt 80 %) |
| 3 | `sonar` | SonarQube-Cloud-Analyse mit dem Coverage-Bericht aus Stufe 2. Quality Gate wird abgewartet | Quality Gate rot |
| 3b | `ai-review` | nur bei Pull Requests: KI-Review nach `.github/review-richtlinien.md`, Ergebnis als PR-Kommentar | bricht nie ab (nur Hinweise) |
| 4 | `build` | `vite build` mit `BASE_PATH=/ti-visualizer/`. Bundle-Größe (`size-limit`). CSP-Meta-Tag vorhanden. `dist/` als Artefakt | Build-Fehler, Haupt-Bundle > 500 KB (gzip) |
| 5 | `e2e` | Playwright gegen `vite preview` mit dem Build aus Stufe 4. Axe-Checks. Ab P3 Injection-Suite (`tests/security/`) | ein E2E-, Axe- oder Injection-Test fehlschlägt |
| 6 | `deploy` | nur in `deploy.yml`: `actions/upload-pages-artifact` mit `dist/`, `actions/deploy-pages`, danach Smoke-Test gegen die öffentliche Adresse | Upload, Deploy oder Smoke-Test schlägt fehl |

Stufe 1 läuft zuerst. Danach laufen 2, 3b und 4 parallel. Stufe 3
wartet auf 2, Stufe 5 auf 4. Deploy startet nur, wenn alle anderen Jobs
grün sind.

### Sonar-Prüfung (D27)

- **Dienst:** SonarQube Cloud, Organisation `jurie2000`, Projekt
  `jurie2000_ti-visualizer`. Kostenlos, solange das Repo öffentlich ist.
- **Einbindung:** offizielle Action `SonarSource/sonarqube-scan-action`
  (Version gepinnt) mit `SONAR_TOKEN` als Repository-Secret.
  `sonar.qualitygate.wait=true`, damit der Job auf das Ergebnis wartet.
- **Konfiguration** in `sonar-project.properties`. Quell- und Testdateien
  müssen getrennte Mengen sein, sonst bricht die Analyse ab:
  - `sonar.sources=src`
  - `sonar.exclusions=**/*.test.ts,**/*.test.tsx,src/test/**`
  - `sonar.tests=src,tests`
  - `sonar.test.inclusions=**/*.test.ts,**/*.test.tsx,src/test/**,tests/**`
  - `sonar.coverage.exclusions=src/main.tsx` (Einstiegspunkt ohne Logik,
    wie in `vitest.config.ts`)
  - `sonar.javascript.lcov.reportPaths=coverage/lcov.info`
- **Quality Gate „Sonar way“** für neuen Code: keine neuen Bugs und
  Schwachstellen, Security Hotspots geprüft, Coverage auf neuem Code
  ≥ 80 %, Duplikate ≤ 3 %.
- **Pull Requests:** Sonar kommentiert Befunde direkt im PR (PR-Decoration).
- Sonar ist zugleich die statische Sicherheitsprüfung (SAST) im Kern.
  Ergänzend läuft seit 2026-11-05 CodeQL im Default-Setup von GitHub
  (Query-Suite `extended`, JavaScript/TypeScript und Actions; T-804a).
  CodeQL prüft auch die Workflow-Dateien. Kein Pflicht-Check.

### KI-Review (D29)

- **Werkzeug:** offizielle Claude Code GitHub Action von Anthropic
  (`anthropics/claude-code-action`, Version gepinnt), Modell Opus.
- **Auslöser:** automatisch bei geöffnetem oder aktualisiertem Pull
  Request, wenn Dateien in `src/`, `catalog/` oder `specs/` geändert
  sind. Zusätzlich auf Zuruf mit `@claude` in einem PR-Kommentar.
- **Prüfpunkte** in `.github/review-richtlinien.md`, mit Fokus auf das,
  was Sonar und Tests nicht sehen:
  - Stimmt die Änderung mit Spec und Regelwerk überein (Regel-IDs,
    Voraussetzungen, Abläufe)?
  - Hat jede neue oder geänderte Regel einen Testfall (D18)?
  - Hat jeder neue Katalogeintrag `source` und `status`?
  - Werden Zustände nie nur über Farbe angezeigt, ist alles per Tastatur
    bedienbar (D10)?
  - Werden geöffnete Dateien durch das Schema geprüft und Texte nie als
    HTML ausgegeben?
  - Nennt der Pull Request die Task-ID?
  - Stil, Formatierung und allgemeine Codequalität sind **nicht**
    Aufgabe des KI-Reviews (das machen ESLint, Prettier, Sonar).
- **Ausgabe:** ein zusammenfassender PR-Kommentar plus Inline-Kommentare,
  auf Deutsch. Der Kommentar beginnt mit einem Überblick zum schnellen
  Überfliegen (Task-ID, Soll laut `tasks.md`, Ist laut Diff, Abweichung),
  danach die Befunde nach Schwere sortiert.
- **Kein Pflicht-Check:** Über den Merge entscheidet ein Mensch.
- **Sicherheit:** `CLAUDE_CODE_OAUTH_TOKEN` als Repository-Secret
  (Token aus dem Claude-Abo über `claude setup-token`, kein API-Key mit
  Abrechnung nach Verbrauch). Automatischer
  Lauf nur für Pull Requests aus diesem Repo, Forks nur nach manueller
  Freigabe. Rechte minimal: Code lesen, PR-Kommentare schreiben, nicht
  pushen, nicht mergen.
- **Kosten begrenzen:** Pfadfilter, maximale Laufzeit und Zugzahl pro
  Lauf, kein Lauf bei Entwurfs-PRs.
- **Auswertung für die Bachelorarbeit:** Befunde je PR werden mit Label
  „KI-Befund übernommen“ bzw. „verworfen“ markiert.
  Anlegen einmalig mit `gh label create "KI-Befund übernommen" --color 0E8A16 --description "KI-Review-Befund wurde umgesetzt"` und `gh label create "KI-Befund verworfen" --color B60205 --description "KI-Review-Befund wurde bewusst nicht umgesetzt"`.

### Unit- und Komponententests

- **Vitest** für Engines, Schemas, Persistenz (mit `fake-indexeddb`) und
  Stores. Tests laufen mit fester Uhr, Ablaufdaten werden gegen das
  `simDate` der Topologie geprüft.
- **React Testing Library** für Komponenten mit Logik (Kontextmenü,
  PortPicker, SimPlayer, Öffnen-Dialog).
- Tests liegen neben dem Code (`*.test.ts`), Testdaten-Topologien in
  `src/test/fixtures/`.

### Build-Test

- Produktions-Build mit genau der `BASE_PATH`, die auch deployt wird.
- Prüfungen nach dem Build: `dist/index.html` existiert, alle Assets
  liegen unter `/ti-visualizer/`, Bundle-Größe unter der Grenze
  (`size-limit`).

### End-to-End-Tests mit Playwright

| Suite | Inhalt | ab Phase |
|---|---|---|
| `smoke` | App lädt, Startansicht, Preset öffnen, Impressum erreichbar | P0 |
| `build-and-connect` | Gerät ergänzen, gültig und ungültig verbinden, Begründung sichtbar, Moduswechsel mit Sammelkanten | P2 |
| `datei` | Speichern in Kontext A → Öffnen in neuem Kontext B: Topologie kommt an, Einstellungen nur nach Zustimmung. Datei ohne Einstellungen. Autosave und Wiederherstellen | P3 |
| `actions-sim` | Kontextmenü, ausgegraute Aktion, Simulation abspielen und abbrechen, Bearbeiten während der Simulation gesperrt | P4 |
| `a11y` | Axe auf Hauptansichten und Dialogen, Durchlauf nur per Tastatur, Listenansicht | ab P0 wachsend |

In der CI läuft Chromium, für `datei` zusätzlich Firefox. Bei Fehlern
lädt die Pipeline Trace, Video und Screenshots als Artefakt hoch. Nach
dem Deploy prüft ein `smoke`-Lauf die öffentliche Adresse.

### Branch-Schutz und Ablauf

- `main` ist geschützt: Merge nur per Pull Request, Pflicht-Checks
  `static`, `unit`, `sonar`, `build`, `e2e` (auf GitHub mit dem Präfix
  des Aufrufer-Jobs, z. B. `pipeline / static`). Der KI-Review (`ai-review`)
  läuft mit, ist aber kein Pflicht-Check.
- Arbeitsweise: Branch je Task (`task/T-xxx-…`), PR mit Task-ID, Merge
  nach grünen Checks. Deploy läuft danach automatisch.
- Keine Pflicht-Freigabe durch Code-Owner: Bei einem Entwickler kann
  niemand die eigenen PRs freigeben. `CODEOWNERS` dient nur der
  Benachrichtigung.

### GitHub Pages

- **Adresse:** `https://jurie2000.github.io/ti-visualizer/`.
- **Vite `base`:** aus `BASE_PATH`, Standard `/ti-visualizer/`. Eigene
  Domain später über `CNAME` und `base: '/'`.
- **Caching:** JS/CSS mit Hash. `index.html` ohne Hash.
- **Kein Server-Routing nötig** (D14).
- **Einmalig:** Repo öffentlich stellen. *Settings → Pages → Source:
  GitHub Actions*. Umgebung `github-pages` nur für `main`. SonarQube
  Cloud mit dem Repo verbinden und `SONAR_TOKEN` hinterlegen.
  `CLAUDE_CODE_OAUTH_TOKEN` als Secret anlegen und die Claude GitHub App
  installieren. Branch-Schutz für `main` einrichten. GitHub Secret
  Scanning mit Push Protection und „Private vulnerability reporting“
  aktivieren.

## Codequalität und Testabdeckung (D30 bis D32)

### Rückverfolgbarkeit (D30, ab P1)

| Prüfung | So funktioniert sie | Ergebnis |
|---|---|---|
| **Jede Regel hat einen Test** | `scripts/check-traceability.ts` liest alle Regel-IDs aus `regelwerk.md` (z. B. V-4, G-4, K-4, P-17) und sucht sie in den Testnamen (`it("[P-17] …")`) | CI bricht ab, wenn eine Regel-ID ohne Test ist. Bericht `traceability.md` als Artefakt (Regel → Test → Status) |
| **Regelwerk und Katalog stimmen überein** | `scripts/check-regelwerk-katalog.ts` vergleicht nur Regel-IDs, Status und Quelle zwischen `regelwerk.md` und `catalog/*.json`. Inhalte wie Gerätelisten werden nicht aus dem Markdown gelesen, das wäre zu fehleranfällig | CI bricht ab bei fehlenden oder zusätzlichen IDs, abweichendem Status oder fehlender Quelle |
| **Jede Anforderung ist abgedeckt** | Tests und Tasks tragen FR-IDs. Das Skript prüft FR-1 bis FR-22 | Bericht „FR → Tasks → Tests“ |

### Testarten und Ziele

| Testart | Werkzeug | Gegenstand | Ziel | Stufe |
|---|---|---|---|---|
| Unit | Vitest | Engines, Schemas, Persistenz, Stores | Engines ≥ 90 % Zeilen, ≥ 85 % Zweige. Gesamt ≥ 80 % | Kern |
| Property-based (D31) | `fast-check` | Engines und Öffnen von Dateien | Grundsätze siehe unten | ab P1 |
| Komponenten | React Testing Library | Bausteine mit Logik | kritische Interaktionen abgedeckt | Kern |
| E2E | Playwright | Nutzerabläufe, Speichern/Öffnen, a11y, Sicherheit | alle Suiten grün | Kern |
| Mutation (D31) | StrykerJS (Vitest-Runner) | `src/engine/`, `src/persistence/` | Mutation Score ≥ 80 % | optional, einmal für die Arbeit |
| Visuell | Playwright `toHaveScreenshot` | Hauptansichten hell/dunkel | keine ungewollte Abweichung | optional |
| Performance/Qualität | Lighthouse CI | gebaute Seite | ≥ 90 in Performance, Barrierefreiheit, Best Practices | optional |

**Grundsätze für Property-based Tests** (zufällige Topologien und Eingaben):
- Verbinden ist symmetrisch: A mit B ergibt dasselbe wie B mit A (D15).
- Kein Paar der Erlaubnisliste wird von einer Begründungsregel erfasst.
- Jede Topologie ist im Modus Einfach und Erweitert dieselbe, nur die
  Darstellung unterscheidet sich (D36).
- Speichern → Öffnen ergibt dieselbe Topologie. Mitgespeicherte
  Einstellungen kommen nur nach Zustimmung an.
- Migration ist idempotent: zweimal migrieren = einmal migrieren.
- Beliebige, auch kaputte Eingaben bringen das Öffnen nie zum Absturz.
  Sie werden angenommen oder mit Meldung abgelehnt (Fuzzing).
- `runChecks` ist deterministisch und hängt nicht von der Reihenfolge
  der Knoten ab.

### Statische Qualität

- **TypeScript** mit `strict`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `noImplicitOverride`.
- **ESLint:** `typescript-eslint` (`strict-type-checked`),
  `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`,
  `eslint-plugin-no-unsanitized` (verbietet `innerHTML` & Co.).
- **Architekturregeln (D32, ab P1)** mit `dependency-cruiser`:
  - `engine/` importiert weder React noch `store/`, `persistence/` oder
    Browser-APIs.
  - `ui/`, `canvas/`, `panels/`, `dialogs/` greifen nicht direkt auf
    `persistence/` zu, nur über Stores.
  - keine zirkulären Abhängigkeiten.
- **Sonar** (D27) als übergreifende Bewertung.

### Arbeitsablauf

- **Vor dem Commit:** `lefthook` mit `lint-staged` (ESLint, Prettier nur
  für geänderte Dateien) und `gitleaks` für Secrets.
- **Pull-Request-Vorlage** (`.github/pull_request_template.md`):
  Task-ID, betroffene FR- und Regel-IDs, Tests ergänzt, Screenshot bei
  UI-Änderung, Sicherheitsrelevanz ja/nein.
- **`CODEOWNERS`:** nur zur Benachrichtigung, keine Pflicht-Freigabe.

## Cyber-Security (D33)

### Bedrohungsmodell (kurz, nach STRIDE)

| Bedrohung | Wo | Gegenmaßnahme |
|---|---|---|
| **Tampering / Injection:** präparierte `.tiv.json` mit Skript- oder HTML-Inhalt | Öffnen | Zod-Schema mit festen Wertebereichen, Texte nur als Text, `no-unsanitized`, CSP, Injection-Tests |
| **Denial of Service im Browser:** riesige Datei, tief verschachteltes JSON | Öffnen | Grenzen aus „Sicherheit beim Öffnen“, Abbruch mit Meldung |
| **Prototype Pollution:** Schlüssel wie `__proto__`, `constructor` | Öffnen | Zod übernimmt nur bekannte Schlüssel. Test mit diesen Schlüsseln |
| **Spoofing:** weitergegebene Datei gibt sich als offizielles Preset aus | Öffnen | offizielle Presets kommen nur aus dem Katalog, geöffnete Dateien sind immer als eigene Datei gekennzeichnet und ersetzen den Stand nur nach Rückfrage |
| **Information Disclosure:** Daten verlassen den Browser | gesamte App | keine Laufzeit-Netzwerkzugriffe außer zur eigenen Seite (Same-Origin). Keine Tracker. Schriften selbst ausgeliefert |
| **Supply Chain:** kompromittierte Abhängigkeit oder Action | Build, CI | Lockfile, Dependabot, gepinnte Actions, minimale Rechte. Optional: Dependency-Review, SBOM, Provenienz |
| **Elevation of Privilege in der CI:** Fork-PR greift auf Secrets zu | GitHub Actions | keine Secrets für Fork-PRs, `permissions` minimal, kein `pull_request_target` mit Checkout fremden Codes |

### Abhängigkeiten

| Baustein | Zweck | Stufe |
|---|---|---|
| **Dependabot** und GitHub Security Alerts | Sicherheits- und Versionsupdates für npm und Actions | Kern |
| **Dependency-Review-Action** | blockiert PRs mit Abhängigkeiten ab Schwachstelle „hoch“ oder mit unerlaubter Lizenz. Erlaubt: MIT, ISC, BSD-2-Clause, BSD-3-Clause, Apache-2.0, 0BSD, CC0-1.0, **OFL-1.1** (Schriften, D21), **CC-BY-4.0** (z. B. `caniuse-lite` über Vite) | optional |
| **`pnpm audit`, OSV-Scanner** | Abgleich mit GitHub Advisory DB und OSV | optional |
| **SBOM (CycloneDX) und OWASP Dependency-Track** | Stückliste und Dashboard für neue Schwachstellen. Dependency-Track läuft lokal per Docker für die Auswertung in der Arbeit | optional |

### Statische und dynamische Sicherheitsprüfung

- **Kern:** Sonar-Sicherheitsregeln, `eslint-plugin-no-unsanitized`,
  gitleaks in Pre-Commit und CI, GitHub Secret Scanning mit Push
  Protection, CodeQL (`extended`, seit 2026-11-05).
- **Optional nach P7:** OWASP ZAP
  Baseline-Scan nightly gegen die öffentliche Seite (Warnungen zu
  HTTP-Headern, die GitHub Pages nicht setzen lässt, begründet in
  `.zap/rules.tsv`), OpenSSF Scorecard.

### Injection-Tests (`tests/security/`, ab P3)

Ein Korpus bösartiger Eingaben (angelehnt an OWASP XSS Filter Evasion
und OWASP Testing Guide) wird über **jeden Eingabeweg** geschickt:
Datei öffnen, Drag & Drop, Autosave wiederherstellen, Topologiename,
Beschreibung, Zonenname, Gerätebezeichnung, Einstellungen in der Datei.

| Testfall | Erwartung |
|---|---|
| `<script>`, `<img src=x onerror=…>`, `<svg onload=…>`, `javascript:`-URLs in Texten | Text erscheint wörtlich. Kein Skript läuft (Playwright prüft `window.__pwned`, Dialoge und Konsole) |
| HTML/CSS in Zonenfarbe oder Tönen (`tone`) | abgelehnt, nur feste Werte erlaubt |
| beliebige Parameter oder Fragmente in der URL (`?…`, `#…`) | ignoriert, es wird nichts geladen oder ausgeführt |
| JSON mit `__proto__`, `constructor`, `prototype` | Schlüssel nicht übernommen, in den Importbefunden genannt, `Object.prototype` unverändert |
| 10 MB Datei, 100 000 Knoten, Verschachtelungstiefe 1 000 | Abbruch mit Meldung, App bleibt bedienbar |
| doppelte IDs, zwei Kanten am selben Einzelanschluss, Kante zu fehlendem Knoten, unbekannte Gerätetypen | in den Importbefunden gemeldet, nicht stillschweigend übernommen |
| Unicode-Tricks (Steuerzeichen, Rechts-nach-links-Zeichen) in Namen | sichtbar markiert oder entfernt |

Zusätzlich deckt das Fuzzing mit `fast-check` zufällige Eingaben ab.

### Härtung der Seite

- **Content Security Policy** als Meta-Tag in `index.html` (GitHub Pages
  erlaubt keine eigenen Header):
  `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'`.
  In P0 wird geprüft, ob React Flow ohne `'unsafe-inline'` bei
  `style-src` auskommt.
- **Referrer-Policy** als Meta-Tag (`no-referrer`).
- Keine Drittanbieter-Skripte, keine Analyse-Tools, keine Cookies.
- Externe Links mit `rel="noopener noreferrer"`.

### CI-Härtung

- Actions per Commit-SHA gepinnt (Dependabot aktualisiert sie).
- `permissions:` je Workflow minimal, Standard `contents: read`.
- Fork-PRs ohne Secrets. KI-Review und Sonar für Forks nur nach
  Freigabe.
- Umgebung `github-pages` nur für `main`.

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

**Screenreader**
- Die Fläche allein ist für Screenreader kaum nutzbar. Deshalb gibt es
  eine **Listenansicht** (`TopologyList`) als Textalternative: alle
  Geräte mit Kategorie, gesteckten Karten und Verbindungen, bedienbar
  wie eine Tabelle. Aktionen und Sicherheitsprüfung sind auch dort
  erreichbar.
- Persona-Bilder im Tutorial bekommen Alt-Texte, die in `tutorial.json`
  stehen.

Tests: Axe in Playwright, ein E2E-Durchlauf nur per Tastatur, einer nur
über die Listenansicht.

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
| FR-11 | `DetailPanel` aus `protocols` (Protokoll, Netzport, TLS, Datenformat, soweit belegt) und `sources` |
| FR-12 | Katalog in `catalog/`, `schemaVersion`, Migrationen |
| FR-13 | `ModeSwitch`, Sichtbarkeit je Gerätetyp im Katalog, Sammelkanten (`GroupEdge`, `collapseHidden`, D36) |
| FR-14 | Anschlüsse in `device-types`, `PortPicker`, `autoPorts` |
| FR-15 | `ZoneNode` |
| FR-16 | Undo/Redo (D25), Kopieren/Einfügen, automatisch anordnen, Minimap, Einpassen |
| FR-17 | Einstellungen im `DetailPanel`, `config-defaults.json` |
| FR-18 | `CardChip`, `PlugCardDialog`, Störung an Gerät und Verbindung per Kontextmenü |
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
- **Presets:** jede Kante gültig nach Erlaubnisliste und über Anschlüsse
  herstellbar (Regelwerk A-5)
- **Testqualität:** Property-based Tests, Mutation-Testing optional
  (siehe „Codequalität und Testabdeckung“)
- **Sicherheit:** Injection-Suite über alle Eingabewege, Fuzzing (siehe
  „Cyber-Security“)
- **E2E (Playwright):** Preset laden → Gerät ergänzen → ungültig
  verbinden → Aktion → Simulation abbrechen. Speichern in Browser A →
  Öffnen in neuem Browser-Kontext B (simuliert „anderer Browser“)
- **Optischer Abgleich:** Screenshots der Hauptansichten im Vergleich
  zu `design/mockup/screenshots/` (manuelle Abnahme)
- **Wo die Tests laufen:** siehe Abschnitt „CI/CD-Pipeline und
  Deployment“

## Umsetzungsphasen (Grundlage für `tasks.md`)

| Phase | Inhalt | Ergebnis |
|---|---|---|
| P0 | Grundgerüst: Vite, React, TS, Lint, Vitest, Tokens, Schriften, App-Shell mit Impressum. **Kern der Pipeline** (Ausbaustufe „Kern ab P0“), lefthook, PR-Vorlage, CSP, `SECURITY.md` | Leere App öffentlich erreichbar, jede Änderung läuft durch die Pipeline |
| P1 | Zod-Schemas, Katalog aus dem Regelwerk, Regel-Engine, Pfadregel, Tests. Rückverfolgbarkeits-Skripte, `dependency-cruiser`, Property-based Tests | Regeln vollständig und nachweisbar getestet |
| P2 | Palette, Canvas, Knoten und Kanten im Mockup-Stil, Verbinden mit Begründung, Karten stecken, Startansicht, Presets, Modus Einfach mit Sammelkanten | Topologien bauen |
| P3 | Speichern und Öffnen als Datei (Topologie, optional Einstellungen), Autosave. Injection-Suite und Fuzzing für alle Eingabewege | Austausch mit anderen Browsern, abgesichert |
| P4 | Kontextmenü, Aktionen, Pfade, Simulation, Detailpanel | Abläufe abspielen |
| P5 | Modus Erweitert: Anschlüsse, Einstellungen, Zonen, Editor-Hilfen, Sicherheitsprüfung | Erweiterte Ansicht |
| P6 | Tutorial, Herausforderungen | Lernfunktionen |
| P7 | Barrierefreiheit-Feinschliff (Listenansicht), Tablet-Layout, E2E, optische Abnahme | Release v1 |
| danach | optionale Ausbaustufen der Pipeline, z. B. Mutation-Testing für die Auswertung in der Arbeit | nach Bedarf |

## Risiken und offene Punkte

- [x] Visuelles Konzept: Mockup in `design/mockup/`.
- [x] Aktionsvoraussetzungen: [Regelwerk 6](./regelwerk.md#6-aktionen-und-voraussetzungen).
- [x] Lizenz: MIT (D19).
- [ ] Inhalte je Ablauf (Erklärtexte) fachlich abnehmen.
- [ ] Zielbrowser: aktuelle Chrome, Edge, Firefox, Safari. File System
  Access API nur in Chrome/Edge. Firefox/Safari nutzen Download/Upload.
- [x] Impressum: Anschrift vor dem öffentlichen Start klären.
- [x] Vor dem Öffentlichstellen: Git-Historie auf private Daten prüfen.
- [x] Datenschutzhinweis nach Art. 13 DSGVO vor dem Start rechtlich
  prüfen lassen (Entwurf im Impressum).
- [x] Nutzungsrechte am Design-System „Organic“ aus Claude Design für die
  Veröffentlichung klären.
- [ ] Erklärtexte nicht wörtlich aus gematik-Dokumenten übernehmen, nur
  sinngemäß mit Quellenangabe.
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
- **Risiko:** Zu viel Pipeline bindet Zeit, die dem fachlichen Kern
  fehlt. Abhilfe: Ausbaustufen, nur der Kern ab P0 (D26).
- **Risiko:** Eine strenge CSP kann Bibliotheken mit Inline-Styles
  stören. Abhilfe: Prüfung in P0, Ausnahme nur begründet.
  **Probe T-004 (2026-11-05):** `@xyflow/react` 12.12.1 mit zwei Knoten und
  einer Kante, `vite build` plus `vite preview`, Chromium (Playwright),
  CSP nach „Härtung der Seite“ ohne `'unsafe-inline'`. Ergebnis: keine
  CSP-Verletzung, Knoten und Kante sichtbar und richtig positioniert
  (`transform: matrix(1, 0, 0, 1, 100, 80)`). `style-src 'self'` reicht,
  keine Ausnahme nötig. Grund: React Flow liefert sein CSS als Datei, und
  Inline-Styles setzt React über das CSSOM, das `style-src` nicht
  blockiert. Gegenprobe: ein per HTML eingefügtes `style`-Element und
  `style`-Attribut wird blockiert, die CSP ist also wirksam. Vorbehalt:
  nur Chromium geprüft. Firefox und Safari laufen später in den
  E2E-Tests.
- **Risiko:** `vite dev` setzt importiertes CSS als Inline-`<style>` ein,
  das `style-src 'self'` blockiert (in der Probe belegt). Abhilfe: Die
  beiden Meta-Tags setzt ein kleines Vite-Plugin (`vite.config.ts`,
  `apply: 'build'`) nur im Build. Die Dev-Seite hat keine CSP.
- **Risiko:** Ablaufdaten machen Presets und Tests mit der Zeit
  ungültig. Abhilfe: festes Simulationsdatum `simDate` in jeder Topologie
  und feste Uhr in den Tests.

## Glossar (Technik)

| Begriff | Bedeutung hier |
|---|---|
| Komponente (React) | wiederverwendbarer Baustein der Oberfläche, z. B. ein Geräteknoten |
| Store | gemeinsamer Speicher für den aktuellen Stand im Browser. Umgesetzt mit der Bibliothek „Zustand“ (Name der Bibliothek, nicht das deutsche Wort) |
| Engine | reine Funktion ohne Oberfläche: Daten rein, Ergebnis raus, z. B. „ist diese Verbindung erlaubt?“ |
| Zod | Bibliothek, die prüft, ob Daten (z. B. eine geöffnete Datei) das erwartete Format haben, und daraus TypeScript-Typen erzeugt |
| IndexedDB | Speicher im Browser, hier nur für den Autosave |
| Anschluss | Buchse an einem Gerät (`port`). Nicht zu verwechseln mit dem Netzport eines Protokolls |
| Fähigkeit | Eintrag im Katalog, der festlegt, was ein Gerätetyp darf (z. B. Karten aufnehmen) |
| Sammelkante | Linie im Modus Einfach, die einen Weg über ausgeblendete Geräte zusammenfasst |
| Aktion / Ablauf | Aktion = Menüeintrag am Gerät. Ablauf = die Schritte, die die Simulation dazu zeigt |
| Coverage | Anteil des Codes, den die Tests ausführen |
| Mutation Score | Anteil absichtlich eingebauter Fehler, den die Tests finden |
| CSP | Content Security Policy: Regel im Browser, welche Inhalte die Seite laden darf |
| SBOM | Stückliste aller verwendeten Bibliotheken (optional) |
| `Disruptable` | Basistyp für alles, was ausfallen kann (Feld `fault`) |

## Nächster Schritt

`tasks.md` aus den Phasen P0 bis P7 ableiten (Task-ID, Bezug auf FR und
Regel-ID, Testkriterium). Erster Task: P0, damit die leere App früh
öffentlich erreichbar ist.
