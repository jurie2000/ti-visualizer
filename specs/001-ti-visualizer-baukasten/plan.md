# Plan 001: TI Visualizer – interaktiver Netzwerk-Baukasten

**Status:** Entwurf, überarbeitet am 2026-09-20 (Stack, Backend, Persistenz, Barrierefreiheit), zur Freigabe durch Justin
**Basis:** [spec.md](./spec.md) (freigegeben)

## Leitentscheidungen

| # | Entscheidung | Begründung |
|---|---|---|
| D1 | Frontend (TypeScript, React) + Backend (**Spring Boot**) | Vom Nutzer festgelegt. Das Backend liefert die Fachdaten über eine REST-API. |
| D2 | **Fachdaten als versionierte JSON-Dateien** im Repo (`catalog/`), keine Datenbank | Vom Nutzer gewünscht. Die Daten sind rein lesend und klein. Versionierung übernimmt Git plus ein Versionsverzeichnis. Spart Betrieb und Migrationen. |
| D3 | **Topologien** lokal im Browser (IndexedDB) mit JSON-Export/Import | Keine Accounts nötig (Spec: außerhalb Scope), Topologien bleiben portabel. |
| D4 | Die Regel-Engine ist **datengetrieben**: Verbindungsregeln und Aktionsabläufe stehen als JSON, nicht im Code | Spec-Änderungen brauchen ein Daten-Update statt einer Codeänderung. |
| D5 | Validierung läuft **im Frontend** gegen die geladenen Regeln; das Backend liefert sie nur aus und prüft ihre Konsistenz | Sofortiges Feedback beim Verbinden, kein Roundtrip. Es gibt nur eine Engine (TypeScript), keine Doppelimplementierung. |
| D6 | **React Flow** (xyflow) als Canvas-Framework | Knoten sind React-Komponenten (freie SVG-Symbole, CSS), eigene Kanten mit Protokoll-Label und Paket-Animation, `isValidConnection` bindet die Regel-Engine ein, Tastatur-Fokus und Kontextmenü möglich. Alternativen: JointJS (Editor-Teil kostenpflichtig), Konva (alles selbst bauen), Cytoscape (auf Betrachten ausgelegt), tldraw (freies Zeichnen statt Regeln). |
| D7 | Simulation ist ein **abgespielter Ablauf aus Schritten** (Daten), keine echte Protokollimplementierung | Lernzweck; Log-Replay/Realtime sind out of scope. |
| D8 | Backend startet per **Skript** und ist zusätzlich als **Docker-Container** lauffähig | Vom Nutzer festgelegt. Gleiche Konfiguration über Umgebungsvariablen. |
| D9 | **Nur Deutsch** in v1, keine i18n-Infrastruktur | Vom Nutzer festgelegt. Texte liegen trotzdem im Katalog, nicht im Code verstreut. |
| D10 | **Barrierefreiheit** als Anforderung: Rot-Grün-Schwäche und volle Tastaturbedienung | Vom Nutzer festgelegt, siehe eigener Abschnitt. |
| D11 | **Optik zuerst als Mockup** (Claude Design), bevor UI-Tasks starten | Vom Nutzer festgelegt. Ergebnis wird in `design/` abgelegt und ist Vorlage für die Komponenten. |
| D12 | **Karten sind freie Knoten**; die Aktion „Karte stecken“ am Kartenterminal wählt eine Karte und legt die Kante (Steckverbindung) an | Vom Nutzer bestätigt. Die Verbindungsregel „Smartcard → Kartenterminal“ bleibt gültig, die Aktion prüft sie über die Regel-Engine. |
| D13 | **Java 21 + Maven** für das Backend | Vom Nutzer bestätigt. |
| D14 | Das Frontend wird **vom Spring-Boot-Container mit ausgeliefert** (statische Resources), im Dev läuft Vite separat mit Proxy | Vom Nutzer bestätigt. Ein Container, ein Port, kein CORS in Produktion. |
| D15 | Kanten sind **ungerichtet**, ein Anschluss pro Gerät; die Pfadrichtung ergibt sich aus der Aktion | Vom Nutzer bestätigt. Regeln gelten symmetrisch. |
| D16 | Katalog-JSON wird **von Claude aus der Spec abgeleitet** und von Justin fachlich geprüft | Vom Nutzer festgelegt. Die Spec bleibt Quelle der Wahrheit; Abweichungen werden in der Spec korrigiert, nicht nur im JSON. |
| D17 | **Mockup und `tasks.md` laufen parallel**; Tasks für Katalog, Backend und Regel-Engine hängen nicht von der Optik ab | Vom Nutzer bestätigt. UI-Tasks starten erst nach dem Mockup. |
| D18 | **Jede Regel der Verbindungsmatrix ist ein eigener Testfall** | Vom Nutzer bestätigt, entspricht dem Erfolgskriterium der Spec. |

## Technologie-Stack

- **Frontend:** TypeScript, React, Vite, [React Flow](https://reactflow.dev/), Zustand als State-Store, pnpm
- **Backend:** Java 21, Maven, Spring Boot (Web, Actuator), OpenAPI über springdoc
- **Katalog:** JSON-Dateien mit JSON Schema, geladen beim Start
- **Typen im Frontend:** aus dem OpenAPI-Schema des Backends generiert (`openapi-typescript`), damit Backend und Frontend nicht auseinanderlaufen
- **Tests:** Vitest (Regel-Engine, Simulation), Playwright (E2E), JUnit (Katalog-Validierung, API), Axe für Barrierefreiheit
- **Betrieb:** Start-Skripte (`scripts/`) und Dockerfile, siehe Abschnitt Betrieb
- **Repo-Layout:**

```
apps/web/        React-Frontend
apps/api/        Spring-Boot-Service (Maven)
catalog/         versionierte Fachdaten (JSON) + JSON Schema
design/          Mockups (Claude Design) und Design-Tokens
scripts/         Start-Skripte
specs/           Spec-Driven-Development-Dokumente
```

Das bestehende Repo `ti-network-visualizer` bleibt Referenz; der IDP-Pfad und die Knotendarstellung können daraus übernommen werden.

## Architektur

```
┌────────────────────────── Browser ──────────────────────────┐
│  Palette │ Canvas (React Flow) │ Detailpanel │ Sim-Player    │
│                 │                       │                     │
│        Regel-Engine (TS)         Simulations-Engine (TS)     │
│                 │                                              │
│        Katalog-Cache        Topologie-Store (IndexedDB)       │
└──────────────────┬───────────────────────────────────────────┘
                   │ REST/JSON (nur lesend)
┌──────────────────▼──────────────────┐
│ Spring Boot API                      │
│  CatalogService (lädt + validiert)   │
└──────────────────┬──────────────────┘
                   │
             catalog/*.json (versioniert in Git)
```

## Katalog (Fachdaten, FR-12)

Verzeichnis `catalog/`, je Version ein Unterordner. Eine Datei `catalog/active.json` nennt die aktive Version. Frühere Versionen bleiben abrufbar; die Git-Historie dokumentiert Änderungen.

```
catalog/
  active.json              { "version": "1" }
  schema/                  JSON Schema je Dateityp
  1/
    meta.json              version, Datum, Notiz
    device-types.json
    connection-rules.json
    exclusion-rules.json
    protocols.json
    actions.json           inkl. Schritte je Aktion
    presets.json
```

Beim Start validiert das Backend jede Datei gegen ihr Schema und prüft Referenzen (jede Regel zeigt auf existierende Gerätetypen und Protokolle, jede Aktion auf existierende Schritte). Schlägt das fehl, startet der Dienst nicht. Fehlerhafte Daten fallen so beim Start auf, nicht erst im Browser.

| Datei | Inhalt | Wichtige Felder |
|---|---|---|
| `device-types` | Gerätetypen | `key` (z. B. `egk`), `category` (Primärsystem, Smartcard, Kartenterminal, Netzwerk, Fachdienst), `label`, `icon`, `variant` (PVS/KIS/AVS) |
| `connection-rules` | Verbindungsmatrix | `from`, `to`, `via` (physisch/NFC/TCP/VPN/Internet), `protocols[]`, `explanation` |
| `exclusion-rules` | Gegenseitige Ausschlüsse | `groupA`, `groupB`, `explanation` (Konnektor vs. TI-Gateway) |
| `protocols` | Details für FR-11 | `id`, `name`, `port`, `tlsLevel`, `dataFormat`, `description` |
| `actions` | Operationskatalog | `key`, `label`, `appliesTo[]`, `pathKind` (`ti` oder `card_only`), `requires` (Bedingungen), `steps[]` (`order`, `fromRole`, `toRole`, `label`, `explanation`, `protocol`) |
| `presets` | Arztpraxis, Apotheke, Krankenhaus | `key`, `label`, `topology` (gleiches Schema wie gespeicherte Topologie) |

### Topologie (Client, IndexedDB und JSON-Datei)

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

Beim Laden: Ist `schemaVersion` älter, läuft eine Migrationskette. Weicht `catalogVersion` ab, wird die Topologie gegen den aktuellen Katalog erneut validiert und Verstöße werden gemeldet, nicht stillschweigend entfernt.

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

## API-Vertrag (Spring Boot)

Alle Endpunkte lesend, ohne Authentifizierung, JSON. Der Katalog ändert sich nur über Dateien im Repo, nicht über die API.

| Methode | Pfad | Antwort |
|---|---|---|
| GET | `/api/v1/catalog` | Vollständiges Bundle der aktiven Version: Gerätetypen, Regeln, Protokolle, Aktionen inkl. Schritte |
| GET | `/api/v1/catalog/versions` | Liste aller Versionen (`version`, `date`, `note`) |
| GET | `/api/v1/catalog/versions/{version}` | Bundle einer bestimmten Version |
| GET | `/api/v1/presets` | Presets der aktiven Version |
| GET | `/actuator/health` | Liveness |

Das Bundle trägt einen `ETag`, der Client cached es und aktualisiert bei Versionswechsel. Der Vertrag ist das OpenAPI-Schema (`/v3/api-docs`); die TypeScript-Typen des Frontends werden daraus generiert.

## Betrieb

- **Skript:** `scripts/start-api.sh` startet den Service lokal (baut bei Bedarf, liest `CATALOG_DIR` und `PORT` aus der Umgebung). `scripts/dev.sh` startet Backend und Frontend-Dev-Server zusammen.
- **Docker:** Ein Dockerfile (Multi-Stage: Frontend-Build, Maven-Build, Laufzeit-Image mit ausgeliefertem Frontend) für das Backend, der Katalog wird ins Image kopiert oder als Volume eingebunden (`CATALOG_DIR`), sodass Katalogänderungen ohne neues Image möglich sind.
- **Konfiguration:** Ausschließlich über Umgebungsvariablen (`PORT`, `CATALOG_DIR`), damit Skript und Container identisch laufen.

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
| FR-2 | `presets.json` plus „leerer Start“ im Client |
| FR-3 | React-Flow-Verbinden (Quelle/Ziel), keine Typ-Limits |
| FR-4 | Regel-Engine, `connection-rules` + `exclusion-rules`, Begründungstext |
| FR-5 | Topologie-Store in IndexedDB, JSON-Export/Import |
| FR-6, FR-7 | `availableActions` mit `enabled`/`disabledReason`, Kontextmenü |
| FR-8 | Pfadsuche über die Topologie, `pathKind` |
| FR-9, FR-10 | Simulations-Player mit Zustandsautomat |
| FR-11 | Detailpanel aus `protocols` |
| FR-12 | Versionierter Katalog in `catalog/`, `schemaVersion` für Topologien |

## Teststrategie

- **Katalog (JUnit):** Schema- und Referenzvalidierung beim Start, fehlerhafte Beispieldaten lassen den Dienst nicht starten
- **Regel-Engine (Vitest):** Tabellentest, ein eigener Testfall je Zeile der Verbindungsmatrix (jede erlaubte Regel gültig, jede „explizit ungültig“-Regel abgelehnt, Konnektor/TI-Gateway-Ausschluss)
- **Aktionen:** je Katalog-Aktion ein Test mit Topologie, in der sie aktiv ist, und einer, in der sie ausgegraut ist
- **Simulation:** Schrittfolge je Aktion, Abbruch mittendrin, `card_only` berührt weder Konnektor noch Fachdienst
- **Persistenz:** Roundtrip speichern/laden, Migration alter `schemaVersion`
- **API:** Contract-Tests gegen das OpenAPI-Schema
- **Barrierefreiheit:** Axe-Checks, Tastatur-E2E, Kontrastprüfung der Design-Tokens
- **E2E (Playwright):** Preset laden → Gerät ergänzen → ungültig verbinden (Meldung) → Aktion per Rechtsklick → Simulation abbrechen (entspricht den Erfolgskriterien der Spec)

## Risiken und offene Punkte

- [ ] **Visuelles Konzept:** Mockup mit Claude Design (D11): Icon-Familie, Farbcodierung, Kantenstil, Hell/Dunkel. Ergebnis nach `design/`, vor dem ersten UI-Task.
- [ ] **Inhalte je Aktion:** `steps`-Texte (Erklärtexte, Protokoll pro Schritt) sind Redaktionsarbeit und werden mit Justin fachlich abgenommen.
- [ ] **Aktionsvoraussetzungen:** Die genauen `requires`-Bedingungen je Aktion (z. B. HBA nötig für QES) werden pro Aktion beim Anlegen der Daten abgestimmt.
- [ ] **Zielbrowser:** Aktuelle Evergreen-Browser (Chrome, Firefox, Safari, Edge) als Annahme.
- [ ] **Lizenz:** Repo bleibt vorerst privat; Lizenz erst bei Veröffentlichung.
- **Risiko:** Ohne Datenbank gibt es keine Schreib-API. Bewusst so gewählt (D2), Katalogpflege läuft über Dateien und Pull Requests. Ein späterer Wechsel auf eine DB bleibt möglich, weil der Zugriff hinter einem `CatalogRepository`-Interface im Backend liegt.

## Nächster Schritt

Parallel: (1) Mockup mit Claude Design nach `design/`, (2) `tasks.md` mit einzeln umsetzbaren, überprüfbaren Arbeitspaketen (Task-ID, Bezug auf FR, Testkriterium). Danach Ableitung des Katalogs aus der Spec (D16).
