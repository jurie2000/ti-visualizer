# Architektur 001: TI Visualizer

**Stand:** 2026-11-04 · **Bezug:** [plan.md](./plan.md) (D1–D28),
[spec.md](./spec.md), [regelwerk.md](./regelwerk.md)

Die Diagramme sind in [Mermaid](https://mermaid.js.org/) geschrieben.
GitHub zeigt sie direkt als Grafik an; lokal geht das z. B. mit der
Mermaid-Vorschau in VS Code oder IntelliJ.

Inhalt: 1 Systemkontext · 2 Bausteine · 3 Datenmodell · 4 Teilen
zwischen Browsern · 5 CI/CD-Pipeline · 6 Simulation · 7 Verbinden
prüfen · 8 Verteilung

## 1. Systemkontext

Wer und was mit der App zu tun hat. Es gibt keinen eigenen Server; alles
läuft im Browser (D1).

```mermaid
flowchart LR
    lern(["Lernende / Lehrende"])
    dritt(["Dritte mit anderem Browser"])
    dev(["Entwickler: Justin"])

    subgraph browser["Browser"]
        app["TI Visualizer<br/>(React-App)"]
        idb[("IndexedDB<br/>Topologien, Einstellungen")]
    end

    subgraph github["GitHub"]
        repo["Repository<br/>Code, Katalog, Vorlagen, Specs"]
        actions["GitHub Actions<br/>CI/CD"]
        pages["GitHub Pages<br/>statische Seite"]
    end

    sonar["SonarQube Cloud<br/>Codequalität"]
    claude["Anthropic API<br/>KI-Review"]
    gist["Fremde Adresse<br/>z. B. GitHub Gist"]

    lern -- "nutzt" --> app
    dritt -- "öffnet Datei oder Link" --> app
    app <--> idb
    pages -- "liefert App, Katalog, Vorlagen" --> app
    app -. "?vorlage=URL (optional)" .-> gist
    dev -- "Push / Pull Request" --> repo
    repo --> actions
    actions -- "Analyse" --> sonar
    actions -- "PR-Review" --> claude
    actions -- "Deploy" --> pages
```

## 2. Bausteine

Schichten der App. Pfeile zeigen, wer wen aufruft. Engines sind reines
TypeScript ohne React und ohne Browser-Speicher (vollständig testbar).

```mermaid
flowchart TB
    subgraph ui["UI (React, CSS Modules, Design-Tokens aus dem Mockup)"]
        direction LR
        header["Kopfleiste<br/>Modus, Suche, Teilen"]
        palette["Palette"]
        canvas["Canvas (React Flow)<br/>Knoten, Kanten, Zonen"]
        detail["Detailpanel"]
        player["Simulations-Player"]
        dialogs["Dialoge<br/>Vorlagen, Import, Prüfung, …"]
        learn["Tutorial,<br/>Herausforderungen"]
    end

    subgraph stores["Stores (Zustand)"]
        direction LR
        sCat["Katalog"]
        sTopo["Topologie<br/>+ Undo/Redo"]
        sUi["Oberfläche"]
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
        persist["Persistenz<br/>IndexedDB, Datei, Link"]
    end

    ui --> stores
    stores --> engine
    sCat --> catalog
    sTopo --> persist
    sSet --> persist
    persist --> schema
    catalog --> schema
    eAct --> ePath
    eSim --> ePath
    eAct --> eChk
    eRules --> eCfg
```

## 3. Datenmodell

Kern des Dateiformats `.tiv.json` (D23) und der Topologie.

```mermaid
classDiagram
    class TivFile {
        format = "ti-visualizer"
        kind: topology | settings | workspace
        schemaVersion: number
        catalogVersion: string
        exportedAt: string
        data
    }
    class Topology {
        name: string
        description: string
    }
    class Node {
        id: string
        type: DeviceTypeKey
        x: number
        y: number
        label: string
        fault: boolean
    }
    class Card {
        kind: egk | hba | smcb
        expires: date
        unlocked: boolean
    }
    class Config {
        ip, mask, gateway, dns
        vlan, mode, sis, paired
        workplace, timeOffset
    }
    class Edge {
        id: string
        a: NodeId
        portA: PortId
        b: NodeId
        portB: PortId
        fault: boolean
    }
    class Zone {
        id, label
        x, y, w, h
        tone
    }
    class Settings {
        theme: system | hell | dunkel
        mode: einfach | erweitert
        simSpeed: number
        reducedMotion: boolean
        tutorialStep: number
        solvedChallenges
    }
    class Workspace {
        settings
        topologies
    }

    TivFile --> Topology : kind = topology
    TivFile --> Settings : kind = settings
    TivFile --> Workspace : kind = workspace
    Workspace --> Settings
    Workspace --> "*" Topology
    Topology --> "*" Node
    Topology --> "*" Edge
    Topology --> "*" Zone
    Node --> "0..3" Card : nur Kartenterminals
    Node --> "0..1" Config : Modus Erweitert
```

## 4. Teilen zwischen Browsern

Drei Wege (D24): Datei, Vorlagen-Bibliothek, Link. Jeder Import läuft
durch dieselbe Prüfung.

```mermaid
sequenceDiagram
    autonumber
    actor A as Nutzer A (Browser 1)
    participant AppA as App in Browser 1
    participant Pages as GitHub Pages
    actor B as Dritte (Browser 2)
    participant AppB as App in Browser 2

    rect rgba(198,113,57,0.10)
    note over A,AppB: Weg 1: Datei
    A->>AppA: Exportieren
    AppA-->>A: arbeitsstand.tiv.json
    A-->>B: Datei weitergeben (Mail, Moodle, USB)
    B->>AppB: Importieren / Drag & Drop
    AppB->>AppB: Schema prüfen, Migration, Rückfrage
    AppB-->>B: Topologie und Einstellungen geladen
    end

    rect rgba(122,138,94,0.12)
    note over A,AppB: Weg 2: Vorlagen-Bibliothek
    A->>Pages: Vorlage per Pull Request ins Repo
    B->>AppB: Dialog „Vorlagen“
    AppB->>Pages: GET /vorlagen/index.json
    Pages-->>AppB: Liste und Vorlage
    AppB-->>B: Vorlage geöffnet
    end

    rect rgba(44,111,168,0.10)
    note over A,AppB: Weg 3: Link
    A->>AppA: Teilen
    AppA-->>A: …/ti-visualizer/#t=komprimiert
    A-->>B: Link senden
    B->>AppB: Link öffnen
    AppB->>AppB: entpacken, Schema prüfen, Vorschau
    AppB-->>B: nach Bestätigung übernommen
    end
```

## 5. CI/CD-Pipeline

Stufen aus [plan.md](./plan.md#cicd-pipeline-und-deployment-d8-d26-d27).
Deploy nur auf `main` und nur, wenn alles grün ist.

```mermaid
flowchart LR
    trigger(["Push / Pull Request"])

    subgraph s1["1 Statische Prüfung"]
        lint["ESLint · Prettier<br/>tsc --noEmit"]
    end
    subgraph s2["2 Unit-Tests"]
        unit["Vitest + Coverage<br/>Katalog, Vorlagen, Regeln"]
    end
    subgraph s3["3 Sonar"]
        sonar["SonarQube Cloud<br/>Quality Gate"]
    end
    subgraph s3b["3b KI-Review (nur PR)"]
        ai["Claude Code Action<br/>Spec- und Regelwerk-Treue"]
    end
    subgraph s4["4 Build-Test"]
        build["vite build<br/>Bundle-Größe, Pfade"]
    end
    subgraph s5["5 E2E"]
        e2e["Playwright<br/>smoke, share, a11y, …"]
    end
    subgraph s6["6 Deploy (nur main)"]
        deploy["GitHub Pages<br/>+ Smoke-Test"]
    end

    trigger --> lint
    lint --> unit
    lint --> build
    unit -- "lcov.info" --> sonar
    lint --> ai
    ai -. "nur Kommentar,<br/>kein Pflicht-Check" .-> pr
    build -- "dist/" --> e2e
    sonar --> gate{"alle grün<br/>und main?"}
    e2e --> gate
    gate -- "ja" --> deploy
    gate -- "nein, PR" --> pr["Status am PR<br/>Merge gesperrt bis grün"]

    nightly(["nightly"]) -.-> full["E2E alle Browser<br/>visual, CodeQL, audit"]
```

## 6. Simulation

Zustandsautomat des Players (FR-9, FR-10).

```mermaid
stateDiagram-v2
    [*] --> idle
    idle --> running : Aktion starten (enabled)
    running --> paused : Pause
    paused --> running : Play
    running --> running : Schritt n → n+1
    paused --> paused : Schritt vor / zurück
    running --> done : letzter Schritt
    running --> cancelled : Abbrechen / Esc
    paused --> cancelled : Abbrechen / Esc
    done --> idle : schließen
    cancelled --> idle : schließen
```

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
        vorl["vorlagen/index.json<br/>vorlagen/*.tiv.json"]
    end

    subgraph client["Browser der Nutzer"]
        spa["App"]
        db[("IndexedDB")]
        files[["*.tiv.json<br/>auf der Festplatte"]]
    end

    idx --> spa
    assets --> spa
    fonts --> spa
    vorl --> spa
    spa <--> db
    spa <--> files
```
