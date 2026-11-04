# Plan 001: TI Visualizer – interaktiver Netzwerk-Baukasten

**Status:** Entwurf, überarbeitet am 2026-11-03 (reines Frontend ohne Backend, öffentliches Deployment als statische Seite), zur Freigabe durch Justin

> **Hinweis:** Die Spec wurde am 2026-11-03 erweitert (Mockup-Funktionen, vollständiger Komponentenkatalog, eigenes [Regelwerk](./regelwerk.md)). Widersprüche zu Spec und Regelwerk sind aufgelöst (D12, Presets, Regel-Engine, `pathKind`, Tests). Noch nicht nachgezogen: Katalogformat für Anschlüsse, Zonen, Einstellungen, Tutorial, Herausforderungen und Prüfregeln sowie das Topologie-Schema dafür.
**Basis:** [spec.md](./spec.md) (freigegeben)

## Leitentscheidungen

| # | Entscheidung | Begründung |
|---|---|---|
| D1 | **Reines Frontend** (TypeScript, React), **kein Backend** | Vom Nutzer festgelegt (2026-11-03). Die Fachdaten sind rein lesend und klein, ein Server bringt keinen Mehrwert. Ersetzt den früheren Spring-Boot-Ansatz. |
| D2 | **Fachdaten als versionierte JSON-Dateien** im Repo (`catalog/`), beim Build ins Frontend gebündelt | Vom Nutzer gewünscht. Versionierung über Git plus Versionsverzeichnis. Keine Datenbank, kein Server. |
| D3 | **Topologien** lokal im Browser (IndexedDB) mit **JSON-Export/Import** als Datei | Keine Accounts nötig (Spec: außerhalb Scope), Topologien bleiben portabel und lassen sich weitergeben. |
| D4 | Die Regel-Engine ist **datengetrieben**: Verbindungsregeln und Aktionsabläufe stehen als JSON, nicht im Code | Spec-Änderungen brauchen ein Daten-Update statt einer Codeänderung. |
| D5 | **Katalog-Validierung zur Build-Zeit**: Schema- und Referenzprüfung läuft als Test in der CI; schlägt sie fehl, wird nicht deployt | Ersetzt die frühere Prüfung beim Backend-Start. Fehlerhafte Daten erreichen so nie die öffentliche Seite. |
| D6 | **React Flow** (xyflow) als Canvas-Framework | Knoten sind React-Komponenten (freie SVG-Symbole, CSS), eigene Kanten mit Protokoll-Label und Paket-Animation, `isValidConnection` bindet die Regel-Engine ein, Tastatur-Fokus und Kontextmenü möglich. Alternativen: JointJS (Editor-Teil kostenpflichtig), Konva (alles selbst bauen), Cytoscape (auf Betrachten ausgelegt), tldraw (freies Zeichnen statt Regeln). |
| D7 | Simulation ist ein **abgespielter Ablauf aus Schritten** (Daten), keine echte Protokollimplementierung | Lernzweck; Log-Replay/Realtime sind out of scope. |
| D8 | **Öffentliches Deployment als statische Seite auf GitHub Pages**, automatisch per GitHub Actions bei Push auf `main` | Vom Nutzer festgelegt. Jeder kann die Seite ohne Installation im Browser öffnen. Kein Server, keine Kosten. Das Repo wird dafür öffentlich. |
| D9 | **Nur Deutsch** in v1, keine i18n-Infrastruktur | Vom Nutzer festgelegt. Texte liegen trotzdem im Katalog, nicht im Code verstreut. |
| D10 | **Barrierefreiheit** als Anforderung: Rot-Grün-Schwäche und volle Tastaturbedienung | Vom Nutzer festgelegt, siehe eigener Abschnitt. |
| D11 | **Optik zuerst als Mockup** (Claude Design), bevor UI-Tasks starten | Vom Nutzer festgelegt. Ergebnis wird in `design/` abgelegt und ist Vorlage für die Komponenten. |
| D12 | **Karten sind Zustand des Kartenterminals**, keine eigenen Knoten; „Karte stecken“ am Terminal wählt eine freie Karte (Regelwerk K-1, K-2) | Geändert 2026-11-03 (vorher: Karten als freie Knoten), folgt Mockup und Regelwerk. |
| D13 | **Zod-Schemas** als einzige Quelle für Katalog- und Topologie-Format | Ein Schema liefert Laufzeitprüfung (Katalog im Test, importierte Topologie-Dateien im Browser) und TypeScript-Typen. Ersetzt JSON Schema plus generierte OpenAPI-Typen. |
| D14 | **Single-Page-App ohne Router**, Vite `base` auf den Repo-Pfad (`/ti-visualizer/`) gesetzt | GitHub Pages kennt kein Server-Routing; mit nur einer Ansicht entfallen 404-Probleme bei Deep Links. |
| D15 | Kanten sind **ungerichtet**, Anschlüsse je Gerät laut Regelwerk (Spec FR-14, anzupassen); die Pfadrichtung ergibt sich aus der Aktion | Vom Nutzer bestätigt. Regeln gelten symmetrisch. |
| D16 | Katalog-JSON wird **von Claude aus Spec und Regelwerk abgeleitet** und von Justin fachlich geprüft | Vom Nutzer festgelegt. Die Spec bleibt Quelle der Wahrheit; Abweichungen werden in der Spec korrigiert, nicht nur im JSON. |
| D17 | **Mockup und `tasks.md` laufen parallel**; Tasks für Katalog und Regel-Engine hängen nicht von der Optik ab | Vom Nutzer bestätigt. UI-Tasks starten erst nach dem Mockup. |
| D18 | **Jede Regel des Regelwerks ist ein eigener Testfall** | Vom Nutzer bestätigt, entspricht dem Erfolgskriterium der Spec. |
| D19 | **MIT-Lizenz** (`LICENSE`) und **Impressum** (`IMPRESSUM.md`) mit Justin Riedel als Verantwortlichem und Verweis auf die Bachelorarbeit | Vom Nutzer festgelegt (2026-11-03). Die App verlinkt das Impressum dauerhaft im Fußbereich und zeigt es als Dialog an (kein Router nötig, D14). |

## Technologie-Stack

- **App:** TypeScript, React, Vite, [React Flow](https://reactflow.dev/), Zustand als State-Store, Zod, pnpm
- **Katalog:** JSON-Dateien, per Vite-Import gebündelt, geprüft mit Zod
- **Persistenz:** IndexedDB (über `idb-keyval`) plus Datei-Download/-Upload für JSON
- **Tests:** Vitest (Katalog, Regel-Engine, Simulation), Playwright (E2E), Axe für Barrierefreiheit
- **Deployment:** GitHub Actions → GitHub Pages
- **Repo-Layout:**

```
src/             React-App (Komponenten, Engines, Stores)
catalog/         versionierte Fachdaten (JSON)
design/          Mockups (Claude Design) und Design-Tokens
tests/e2e/       Playwright-Tests
.github/workflows/  CI und Deployment
specs/           Spec-Driven-Development-Dokumente
```

Das bestehende Repo `ti-network-visualizer` bleibt Referenz; der IDP-Pfad und die Knotendarstellung können daraus übernommen werden.

## Architektur

```
┌──────────────────────── Browser (statische Seite) ────────────────────────┐
│  Palette │ Canvas (React Flow) │ Detailpanel │ Sim-Player                  │
│                 │                       │                                   │
│        Regel-Engine (TS)         Simulations-Engine (TS)                   │
│                 │                       │                                   │
│        Katalog (gebündeltes JSON)   Topologie-Store (IndexedDB)            │
│                                         │                                   │
│                                  JSON-Export / -Import (Datei)             │
└────────────────────────────────────────────────────────────────────────────┘
        ▲
        │ ausgeliefert als HTML/JS/CSS von GitHub Pages
        │
  GitHub Actions: Tests (inkl. Katalog-Validierung) → Build → Deploy
```

Es gibt keine Netzwerkzugriffe zur Laufzeit. Die App funktioniert nach dem ersten Laden vollständig im Browser.

## Katalog (Fachdaten, FR-12)

Verzeichnis `catalog/`, je Version ein Unterordner. Eine Datei `catalog/active.json` nennt die aktive Version. Frühere Versionen bleiben im Repo; die Git-Historie dokumentiert Änderungen.

```
catalog/
  active.json              { "version": "1" }
  1/
    meta.json              version, Datum, Notiz
    device-types.json
    connection-rules.json
    exclusion-rules.json
    protocols.json
    actions.json           inkl. Schritte je Aktion
    presets.json
```

Gebündelt wird nur die aktive Version. Ein Vitest-Test prüft jede Datei gegen ihr Zod-Schema und prüft Referenzen (jede Regel zeigt auf existierende Gerätetypen und Protokolle, jede Aktion auf existierende Schritte). Schlägt der Test fehl, bricht die CI ab und es wird nicht deployt.

| Datei | Inhalt | Wichtige Felder |
|---|---|---|
| `device-types` | Gerätetypen | `key` (z. B. `egk`), `category` (Primärsystem, Smartcard, Kartenterminal, Netzwerk, Fachdienst), `label`, `icon`, `variant` (PVS/KIS/AVS) |
| `connection-rules` | Erlaubnisliste (Regelwerk 4.2) | `from`, `to`, `via`, `protocols[]`, `mode` (Einfach/Erweitert), `source` |
| `reason-rules` | Begründungsliste (Regelwerk 4.3) | `id`, `match`, `explanation`, `source` |
| `exclusion-rules` | Gegenseitige Ausschlüsse | `groupA`, `groupB`, `explanation` (Konnektor vs. TI-Gateway) |
| `protocols` | Details für FR-11 | `id`, `name`, `port`, `tlsLevel`, `dataFormat`, `description` |
| `actions` | Operationskatalog | `key`, `label`, `appliesTo[]`, `pathKind` (`ti` oder `local`), `requires` (Bedingungen), `steps[]` (`order`, `fromRole`, `toRole`, `label`, `explanation`, `protocol`) |
| `presets` | Arztpraxis, Apotheke, Krankenhaus | `key`, `label`, `topology` (gleiches Schema wie gespeicherte Topologie) |

### Topologie (IndexedDB und JSON-Datei)

```ts
interface Topology {
  schemaVersion: number;      // für Migration alter Dateien
  catalogVersion: string;     // Katalogstand beim Speichern
  name: string;
  updatedAt: string;          // ISO-8601
  nodes: { id: string; type: string; x: number; y: number; label?: string }[];
  edges: { id: string; from: string; to: string }[];
}
```

- **Speichern/Laden:** Topologien liegen unter ihrem Namen in IndexedDB des jeweiligen Browsers.
- **Export/Import:** Download als `<name>.ti.json`, Import per Dateiauswahl oder Drag & Drop. Der Import prüft die Datei mit dem Zod-Schema und meldet Fehler verständlich.
- **Migration:** Ist `schemaVersion` älter, läuft eine Migrationskette. Weicht `catalogVersion` ab, wird die Topologie gegen den aktuellen Katalog erneut validiert und Verstöße werden gemeldet, nicht stillschweigend entfernt.

Hinweis für Nutzer in der App: Gespeicherte Topologien bleiben nur in diesem Browser. Wer sie sichern oder weitergeben will, exportiert sie als Datei.

## Presets (Standardausstattung)

Verbindlich ist die Tabelle im [Regelwerk, Abschnitt 13](./regelwerk.md#13-presets) (vier Presets inkl. Klinikum, Stand 2026-11-03). Die folgende Kurzfassung dient nur dem Überblick.

| Preset | Geräte |
|---|---|
| Arztpraxis | PVS, Konnektor, 2 Kartenterminals (SMC-B, HBA, eGK), Switch, VPN-Zugangsdienst, sechs Fachdienste |
| Apotheke | AVS, Konnektor, 1 Kartenterminal (SMC-B, eGK), Switch, VPN-Zugangsdienst, IDP, E-Rezept, ePA |
| Krankenhaus | KIS, 2 PCs, **TI-Gateway**, 2 Kartenterminals, Switches, Router, VPN-Zugangsdienst, sechs Fachdienste |
| Klinikum | KIS, RIS, LIS, PCs, Tablet, **Highspeed-Konnektor**, 3 Kartenterminals, Switches, AP, Router, Zonen, sechs Fachdienste |

## Regel-Engine (FR-3, FR-4)

`validateConnection(topology, fromNode, toNode, rules) → { ok } | { ok: false, reason }`

Umsetzung der Prüflogik aus [Regelwerk 4.0](./regelwerk.md#40-prüflogik-entschieden-2026-11-03):

1. Grundprüfungen (Selbstverbindung, Doppelung, freier verträglicher Anschluss, Kartenterminal an höchstens einem Konnektor) und Ausschlüsse (Konnektor/TI-Gateway). Schlägt eine fehl: ungültig.
2. Steht `(from.type, to.type)` in der Erlaubnisliste (`connection-rules`)? Dann gültig.
3. Sonst ungültig; `reason` ist der Text der passenden Begründungsregel oder die allgemeine Meldung mit den erlaubten Partnern.
4. Anzahl pro Typ ist unbegrenzt.

Ein Test prüft, dass keine Begründungsregel ein erlaubtes Paar erfasst.

`reason` ist immer ein erklärender deutscher Text aus den Daten (Spec: „mit Begründung“).

## Aktions- und Simulations-Engine (FR-6 bis FR-10)

**Aktionen sitzen am Knoten.** Auch „Karte stecken“ ist eine Aktion am Kartenterminal (Nutzervorgabe). Das Kontextmenü eines Geräts zeigt alle Aktionen seines Typs.

**Verfügbarkeit (FR-6, FR-7):** `availableActions(node, topology)` liefert alle Aktionen aus `appliesTo`, jeweils mit `enabled` und `disabledReason`. Eine Aktion ist aktiv, wenn ihr Pfad in der Topologie vollständig existiert, z. B. für „eRezept ausstellen“ auf einem PVS: Kartenterminal mit SMC-B und HBA, Konnektor oder TI-Gateway, VPN-Zugangsdienst, E-Rezept-Fachdienst.

**Pfadauflösung (FR-8):** Der Pfad wird per Suche über die Kanten der Topologie vom auslösenden Gerät bestimmt, nicht aus einer festen Vorlage. Bei `local` (NFDM/eMP) läuft der Pfad über den Konnektor (Fachmodule NFDM/AMTS) bis zur eGK; VPN-Zugangsdienst und Fachdienste sind nicht beteiligt (Regelwerk 7).

**Abspielen (FR-9, FR-10):** Die `steps` werden auf den aufgelösten Pfad abgebildet (Rollen wie `initiator`, `terminal`, `gateway` werden an konkrete Knoten gebunden). Der Player ist ein Zustandsautomat: `idle → running(step n) → done | cancelled`. Er bietet Play/Pause/Schritt, Tempo und Abbrechen; Erklärtext und Protokoll-Details je Schritt kommen aus dem Katalog.

## Deployment (D8)

- **Workflow `.github/workflows/deploy.yml`:** bei Push auf `main` → `pnpm install` → Lint, Typecheck, Vitest (inkl. Katalog-Validierung) → `vite build` → Upload von `dist/` mit `actions/upload-pages-artifact` → `actions/deploy-pages`.
- **Pull Requests:** derselbe Workflow ohne Deploy-Schritt, damit Fehler vor dem Merge auffallen.
- **Öffentliche Adresse:** `https://jurie2000.github.io/ti-visualizer/`. Eine eigene Domain ist später über `CNAME` möglich.
- **Vite-Konfiguration:** `base: '/ti-visualizer/'`, damit Pfade zu JS/CSS unter dem Repo-Unterpfad stimmen.
- **Lokal:** `pnpm dev` für Entwicklung, `pnpm build && pnpm preview` prüft den Produktions-Build.
- **Voraussetzung:** Das Repo wird für das Deployment **öffentlich** gestellt (vom Nutzer bestätigt, 2026-11-03). Damit ist GitHub Pages kostenlos nutzbar. In den Repo-Einstellungen wird unter *Pages* die Quelle „GitHub Actions“ gewählt.

## Barrierefreiheit (D10)

**Rot-Grün-Schwäche**
- Zustände (gültig/ungültig, aktiv/ausgegraut, Schritt läuft/fertig) werden nie allein über Farbe unterschieden. Zusätzlich gibt es Icon, Muster oder Linienstil (durchgezogen, gestrichelt) und Text.
- Farbpalette farbenblind-sicher, z. B. nach Okabe-Ito. Die Kategorien der Palette bekommen zusätzlich eigene Symbolformen.
- Kontrastprüfung nach WCAG AA für Text und Symbole.
- Ungültige Verbindung: Meldung mit Icon und Text, kein bloßes Rot.

**Tastaturbedienung**
- Alles ist ohne Maus erreichbar: Palette, Knoten, Kanten, Kontextmenü, Detailpanel, Simulations-Player.
- Gerät hinzufügen: in der Palette per Enter (platziert am Cursor oder in freier Fläche).
- Verbinden: Quelle wählen, dann Ziel wählen, gleiche Auswahllogik wie in Spec-Szenario 3, per Tastatur bedienbar.
- Kontextmenü: Menütaste oder Shift+F10 am fokussierten Knoten, Pfeiltasten, Esc.
- Knoten mit Pfeiltasten verschieben, Fokusreihenfolge sinnvoll, sichtbarer Fokusrahmen.
- Simulation: Play/Pause/Schritt/Abbrechen per Taste, aktueller Erklärtext als `aria-live`-Bereich.
- Semantik: Rollen und Labels für Knoten und Kanten (z. B. „Konnektor, verbunden mit Kartenterminal 1“).

Tests: Axe-Prüfung in Playwright, plus ein E2E-Durchlauf ausschließlich per Tastatur.

## Abdeckung der Anforderungen

| FR | Umsetzung |
|---|---|
| FR-1 | Palette aus `device-types`, gruppiert nach `category` |
| FR-2 | `presets.json` plus „leerer Start“ |
| FR-3 | React-Flow-Verbinden (Quelle/Ziel), keine Typ-Limits |
| FR-4 | Regel-Engine, `connection-rules` + `exclusion-rules`, Begründungstext |
| FR-5 | Topologie-Store in IndexedDB, JSON-Export/Import als Datei |
| FR-6, FR-7 | `availableActions` mit `enabled`/`disabledReason`, Kontextmenü |
| FR-8 | Pfadsuche über die Topologie, `pathKind` |
| FR-9, FR-10 | Simulations-Player mit Zustandsautomat |
| FR-11 | Detailpanel aus `protocols` |
| FR-12 | Versionierter Katalog in `catalog/` (Git), `schemaVersion` für Topologien |

## Teststrategie

- **Katalog (Vitest):** Zod-Schema- und Referenzvalidierung; fehlerhafte Daten lassen die CI scheitern, es wird nicht deployt
- **Regel-Engine (Vitest):** Tabellentest, ein eigener Testfall je Regel des Regelwerks (jedes erlaubte Paar gültig, jede Begründungsregel greift, Grundprüfungen, Konnektor/TI-Gateway-Ausschluss) plus Konsistenztest Erlaubnis- gegen Begründungsliste
- **Aktionen:** je Katalog-Aktion ein Test mit Topologie, in der sie aktiv ist, und einer, in der sie ausgegraut ist
- **Simulation:** Schrittfolge je Aktion, Abbruch mittendrin, `local` berührt weder VPN-Zugangsdienst noch Fachdienst
- **Persistenz:** Roundtrip speichern/laden, Export/Import einer Datei, Ablehnung kaputter Dateien mit Meldung, Migration alter `schemaVersion`
- **Barrierefreiheit:** Axe-Checks, Tastatur-E2E, Kontrastprüfung der Design-Tokens
- **E2E (Playwright, gegen `vite preview`):** Preset laden → Gerät ergänzen → ungültig verbinden (Meldung) → Aktion per Rechtsklick → Simulation abbrechen (entspricht den Erfolgskriterien der Spec)

## Risiken und offene Punkte

- [x] **Visuelles Konzept:** erledigt, Mockup liegt in `design/mockup/`. Ursprünglich: Mockup mit Claude Design (D11): Icon-Familie, Farbcodierung, Kantenstil, Hell/Dunkel. Ergebnis nach `design/`, vor dem ersten UI-Task.
- [ ] **Inhalte je Aktion:** `steps`-Texte (Erklärtexte, Protokoll pro Schritt) sind Redaktionsarbeit und werden mit Justin fachlich abgenommen.
- [x] **Aktionsvoraussetzungen:** festgelegt in [Regelwerk, Abschnitt 6](./regelwerk.md#6-aktionen-und-voraussetzungen), jede mit Quelle.
- [ ] **Zielbrowser:** Aktuelle Evergreen-Browser (Chrome, Firefox, Safari, Edge) als Annahme.
- [x] **Lizenz:** MIT (D19).
- [ ] **Impressum:** Angaben zur Bachelorarbeit eingetragen (Titel ist Arbeitstitel). Die Anschrift fehlt bewusst vorerst; vor dem öffentlichen Start klären, ob sie nötig ist.
- [ ] **Vor dem Öffentlichstellen:** prüfen, dass keine privaten Daten oder Zugangsdaten in der Git-Historie stehen.
- **Risiko:** Gespeicherte Topologien leben nur im Browser und gehen beim Löschen der Browserdaten verloren. Gegenmittel: sichtbarer Hinweis und Export als Datei.
- **Risiko:** Katalogänderungen brauchen einen neuen Build. Bei Deployment per Actions ist das ein Push auf `main`, also unkritisch.

## Nächster Schritt

Parallel: (1) Mockup mit Claude Design nach `design/`, (2) `tasks.md` mit einzeln umsetzbaren, überprüfbaren Arbeitspaketen (Task-ID, Bezug auf FR, Testkriterium); erster Task ist das Grundgerüst mit Vite, CI und Deployment, damit die leere App früh öffentlich erreichbar ist. Danach Ableitung des Katalogs aus der Spec (D16).
