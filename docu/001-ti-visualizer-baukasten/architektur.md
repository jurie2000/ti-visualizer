# Architektur 001: TI Visualizer

**Stand:** 2026-11-04 · **Bezug:** [plan.md](./plan.md) (D1 bis D36),
[spec.md](./spec.md), [regelwerk.md](./regelwerk.md)

Die Diagramme sind in [Mermaid](https://mermaid.js.org/) geschrieben.
GitHub zeigt sie direkt als Grafik an. Lokal geht das zum Beispiel mit der
Mermaid-Vorschau in VS Code oder IntelliJ.

Inhalt: 1 Systemkontext · 2 Bausteine · 3 Datenmodell · 4 Speichern
und Öffnen · 5 CI/CD-Pipeline · 6 Simulation · 7 Verbinden
prüfen · 8 Verteilung

## 1. Systemkontext

Der Systemkontext zeigt, wer mit dem TI Visualizer arbeitet und mit
welchen Systemen er verbunden ist. Die App läuft vollständig im Browser,
einen eigenen Server gibt es nicht (D1). Es gibt eine Rolle, den Benutzer.
Seine Topologien gehören ihm als Datei und hängen nicht vom Browser ab
(D3, D34).

Bausteine mit „▸“ sind in einem eigenen Diagramm genauer dargestellt.

```mermaid
flowchart LR
    nutzer(["Benutzer"])
    dev(["Entwicklung"])
    datei[/"Datei .tiv.json<br/>beim Benutzer<br/>▸ Datenmodell"/]

    subgraph browser["Browser (beliebig)"]
        app["TI Visualizer<br/>(React-App)<br/>▸ Bausteine"]
        idb[("Browser-Speicher<br/>optional<br/>▸ Speichern")]
    end

    subgraph github["GitHub"]
        repo["Repository"]
        cicd[["CI/CD-Pipeline<br/>▸ CI/CD"]]
        pages["GitHub Pages<br/>▸ Verteilung"]
    end

    nutzer -- "nutzt" --> app
    nutzer -- "besitzt" --> datei
    datei <-- "Import / Export" --> app
    app <-. "Autosave" .-> idb
    pages -- "liefert App und Katalog" --> app
    dev -- "Push / Pull Request" --> repo
    repo --> cicd
    cicd -- "Deploy" --> pages

    click app "#2-bausteine" "Bausteine der App"
    click datei "#3-datenmodell" "Dateiformat .tiv.json"
    click idb "#4-speichern-und-öffnen" "Speichern und Öffnen"
    click cicd "#5-cicd-pipeline" "CI/CD-Pipeline im Detail"
    click pages "#8-verteilung" "Verteilung auf GitHub Pages"
```

**Genauer dargestellt:**
[TI Visualizer → 2 Bausteine](#2-bausteine) ·
[Datei → 3 Datenmodell](#3-datenmodell) ·
[Browser-Speicher → 4 Speichern und Öffnen](#4-speichern-und-öffnen) ·
[CI/CD-Pipeline → 5 CI/CD-Pipeline](#5-cicd-pipeline) (dort auch
SonarQube Cloud, KI-Review und Sicherheitsprüfungen) ·
[GitHub Pages → 8 Verteilung](#8-verteilung)

Die Klick-Verweise im Diagramm funktionieren in Werkzeugen, die Mermaid
mit Interaktion anzeigen (z. B. Mermaid Live Editor, Obsidian). GitHub
zeigt Mermaid im gesicherten Modus an, dort sind Klicks im Diagramm
gesperrt. Dafür gibt es die Linkliste oben.

## 2. Bausteine

Schichten der App. Pfeile zeigen, wer wen aufruft. Engines sind reines
TypeScript ohne React und ohne Browser-Speicher (vollständig testbar).

```mermaid
flowchart TB
    subgraph ui["UI (React, CSS Modules, Design-Tokens aus dem Mockup)"]
        direction LR
        header["Kopfleiste<br/>Modus, Suche, Speichern"]
        palette["Palette"]
        canvas["Canvas (React Flow)<br/>Knoten, Kanten, Zonen"]
        detail["Detailpanel"]
        player["Simulations-Player"]
        dialogs["Dialoge<br/>Öffnen, Prüfung, …"]
        learn["Tutorial,<br/>Herausforderungen"]
    end

    subgraph stores["Stores (Bibliothek Zustand)"]
        direction LR
        sCat["Katalog"]
        sTopo["Topologie<br/>+ Undo/Redo"]
        sUi["Oberfläche<br/>nur Anzeigezustand"]
        sSim["Simulation"]
        sSet["Einstellungen"]
    end

    subgraph engine["Engines (reines TypeScript)"]
        direction LR
        eRules["Regeln<br/>validateConnection"]
        ePath["Pfade"]
        eAct["Aktionen<br/>availableActions"]
        eSim["Simulation<br/>Zustandsautomat"]
        eChk["Prüfregeln<br/>runChecks"]
        eCfg["Konfiguration"]
    end

    subgraph data["Daten"]
        direction LR
        catalog[("catalog/*.json<br/>gebündelt")]
        schema["Zod-Schemas"]
        persist["Persistenz<br/>Datei, Autosave"]
    end

    header ~~~ palette ~~~ canvas ~~~ detail ~~~ player ~~~ dialogs ~~~ learn

    ui --> stores
    engine ~~~ data

    sTopo -- "prüft Verbindungen" --> eRules
    sTopo -- "Menü, Prüfung" --> eAct
    sTopo --> eChk
    sSim -- "spielt ab" --> eSim
    sCat -- "lädt" --> catalog
    sTopo -- "speichert" --> persist
    sSet -- "speichert" --> persist
    persist --> schema
    catalog --> schema
    eAct --> ePath
    eSim --> ePath
    eAct --> eChk
    eRules --> eCfg

    click eSim "#6-simulation" "Zustandsautomat der Simulation"
    click eRules "#7-verbinden-prüfen" "Prüflogik beim Verbinden"
    click persist "#4-speichern-und-öffnen" "Speichern und Öffnen"
```

Der Store „Oberfläche“ hat absichtlich keine Verbindung nach unten. Er hält
nur, was gerade angezeigt wird (offenes Panel, ausgewähltes Gerät), und
wird weder geprüft noch gespeichert.

**Genauer dargestellt:** [Simulation → 6 Simulation](#6-simulation) ·
[Regeln → 7 Verbinden prüfen](#7-verbinden-prüfen) ·
[Persistenz → 4 Speichern und Öffnen](#4-speichern-und-öffnen) ·
[Datenformat → 3 Datenmodell](#3-datenmodell)

## 3. Datenmodell

Aufbau des Dateiformats `.tiv.json` (D23) und der Topologie (D35), in
drei Teilen. Eine Datei enthält immer eine Topologie und optional die
Einstellungen. Gemeinsame Felder stehen in Basistypen, Varianten werden über
ein Feld wie `kind` unterschieden. Welche Geräte Karten oder
Einstellungen haben dürfen, legt der Katalog über Fähigkeiten fest.

Zeichen: Dreieck = „erweitert“ (übernimmt alle Felder des Basistyps),
Raute = „besteht aus“ (mit Anzahl), «abstract» = kommt nie allein vor.

### 3.1 Datei

```mermaid
classDiagram
    direction LR
    class TivFile {
        format = "ti-visualizer"
        schemaVersion: number
        exportedAt: string
        catalogVersion: string
    }
    class Settings {
        theme: system | hell | dunkel
        mode: einfach | erweitert
        simSpeed: number
        reducedMotion: boolean
        tutorialStep: number
        solvedChallenges: string[]
        pinnedPanels: string[]
        saveSettingsByDefault: boolean
    }
    class Topology {
        name: string
        description: string
        simDate: date
    }
    TivFile *-- "0..1" Settings : settings
    TivFile *-- "1" Topology : topology
```

Eine Datei enthält immer genau eine `topology` und höchstens einmal
`settings` (D23). Einstellungen werden nur mitgespeichert, wenn der
Benutzer es beim Speichern wählt, und beim Öffnen nur nach Rückfrage
übernommen. Eine Datei nur mit Einstellungen gibt es nicht. Den Aufbau
von `topology` zeigen 3.2 und 3.3.

**Beispiel:** `praxis.tiv.json`, mit mitgespeicherten Einstellungen. Ohne
Häkchen fehlt der Block `settings`. Der Inhalt von `topology` steht
ausführlich in 3.2.

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
    "solvedChallenges": ["kein-rezept-am-empfang"],
    "pinnedPanels": ["palette"],
    "saveSettingsByDefault": false
  },
  "topology": { "name": "Kleine Arztpraxis", "description": "…", "simDate": "2026-11-01", "nodes": [], "edges": [], "zones": [] }
}
```

### 3.2 Topologie

```mermaid
classDiagram
    direction TB
    class Topology {
        name: string
        description: string
        simDate: date
    }
    class Node {
        id: string
        label?: string
        type: DeviceTypeKey
        position: x, y
        fault: boolean
    }
    class Edge {
        id: string
        label?: string
        ends: 2 × node + port
        fault: boolean
    }
    class Zone {
        id: string
        label?: string
        area: x, y, w, h
        tone: Tone
    }
    Topology *-- "*" Node : nodes
    Topology *-- "*" Edge : edges
    Topology *-- "*" Zone : zones
```

`id` und `label` stammen aus dem gemeinsamen Basistyp `Element`, `fault`
aus `Disruptable`. Im Diagramm stehen sie zur Übersicht direkt bei den
Bausteinen. Kanten haben genau zwei gleichwertige Enden (D15). Jedes Ende
nennt einen Knoten und dessen Anschluss.

**Beispiel:** der Inhalt von `topology` aus `praxis.tiv.json`. Ein PVS und
ein Kartenterminal hängen am Switch, der Switch am Konnektor. Eine Zone
fasst das Praxisnetz zusammen. Die Zusatzfelder `cards` und `config` der
Knoten stehen in 3.3.

```json
{
  "name": "Kleine Arztpraxis",
  "description": "PVS und Kartenterminal am Konnektor",
  "simDate": "2026-11-01",
  "nodes": [
    { "id": "pvs1", "type": "pvs", "label": "Sprechzimmer", "position": { "x": 80,  "y": 200 }, "fault": false },
    { "id": "kt1",  "type": "kt",  "label": "Empfang",      "position": { "x": 80,  "y": 60 },  "fault": false },
    { "id": "sw1",  "type": "switch",                       "position": { "x": 280, "y": 130 }, "fault": false },
    { "id": "kon1", "type": "kon",                          "position": { "x": 480, "y": 130 }, "fault": false }
  ],
  "edges": [
    { "id": "e1", "ends": [ { "node": "pvs1", "port": "eth0" }, { "node": "sw1",  "port": "p1"  } ], "fault": false },
    { "id": "e2", "ends": [ { "node": "kt1",  "port": "lan0" }, { "node": "sw1",  "port": "p2"  } ], "fault": false },
    { "id": "e3", "ends": [ { "node": "sw1",  "port": "p8"   }, { "node": "kon1", "port": "lan" } ], "fault": true,
      "label": "Kabel abgezogen" }
  ],
  "zones": [
    { "id": "z1", "label": "Praxisnetz", "area": { "x": 40, "y": 20, "w": 560, "h": 260 }, "tone": "sage" }
  ]
}
```

| Im Diagramm | Im Beispiel |
|---|---|
| Node `position: x, y` | `"position": { "x": 80, "y": 200 }` |
| Edge `ends: 2 × node + port` | `"ends": [ { "node": "pvs1", "port": "eth0" }, { "node": "sw1", "port": "p1" } ]` |
| Zone `area: x, y, w, h` | `"area": { "x": 40, "y": 20, "w": 560, "h": 260 }` |
| `fault` | Kante `e3` ist als unterbrochen markiert |
| `label?` | optional, der Switch hat keins |

### 3.3 Karten und Einstellungen am Gerät

```mermaid
classDiagram
    direction TB
    class Node {
        type: DeviceTypeKey
    }
    class DeviceType {
        <<Katalog>>
        key
        category
        capabilities
    }
    class Card {
        kind = "egk"
        expires: date
        id: key (optional, K-9)
        pinActive: boolean
    }
    class PinCard {
        kind = "hba" | "smcb"
        expires: date
        id: key (optional, K-9)
        unlocked: boolean
    }
    class NetConfig {
        <<abstract>>
        ip, mask, gateway
        dns, vlan, dhcp
    }
    class KonnektorConfig {
        mode: reihe | parallel
        sis: boolean
        timeOffset: number
        certExpires: date
        updateOk: boolean
        lastTimeSync: date
        dhcpServer: boolean
    }
    class TerminalConfig {
        paired: boolean
        pairedWith: NodeId
        workplace: string
    }
    class ClientConfig {
        workplace: string
        routeTI: boolean
    }
    class RouterConfig {
        ipsecAllowed: boolean
        dhcpServer: boolean
    }
    class InfraConfig {
        keine Zusatzfelder
    }
    Node ..> DeviceType : Feld type, Eintrag im Katalog
    Node *-- "0..3" Card : Feld cards
    Node *-- "0..1" NetConfig : Feld config
    Card <|-- PinCard
    NetConfig <|-- KonnektorConfig
    NetConfig <|-- TerminalConfig
    NetConfig <|-- ClientConfig
    NetConfig <|-- RouterConfig
    NetConfig <|-- InfraConfig
```

`cards` und `config` sind Teile des Knotens, keine eigenen Geräte auf der
Fläche. In der Datei stehen sie als verschachtelte Objekte im Knoten.
Eigene Kästen haben sie im Diagramm nur, weil es von ihnen Varianten gibt.
`DeviceType` steht nicht in der Datei, sondern im Katalog der App. Der
Knoten trägt nur den Schlüssel (`"type": "kt"`).

Welche Felder ein Knoten haben darf, hängt von seinem Gerätetyp ab
(Beispiele):

| Gerätetyp (`type`) | Fähigkeiten im Katalog | erlaubte Zusatzfelder im Knoten |
|---|---|---|
| `kt` (Kartenterminal) | `cardSlots`, `netConfig:terminal` | `cards`, `config` als TerminalConfig |
| `kon` (Konnektor) | `netConfig:konnektor` | `config` als KonnektorConfig |
| `pvs` (Praxisverwaltungssystem) | `netConfig:client` | `config` als ClientConfig |
| `router` | `netConfig:router` | `config` als RouterConfig |
| `switch`, `ap`, `fw` (Switch, Access Point, Firewall) | `netConfig:infra` | `config` als InfraConfig, nur die Grundfelder aus NetConfig |
| `hskon`, `gateway` | `netConfig:konnektor` | `config` als KonnektorConfig |
| `erp` (E-Rezept-Fachdienst) | keine | keine Zusatzfelder, nur `id`, `label`, `type`, `position`, `fault` |

**Beispiel:** dieselben Knoten wie in 3.2, jetzt mit ihren Zusatzfeldern
(im Modus Erweitert).

```json
[
  {
    "id": "kt1", "type": "kt", "label": "Empfang", "position": { "x": 80, "y": 60 }, "fault": false,
    "cards": [
      { "kind": "smcb", "expires": "2028-06-30", "unlocked": true },
      { "kind": "hba",  "expires": "2027-03-31", "unlocked": false },
      { "kind": "egk",  "expires": "2029-12-31", "pinActive": true }
    ],
    "config": {
      "ip": "192.168.10.13", "mask": "255.255.255.0", "gateway": "192.168.10.2",
      "dns": "192.168.10.2", "vlan": "TI", "dhcp": false,
      "paired": true, "pairedWith": "kon1", "workplace": "AP-Empfang"
    }
  },
  {
    "id": "pvs1", "type": "pvs", "label": "Sprechzimmer", "position": { "x": 80, "y": 200 }, "fault": false,
    "config": {
      "ip": "192.168.10.20", "mask": "255.255.255.0", "gateway": "192.168.10.2",
      "dns": "192.168.10.2", "vlan": "TI", "dhcp": false,
      "workplace": "AP-Empfang", "routeTI": true
    }
  },
  {
    "id": "kon1", "type": "kon", "position": { "x": 480, "y": 130 }, "fault": false,
    "config": {
      "ip": "192.168.10.2", "mask": "255.255.255.0", "gateway": "", "dns": "", "vlan": "TI", "dhcp": false,
      "mode": "reihe", "sis": false, "timeOffset": 0, "certExpires": "2029-03-31", "updateOk": true,
      "lastTimeSync": "2026-11-01", "dhcpServer": false
    }
  },
  {
    "id": "sw1", "type": "switch", "position": { "x": 280, "y": 130 }, "fault": false,
    "config": {
      "ip": "192.168.10.3", "mask": "255.255.255.0", "gateway": "192.168.10.2",
      "dns": "192.168.10.2", "vlan": "TI", "dhcp": false
    }
  }
]
```

| Knoten | Was das Beispiel zeigt |
|---|---|
| `kt1` | `cards` mit zwei `PinCard` (SMC-B freigeschaltet, HBA nicht freigeschaltet) und einer `Card` (eGK ohne `unlocked`). `config` als TerminalConfig (`paired`, `workplace`) |
| `pvs1` | keine `cards`, weil ein PVS die Fähigkeit `cardSlots` nicht hat. `config` als ClientConfig (`workplace`, `routeTI`) |
| `kon1` | `config` als KonnektorConfig (`mode`, `sis`, `timeOffset`, `certExpires`, `updateOk`) |
| `sw1` | `config` als InfraConfig: nur IP, Maske, Gateway, DNS, VLAN und DHCP, keine Karten |

Die Sicherheitsprüfung würde hier einen Befund melden: Der HBA in `kt1`
ist nicht freigeschaltet (Regelwerk P-22).

**Regeln, die das Schema (Zod) prüft:**

| Was | Wie |
|---|---|
| Datei | `topology` muss vorhanden sein, sonst wird die Datei abgelehnt. `settings` ist optional |
| Kartenart | `kind` entscheidet zwischen `Card` (eGK) und `PinCard` (HBA, SMC-B). Nur `PinCard` hat `unlocked` (Regelwerk K-4) |
| Karten am Gerät | `cards` nur, wenn der Gerätetyp die Fähigkeit `cardSlots` hat |
| Einstellungen am Gerät | `config` nur, wenn der Gerätetyp eine Fähigkeit `netConfig:konnektor`, `netConfig:terminal`, `netConfig:client`, `netConfig:router` oder `netConfig:infra` hat. Die Fähigkeit bestimmt die Variante |
| Kanten | genau zwei Enden, beide zeigen auf vorhandene Knoten und Anschlüsse |

## 4. Speichern und Öffnen

Der einzige Weg zu einem anderen Browser oder Benutzer ist die Datei
(D24). Sie enthält immer die Topologie, die Einstellungen nur auf Wunsch
(D23). Der
Autosave sichert nur im eigenen Browser (D34).

```mermaid
sequenceDiagram
    autonumber
    actor A as Benutzer (Browser 1)
    participant AppA as App in Browser 1
    participant DB as Autosave (IndexedDB)
    actor B as Benutzer (Browser 2)
    participant AppB as App in Browser 2

    rect rgba(198,113,57,0.10)
    note over A,AppB: Speichern und in einem anderen Browser öffnen
    A->>AppA: Speichern
    AppA-->>A: praxis.tiv.json (Topologie, optional Einstellungen)
    A-->>B: Datei mitnehmen oder weitergeben (Mail, Moodle, USB)
    B->>AppB: Öffnen oder Drag & Drop
    AppB->>AppB: Schema prüfen, Migration, Rückfrage
    AppB-->>B: Topologie geladen
    AppB-->>B: Einstellungen übernehmen? (nur falls enthalten, Standard nein)
    end

    rect rgba(122,138,94,0.12)
    note over A,DB: Autosave im selben Browser
    A->>AppA: Änderung
    AppA->>DB: aktuellen Stand sichern
    A->>AppA: Seite neu laden
    AppA->>DB: letzten Stand lesen
    AppA-->>A: Letzten Stand wiederherstellen?
    end
```

## 5. CI/CD-Pipeline

Stufen aus [plan.md](./plan.md#cicd-pipeline-und-deployment-d8-d26-d27).
Deploy nur auf `main` und nur, wenn alles grün ist.

```mermaid
flowchart LR
    trigger(["Push / Pull Request"])

    subgraph s1["1 Statische Prüfung"]
        lint["ESLint · Prettier · tsc · gitleaks<br/>ab P1: dependency-cruiser"]
    end
    subgraph s2["2 Unit-Tests"]
        unit["Vitest + Coverage<br/>ab P1: Property-based Tests,<br/>jede Regel hat einen Test"]
    end
    subgraph s3["3 Sonar"]
        sonar["SonarQube Cloud<br/>Quality Gate"]
    end
    subgraph s3b["3b KI-Review (nur PR)"]
        ai["Claude Code Action<br/>Spec- und Regelwerk-Treue"]
    end
    subgraph s4["4 Build-Test"]
        build["vite build · CSP<br/>Bundle-Größe"]
    end
    subgraph s5["5 E2E"]
        e2e["Playwright mit Axe<br/>ab P3: Injection-Suite"]
    end
    subgraph s6["6 Deploy (nur main)"]
        deploy["GitHub Pages<br/>+ Smoke-Test"]
    end

    trigger --> lint
    trigger --> unit
    trigger --> build
    trigger --> ai
    lint --> gate
    unit -- "lcov.info" --> sonar
    ai -. "nur Kommentar,<br/>kein Pflicht-Check" .-> pr
    build -- "dist/" --> e2e
    sonar --> gate{"alle grün<br/>und main?"}
    e2e --> gate
    gate -- "ja" --> deploy
    gate -- "nein, PR" --> pr["Status am PR<br/>Merge gesperrt bis grün"]

    dependabot(["Dependabot wöchentlich"]) -.-> trigger
    trigger -.-> codeql(["CodeQL extended<br/>parallel, kein Pflicht-Check"])
    optional["optional nach P7:<br/>Stryker, Lighthouse,<br/>Dependency-Track, ZAP, Scorecard"]
```

## 6. Simulation

Zustandsautomat des Simulations-Players (FR-9, FR-10).

```mermaid
stateDiagram-v2
    direction LR
    state "Bereit" as idle
    state "Läuft" as aktiv {
        direction LR
        state "Spielt ab" as running
        state "Pausiert" as paused
        [*] --> running
        running --> paused : Pause
        paused --> running : Play
    }
    state "Fertig" as done
    state "Abgebrochen" as cancelled

    [*] --> idle
    idle --> aktiv : Aktion starten
    aktiv --> done : letzter Schritt erreicht
    aktiv --> cancelled : Abbrechen oder Esc
    done --> idle : schließen
    cancelled --> idle : schließen
```

| Zustand | Name im Code | Was der Benutzer sieht | Bedienung |
|---|---|---|---|
| Bereit | `idle` | kein Player, Kontextmenü verfügbar | Aktion im Kontextmenü starten |
| Spielt ab | `running` | Paket wandert, Erklärtext je Schritt | Leertaste pausiert, Tempo-Regler |
| Pausiert | `paused` | Schritt bleibt stehen | Leertaste spielt weiter, Pfeiltasten gehen einen Schritt vor oder zurück |
| Fertig | `done` | Zusammenfassung des Ablaufs | schließen |
| Abgebrochen | `cancelled` | Hinweis, bei welchem Schritt abgebrochen wurde | schließen |

Abbrechen (Knopf oder Esc) geht aus „Spielt ab“ und aus „Pausiert“.

## 7. Verbinden prüfen

Prüflogik aus [Regelwerk 4.0](./regelwerk.md#40-prüflogik-entschieden-2026-11-03).

```mermaid
flowchart TD
    start(["Nutzer verbindet A mit B"]) --> g{"Grundprüfungen<br/>und Ausschlüsse ok?"}
    g -- "nein" --> errG["Abgelehnt<br/>Meldung der Grundprüfung"]
    g -- "ja" --> allow{"Paar in der<br/>Erlaubnisliste?"}
    allow -- "ja" --> mode{"Modus Erweitert?"}
    mode -- "ja" --> pick["PortPicker:<br/>Anschlüsse wählen"]
    mode -- "nein" --> auto["autoPorts:<br/>freies Paar wählen"]
    pick --> ok(["Verbindung angelegt"])
    auto --> ok
    allow -- "nein" --> reason{"Begründungsregel<br/>passt?"}
    reason -- "ja" --> errR["Abgelehnt<br/>Text der Regel"]
    reason -- "nein" --> errA["Abgelehnt<br/>erlaubte Partner nennen"]
```

## 8. Verteilung

Was wo liegt, nachdem die Pipeline gelaufen ist.

```mermaid
flowchart LR
    subgraph gh["GitHub Pages: jurie2000.github.io/ti-visualizer/"]
        idx["index.html"]
        assets["assets/*.js, *.css<br/>(mit Hash)"]
        fonts["Schriften<br/>(selbst ausgeliefert)"]
    end

    subgraph client["Browser der Nutzer"]
        spa["App"]
        db[("Autosave<br/>IndexedDB")]
        files[["*.tiv.json<br/>auf der Festplatte"]]
    end

    idx --> spa
    assets --> spa
    fonts --> spa
    spa <--> db
    spa <--> files
```
