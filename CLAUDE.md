# TI Visualizer: Regeln für KI-Agenten

Gilt für jeden Agenten in diesem Repo: lokal beim Planen und Umsetzen,
im CI beim KI-Review.

## Quellen

Fachliches steht in `docu/001-ti-visualizer-baukasten/`: `regelwerk.md`
(Regel-IDs), `architektur.md`, `quellen.md`. Das Regelwerk dient dazu,
fachliche Fragen zu klären und Tests zu schreiben. Die Anforderung selbst
steht im Issue (Beschreibung, „Fertig, wenn“, Bilder).

Verweise (Kommentare, PR-Text, Review) nur auf das, was im Repo liegt oder
im Issue steht. Lokale Dateien außerhalb des Repos nicht nennen.

Das Regelwerk ist lang. Nicht ganz lesen, sondern gezielt: `grep` nach
Regel-ID oder Stichwort, dann den Abschnitt.

## Ablauf

- Jeder PR kommt aus einem Issue: Branch `issue/<nr>-kurzname`, Commit und
  PR nennen die Issue-Nummer, im PR steht `Closes #<nr>`, PR-Vorlage
  ausfüllen.
- Nur den Umfang des Issues umsetzen. Was nebenbei auffällt, kommt in einen
  eigenen PR oder ein Issue, nicht in diesen Diff.
- **Größe:** höchstens etwa 300 geänderte Zeilen Produktivcode je PR
  (ohne Tests und Katalog-JSON). Ist das Issue größer, vor dem Programmieren
  in kleinere Issues teilen.
- Fachliche Auslegungsfragen nach `quellen.md` selbst entscheiden und als
  „Auslegung (Datum)“ im Regelwerk oder PR festhalten.
- Skill `fix-issue` für Issues. Umsetzung über den Agenten `umsetzer`
  (Sonnet).

## Code

Erst das Problem verstehen, dann beim ersten Punkt anhalten, der trägt:

1. Muss das gebaut werden? Nichts über das Issue hinaus.
2. Gibt es das im Projekt schon? Vorhandene Helfer und Muster nutzen.
3. Kann das die Standardbibliothek, die Plattform oder eine installierte
   Abhängigkeit? Keine neue Abhängigkeit ohne Begründung im PR.
4. Sonst der kleinste Code, der funktioniert.

- Keine Abstraktion, Option oder Parameter mit nur einem Aufrufer.
- Löschen vor Hinzufügen, langweilig vor clever, wenige Dateien.
- Bugfix behebt die Ursache in der gemeinsamen Funktion, nicht das
  Symptom an einem Aufrufer.
- Nicht sparen bei: Prüfung geöffneter Dateien, Texte nie als HTML,
  Barrierefreiheit, Fehlerbehandlung gegen Datenverlust.

## Kommentare

- Nur das Warum oder eine Referenz (Regel-ID, Issue-Nummer), nie den Code
  nacherzählen. Keine Absätze aus dem Regelwerk in den Code kopieren.
- JSDoc nur an exportierten Funktionen und Typen, und nur wenn der Name
  nicht reicht.

## Tests

- Tests decken die Kriterien aus „Fertig, wenn“ im Issue und die berührten
  Regeln des Regelwerks ab. Die Regel-ID im Testnamen hilft beim Finden,
  ist aber keine Pflicht. Keine Varianten-Flut.
- Bugfix: zuerst ein Test, der den Fehler zeigt, dann der Fix.
- Vor dem PR: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`,
  `pnpm format:check`.

## Issues

Die Issue-Vorlagen setzen das Label: `bug`, `enhancement` (Funktion) oder
`chore`. Funktionen werden erst umgesetzt, wenn das Issue das Label
`freigegeben` trägt. Fehler und Aufgaben brauchen es nicht.
