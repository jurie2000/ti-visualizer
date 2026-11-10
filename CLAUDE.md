# TI Visualizer: Regeln für KI-Agenten

Gilt für jeden Agenten in diesem Repo: lokal beim Planen und Umsetzen,
im CI beim KI-Review und bei der Issue-Triage.

## Quellen

Alles Fachliche steht in `specs/001-ti-visualizer-baukasten/`:
`spec.md` (FR-IDs), `regelwerk.md` (Regel-IDs), `plan.md` (Entscheidungen
D1 bis D30), `architektur.md`, `tasks.md` (Task-IDs), `quellen.md`.

Die Specs zusammen haben über 3.500 Zeilen. Nicht ganz lesen, sondern
gezielt: `grep` nach Task-ID, FR-ID oder Regel-ID, dann den Abschnitt.

## Ablauf

- Ein Branch je Task (`task/T-xxx-kurzname`), Commit und PR nennen die
  Task-ID, PR-Vorlage ausfüllen.
- Nur den Umfang des Tasks umsetzen. Was nebenbei auffällt, kommt in einen
  eigenen PR oder ein Issue, nicht in diesen Diff.
- **Größe:** höchstens etwa 300 geänderte Zeilen Produktivcode je PR
  (ohne Tests und Katalog-JSON). Ist der Task größer, vor dem Programmieren
  in `tasks.md` teilen (T-xxxa, T-xxxb).
- Fachliche Auslegungsfragen nach `quellen.md` selbst entscheiden und als
  „Auslegung (Datum)“ im Regelwerk oder PR festhalten.
- Skills: `task-umsetzen` für Tasks, `fix-issue` für Issues, `triage` zum
  Einordnen. Umsetzung über den Agenten `umsetzer` (Sonnet).

## Code

Erst das Problem verstehen, dann beim ersten Punkt anhalten, der trägt:

1. Muss das gebaut werden? Nichts über den Task hinaus.
2. Gibt es das im Projekt schon? Vorhandene Helfer und Muster nutzen.
3. Kann das die Standardbibliothek, die Plattform oder eine installierte
   Abhängigkeit? Keine neue Abhängigkeit ohne Begründung im PR.
4. Sonst der kleinste Code, der funktioniert.

- Keine Abstraktion, Option oder Parameter mit nur einem Aufrufer.
- Löschen vor Hinzufügen, langweilig vor clever, wenige Dateien.
- Bugfix behebt die Ursache in der gemeinsamen Funktion, nicht das
  Symptom an einem Aufrufer.
- Nicht sparen bei: Prüfung geöffneter Dateien, Texte nie als HTML,
  Barrierefreiheit (D10), Fehlerbehandlung gegen Datenverlust.

## Kommentare

- Nur das Warum oder eine Referenz (Regel-ID, D-Nummer), nie den Code
  nacherzählen. Keine Spec-Absätze in den Code kopieren.
- JSDoc nur an exportierten Funktionen und Typen, und nur wenn der Name
  nicht reicht.

## Tests

- Jede Regel-ID genau ein Testfall mit der ID im Namen (D18), dazu die
  Kriterien aus „Fertig, wenn“. Keine Varianten-Flut.
- Bugfix: zuerst ein Test, der den Fehler zeigt, dann der Fix.
- Vor dem PR: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`,
  `pnpm format:check`.

## Issues

Einordnung nach `.claude/skills/triage/SKILL.md`. Features und
Spec-Lücken werden erst umgesetzt, wenn das Issue das Label `freigegeben`
trägt.
