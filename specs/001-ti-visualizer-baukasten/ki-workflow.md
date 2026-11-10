# KI-Workflow 001: TI Visualizer

**Stand:** 2026-11-10 · **Bezug:** [plan.md](./plan.md) (D29, „KI-Triage
und Agenten-Regeln“), [tasks.md](./tasks.md),
[`CLAUDE.md`](../../CLAUDE.md),
[`review-richtlinien.md`](../../.github/review-richtlinien.md)

Beschreibt, wie KI-Agenten in diesem Projekt planen, umsetzen, prüfen und
Issues einordnen. Die Diagramme sind in [Mermaid](https://mermaid.js.org/)
geschrieben, wie in [architektur.md](./architektur.md).

Inhalt: 1 Überblick · 2 Rollen und Modelle · 3 Task umsetzen · 4 KI-Review
· 5 Issue-Triage · 6 Wo die Regeln stehen · 7 Kosten begrenzen

## 1. Überblick

Die Spec ist der Maßstab für alles: Tasks kommen aus `tasks.md`, Issues
werden an Spec und Regelwerk gemessen, der Review prüft gegen beide. Der
Mensch (Justin) entscheidet an zwei Stellen: Freigabe neuer Features und
Merge bei offenen Hoch-Befunden bzw. bei Tasks mit Abnahme.

Bausteine mit „▸“ sind in einem eigenen Diagramm genauer dargestellt.

```mermaid
flowchart LR
    spec[/"Spec, Regelwerk,<br/>tasks.md"/]
    issue[/"Issue"/]
    mensch(["Justin"])

    subgraph lokal["Lokal (Claude Code)"]
        plan["Planen<br/>Opus"]
        umsetzer["Agent umsetzer<br/>Sonnet<br/>▸ Task umsetzen"]
    end

    subgraph github["GitHub"]
        triage[["KI-Triage<br/>Sonnet<br/>▸ Issue-Triage"]]
        pr["Pull Request"]
        ci[["CI-Pipeline<br/>Pflicht-Checks"]]
        review[["KI-Review<br/>Opus<br/>▸ KI-Review"]]
        main[("main")]
    end

    spec --> plan
    plan -- "Task-ID" --> umsetzer
    issue --> triage
    triage -- "Einordnung" --> mensch
    mensch -- "Label freigegeben" --> umsetzer
    umsetzer -- "Branch, PR" --> pr
    pr --> ci
    pr --> review
    review -- "Befunde" --> umsetzer
    ci -- "grün" --> main
    mensch -. "Abnahme" .-> main

    click umsetzer "#3-task-umsetzen" "Task umsetzen"
    click triage "#5-issue-triage" "Issue-Triage"
    click review "#4-ki-review" "KI-Review"
```

**Genauer dargestellt:** [umsetzer → 3 Task umsetzen](#3-task-umsetzen) ·
[KI-Review → 4 KI-Review](#4-ki-review) ·
[KI-Triage → 5 Issue-Triage](#5-issue-triage)

## 2. Rollen und Modelle

Teure Modelle nur dort, wo Denken den Unterschied macht. Routinearbeit
läuft auf Sonnet mit mittlerem Aufwand.

| Rolle | Wo | Modell | Aufwand | Definiert in |
|---|---|---|---|---|
| Planen, Tasks schneiden, Auslegung | lokal, Hauptsitzung | Opus | hoch | `~/.claude/settings.json` (`opusplan`) |
| Task oder Issue umsetzen | lokal, Agent `umsetzer` | Sonnet | mittel | `.claude/agents/umsetzer.md` |
| Bug mit unklarer Ursache | lokal, Hauptsitzung | Opus | hoch | von Hand wählen |
| KI-Review | GitHub Action | Opus | Standard | `.github/workflows/ki-review.yml` |
| Issue-Triage | GitHub Action | Sonnet | Standard | `.github/workflows/ki-triage.yml` |
| Gründlicher Review riskanter PRs | lokal, `/code-review high` | Opus | hoch | auf Zuruf |

## 3. Task umsetzen

Skill `task-umsetzen` (bzw. `fix-issue` für Issues), ausgeführt vom Agenten
`umsetzer`. Die Größenprüfung kommt **vor** dem Programmieren: Ein zu
großer Task wird in `tasks.md` geteilt, nicht im PR.

```mermaid
flowchart TD
    start(["/task-umsetzen T-xxx"])
    lesen["Task lesen:<br/>Umfang, Fertig wenn,<br/>FR- und Regel-IDs"]
    vorg{"Vorgänger<br/>erledigt?"}
    specs["Nur genannte Abschnitte<br/>per grep lesen"]
    groesse{"Mehr als ~300 Zeilen<br/>Produktivcode?"}
    teilen["In tasks.md teilen<br/>T-xxxa, T-xxxb"]
    code["Umsetzen nach CLAUDE.md:<br/>Sparsamkeitsleiter,<br/>Kommentare nur fürs Warum"]
    tests["Tests: je Regel-ID einer,<br/>Fertig-wenn-Kriterien"]
    checks["Lokale Checks:<br/>lint, typecheck, test,<br/>build, format:check"]
    pr["PR mit Vorlage<br/>und Task-ID"]
    stop(["Anhalten,<br/>Nutzer fragen"])

    start --> lesen --> vorg
    vorg -- "nein" --> stop
    vorg -- "ja" --> specs --> groesse
    groesse -- "ja" --> teilen --> stop
    groesse -- "nein" --> code --> tests --> checks --> pr
```

**Bugfix** (Skill `fix-issue`): zuerst ein Test, der den Fehler zeigt,
dann die Ursache in der gemeinsamen Funktion beheben, alle Aufrufer prüfen.

## 4. KI-Review

Ein Durchlauf, drei Blickwinkel. Kein Pflicht-Check: Über den Merge
entscheidet die Disposition jedes Befunds.

```mermaid
flowchart TD
    trigger{"Auslöser"}
    open["PR geöffnet oder<br/>bereit zum Review"]
    label["Label ki-review<br/>(erneuter Lauf)"]
    skip["Nur tasks.md geändert<br/>oder normaler Push:<br/>kein Lauf"]

    subgraph lauf["Ein Lauf, Opus"]
        diff["gh pr diff, geänderte Dateien,<br/>betroffene Spec-Abschnitte"]
        b1["1 Spec-Treue<br/>Regelwerk, D18-Tests,<br/>Katalog, Task-ID"]
        b2["2 Umfang und Einfachheit<br/>fremde Änderungen, Größe,<br/>Overengineering, Kommentare"]
        b3["3 Robustheit und Sicherheit<br/>Öffnen, kein HTML,<br/>Barrierefreiheit, Randfälle"]
        out["Überblick: Soll, Ist, Abweichung<br/>höchstens 7 Befunde mit Beleg"]
    end

    dispo{"Disposition<br/>je Befund"}
    fix["Fix im selben PR<br/>(Pflicht bei Hoch)"]
    vertagt["Vertagt mit<br/>Folge-Task"]
    wontfix["Wontfix mit<br/>Begründung"]
    merge(["Merge nach grünen<br/>Pflicht-Checks"])

    trigger --> open --> diff
    trigger --> label --> diff
    trigger --> skip
    diff --> b1 & b2 & b3 --> out --> dispo
    dispo --> fix & vertagt & wontfix
    fix -. "bei Bedarf<br/>Label ki-review" .-> label
    fix & vertagt & wontfix --> merge
```

| Schwere | Bedeutung | Blockt Merge |
|---|---|---|
| Hoch | Verstoß gegen Spec oder Regelwerk, falsches Verhalten, fehlende Prüfung beim Öffnen | ja |
| Mittel | begrenzte fachliche Abweichung, Änderung außerhalb des Tasks, deutliches Overengineering | nein |
| Niedrig / Hinweis | kleine Unstimmigkeit, Vormerkung für Folge-Task | nein |

## 5. Issue-Triage

Neue Issues ordnet Sonnet nach dem Skill `triage` ein. Maßstab ist die
Spec, jede Einordnung braucht einen Beleg. Die Triage programmiert nicht.
Features und Spec-Lücken gehen erst nach dem Label `freigegeben` in die
Umsetzung, und das setzt nur ein Mensch.

```mermaid
flowchart TD
    issue(["Issue geöffnet<br/>von Person mit Schreibrechten"])
    suche["Spec und Regelwerk<br/>per grep durchsuchen"]
    frage{"Weicht das Verhalten<br/>von der Spec ab?"}
    klar{"Ist die Spec<br/>eindeutig?"}
    vorgesehen{"Sieht die Spec das<br/>Gewünschte vor?"}

    bug["bug<br/>Beleg: FR- oder Regel-ID"]
    luecke["spec-lücke<br/>Auslegung nach quellen.md"]
    feature["enhancement<br/>Spec und tasks.md ergänzen"]
    nichts["question<br/>Begründung, schließen"]
    unsicher["Kein Label,<br/>Rückfrage stellen"]

    kommentar["Kommentar: Klasse, Beleg,<br/>Größe S/M/L, Task-Vorschlag"]
    frei{"Label freigegeben<br/>durch Justin?"}
    umsetzen(["/fix-issue nr<br/>Agent umsetzer"])
    warten(["wartet"])

    issue --> suche --> frage
    frage -- "ja" --> klar
    klar -- "ja" --> bug
    klar -- "nein" --> luecke
    frage -- "nein" --> vorgesehen
    vorgesehen -- "nein" --> feature
    vorgesehen -- "ja, so gewollt" --> nichts
    suche -. "Beleg fehlt" .-> unsicher
    bug & luecke & feature --> kommentar
    kommentar --> frei
    bug -- "direkt" --> umsetzen
    frei -- "ja" --> umsetzen
    frei -- "nein" --> warten
```

| Größe | Produktivcode | Folge |
|---|---|---|
| S | unter 50 Zeilen | direkt ein PR |
| M | bis 300 Zeilen | ein PR |
| L | mehr | vor der Umsetzung teilen |

## 6. Wo die Regeln stehen

Jede Regel steht an genau einer Stelle. Lokale Agenten und die Workflows
im CI lesen dieselben Dateien, dadurch prüft der Review genau das, woran
sich der Umsetzer halten soll.

| Datei | Inhalt | Gelesen von |
|---|---|---|
| `CLAUDE.md` | Ablauf, Größe, Code, Kommentare, Tests | allen Agenten, lokal und im CI |
| `.claude/skills/task-umsetzen/` | Schritte für einen Task | `umsetzer` |
| `.claude/skills/fix-issue/` | Schritte für ein Issue | `umsetzer` |
| `.claude/skills/triage/` | Klassen, Kriterien, Ausgabe | KI-Triage, lokal `/triage` |
| `.claude/agents/umsetzer.md` | Modell, Aufwand, vorgeladene Skills | Hauptsitzung beim Delegieren |
| `.github/review-richtlinien.md` | Blickwinkel, Schweregrade, Disposition | KI-Review, Mensch beim Merge |
| `.github/workflows/ki-*.yml` | Auslöser, Modell, Rechte, Werkzeuge | GitHub Actions |

## 7. Kosten begrenzen

- **Review nicht bei jedem Push:** nur beim Öffnen, bei „bereit zum
  Review“ und auf das Label `ki-review`. Reines Abhaken in `tasks.md`
  löst keinen Lauf aus.
- **Ein Durchlauf statt mehrerer Review-Agenten:** Die drei Blickwinkel
  sind Abschnitte im selben Prompt.
- **Gezielt lesen:** Agenten suchen in den Specs per `grep` nach IDs statt
  die über 3.500 Zeilen ganz zu laden.
- **Grenzen je Lauf:** `--max-turns` (Review 50, Triage 20),
  `timeout-minutes`, keine Entwürfe, keine Fork-PRs.
- **Kleine PRs:** Die Größengrenze senkt neben der Komplexität auch die
  Tokens pro Review.
