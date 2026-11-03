# Plan 001: TI Visualizer – interaktiver Netzwerk-Baukasten

**Status:** Entwurf, überarbeitet am 2026-11-03 (reines Frontend ohne Backend, öffentliches Deployment als statische Seite), zur Freigabe durch Justin
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
| D12 | **Karten sind freie Knoten**; die Aktion „Karte stecken“ am Kartenterminal wählt eine Karte und legt die Kante (Steckverbindung) an | Vom Nutzer bestätigt. Die Verbindungsregel „Smartcard → Kartenterminal“ bleibt gültig, die Aktion prüft sie über die Regel-Engine. |
| D13 | **Zod-Schemas** als einzige Quelle für Katalog- und Topologie-Format | Ein Schema liefert Laufzeitprüfung (Katalog im Test, importierte Topologie-Dateien im Browser) und TypeScript-Typen. Ersetzt JSON Schema plus generierte OpenAPI-Typen. |
| D14 | **Single-Page-App ohne Router**, Vite `base` auf den Repo-Pfad (`/ti-visualizer/`) gesetzt | GitHub Pages kennt kein Server-Routing; mit nur einer Ansicht entfallen 404-Probleme bei Deep Links. |
| D15 | Kanten sind **ungerichtet**, ein Anschluss pro Gerät; die Pfadrichtung ergibt sich aus der Aktion | Vom Nutzer bestätigt. Regeln gelten symmetrisch. |
| D16 | Katalog-JSON wird **von Claude aus der Spec abgeleitet** und von Justin fachlich geprüft | Vom Nutzer festgelegt. Die Spec bleibt Quelle der Wahrheit; Abweichungen werden in der Spec korrigiert, nicht nur im JSON. |
| D17 | **Mockup und `tasks.md` laufen parallel**; Tasks für Katalog und Regel-Engine hängen nicht von der Optik ab | Vom Nutzer bestätigt. UI-Tasks starten erst nach dem Mockup. |
| D18 | **Jede Regel der Verbindungsmatrix ist ein eigener Testfall** | Vom Nutzer bestätigt, entspricht dem Erfolgskriterium der Spec. |
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
| `connection-rules` | Verbindungsmatrix | `from`, `to`, `via` (physisch/NFC/TCP/VPN/Internet), `protocols[]`, `explanation` |
| `exclusion-rules` | Gegenseitige Ausschlüsse | `groupA`, `groupB`, `explanation` (Konnektor vs. TI-Gateway) |
| `protocols` | Details für FR-11 | `id`, `name`, `port`, `tlsLevel`, `dataFormat`, `description` |
| `actions` | Operationskatalog | `key`, `label`, `appliesTo[]`, `pathKind` (`ti` oder `card_only`), `requires` (Bedingungen), `steps[]` (`order`, `fromRole`, `toRole`, `label`, `explanation`, `protocol`) |
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

Jedes Preset ist eine fertig verbundene Topologie; Karten stecken bereits an den Terminals, damit Aktionen sofort ausführbar sind. Die Kanten folgen der Verbindungsmatrix.

| Preset | Geräte |
|---|---|
| Arztpraxis | 1 PVS, 1 Konnektor, 1 VPN-Zugangsdienst, 2 Kartenterminals, 1 SMC-B, 1 HBA, 1 eGK, Fachdienste: VSDM, E-Rezept, KIM, IDP, ePA |
| Apotheke | 1 AVS, 1 Konnektor, 1 VPN-Zugangsdienst, 1 Kartenterminal, 1 SMC-B, 1 eGK, Fachdienste: VSDM, E-Rezept, KIM, IDP, ePA |
| Krankenhaus | 2 KIS, 1 Highspeed-Konnektor, 1 VPN-Zugangsdienst, 2 Kartenterminals, 1 SMC-B, 1 HBA, 1 eGK, Fachdienste: VSDM, E-Rezept, KIM, TIM, IDP, ePA |

## Regel-Engine (FR-3, FR-4)

`validateConnection(topology, fromNode, toNode, rules) → { ok } | { ok: false, reason }`

1. Existiert eine `connection-rule` für `(from.type, to.type)`? Sonst ungültig, mit der `explanation` der passenden „explizit ungültig“-Regel.
2. Verletzt das Hinzufügen eine `exclusion-rule` (Konnektor/TI-Gateway)? Dann ungültig.
3. Anzahl pro Typ ist unbegrenzt (keine Prüfung).

`reason` ist immer ein erklärender deutscher Text aus den Daten (Spec: „mit Begründung“).

## Aktions- und Simulations-Engine (FR-6 bis FR-10)

**Aktionen sitzen am Knoten.** Auch „Karte stecken“ ist eine Aktion am Kartenterminal (Nutzervorgabe). Das Kontextmenü eines Geräts zeigt alle Aktionen seines Typs.

**Verfügbarkeit (FR-6, FR-7):** `availableActions(node, topology)` liefert alle Aktionen aus `appliesTo`, jeweils mit `enabled` und `disabledReason`. Eine Aktion ist aktiv, wenn ihr Pfad in der Topologie vollständig existiert, z. B. für „eRezept ausstellen“ auf einem PVS: Kartenterminal mit SMC-B und HBA, Konnektor oder TI-Gateway, VPN-Zugangsdienst, E-Rezept-Fachdienst.

**Pfadauflösung (FR-8):** Der Pfad wird per Suche über die Kanten der Topologie vom auslösenden Gerät bestimmt, nicht aus einer festen Vorlage. Bei `card_only` (NFDM/eMP) endet die Suche an der eGK; Konnektor und Fachdienste sind nicht beteiligt.

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
- **Regel-Engine (Vitest):** Tabellentest, ein eigener Testfall je Zeile der Verbindungsmatrix (jede erlaubte Regel gültig, jede „explizit ungültig“-Regel abgelehnt, Konnektor/TI-Gateway-Ausschluss)
- **Aktionen:** je Katalog-Aktion ein Test mit Topologie, in der sie aktiv ist, und einer, in der sie ausgegraut ist
- **Simulation:** Schrittfolge je Aktion, Abbruch mittendrin, `card_only` berührt weder Konnektor noch Fachdienst
- **Persistenz:** Roundtrip speichern/laden, Export/Import einer Datei, Ablehnung kaputter Dateien mit Meldung, Migration alter `schemaVersion`
- **Barrierefreiheit:** Axe-Checks, Tastatur-E2E, Kontrastprüfung der Design-Tokens
- **E2E (Playwright, gegen `vite preview`):** Preset laden → Gerät ergänzen → ungültig verbinden (Meldung) → Aktion per Rechtsklick → Simulation abbrechen (entspricht den Erfolgskriterien der Spec)

## Risiken und offene Punkte

- [ ] **Visuelles Konzept:** Mockup mit Claude Design (D11): Icon-Familie, Farbcodierung, Kantenstil, Hell/Dunkel. Ergebnis nach `design/`, vor dem ersten UI-Task.
- [ ] **Inhalte je Aktion:** `steps`-Texte (Erklärtexte, Protokoll pro Schritt) sind Redaktionsarbeit und werden mit Justin fachlich abgenommen.
- [ ] **Aktionsvoraussetzungen:** Die genauen `requires`-Bedingungen je Aktion (z. B. HBA nötig für QES) werden pro Aktion beim Anlegen der Daten abgestimmt.
- [ ] **Zielbrowser:** Aktuelle Evergreen-Browser (Chrome, Firefox, Safari, Edge) als Annahme.
- [x] **Lizenz:** MIT (D19).
- [ ] **Impressum vervollständigen:** Anschrift, Titel der Bachelorarbeit, Hochschule, Studiengang und Jahr in `IMPRESSUM.md` eintragen, bevor die Seite öffentlich geht. Hinweis „kein offizielles gematik-Angebot“ ist enthalten.
- [ ] **Vor dem Öffentlichstellen:** prüfen, dass keine privaten Daten oder Zugangsdaten in der Git-Historie stehen.
- **Risiko:** Gespeicherte Topologien leben nur im Browser und gehen beim Löschen der Browserdaten verloren. Gegenmittel: sichtbarer Hinweis und Export als Datei.
- **Risiko:** Katalogänderungen brauchen einen neuen Build. Bei Deployment per Actions ist das ein Push auf `main`, also unkritisch.

## Nächster Schritt

Parallel: (1) Mockup mit Claude Design nach `design/`, (2) `tasks.md` mit einzeln umsetzbaren, überprüfbaren Arbeitspaketen (Task-ID, Bezug auf FR, Testkriterium); erster Task ist das Grundgerüst mit Vite, CI und Deployment, damit die leere App früh öffentlich erreichbar ist. Danach Ableitung des Katalogs aus der Spec (D16).
