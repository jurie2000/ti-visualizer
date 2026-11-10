# Review-Richtlinien (KI-Review)

Grundlage: `specs/001-ti-visualizer-baukasten/plan.md`, Abschnitt „KI-Review“.
Der Review konzentriert sich auf das, was Sonar und Tests nicht sehen. Über
den Merge entscheidet ein Mensch, der Review ist kein Pflicht-Check.

## Prüfpunkte

1. **Spec und Regelwerk:** Stimmt die Änderung mit der Spec und dem Regelwerk
   überein (Regel-IDs, Voraussetzungen, Abläufe)?
2. **Tests zu Regeln:** Hat jede neue oder geänderte Regel einen Testfall mit
   der Regel-ID im Namen (D18)?
3. **Katalog:** Hat jeder neue Katalogeintrag `source` und `status`?
4. **Barrierefreiheit:** Werden Zustände nie nur über Farbe angezeigt? Ist
   alles per Tastatur bedienbar (D10)?
5. **Sicherheit beim Öffnen:** Werden geöffnete Dateien durch das Schema
   geprüft? Werden Texte nie als HTML ausgegeben?
6. **Task-ID:** Nennt der Pull Request die Task-ID?

## Schweregrade

Jeder Befund trägt eine Schwere. Sie entscheidet, ob er den Merge aufhält:

- **Hoch:** Verstoß gegen Spec oder Regelwerk, falsches Verhalten, fehlende
  Prüfung beim Öffnen. Blockt den Merge, wird im selben PR behoben.
- **Mittel:** fachliche Abweichung mit begrenzter Wirkung, die vertretbar
  vertagt werden kann. Blockt nicht.
- **Niedrig / Hinweis:** kleine Unstimmigkeit oder Vormerkung für einen
  Folge-Task. Blockt nicht.

## Merge-Disziplin

Der Review ist kein Pflicht-Check und muss nicht null Befunde haben. Vor dem
Merge braucht aber **jeder Befund eine Disposition**, keine offen-ignorierten
Punkte:

- **Fix** — im selben PR behoben (bei Hoch Pflicht).
- **Vertagt** — mit Verweis auf den Folge-Task (z. B. „geht in T-402“).
- **Wontfix** — mit einem Satz Begründung.

Nie mergen, ohne den Review gelesen zu haben. Ist jeder Befund disponiert und
kein Hoch-Befund offen, darf gemergt werden — die finale Abnahme bleibt beim
Menschen.

## Nicht Aufgabe des Reviews

Stil, Formatierung und allgemeine Codequalität. Das erledigen ESLint,
Prettier und Sonar.

## Ausgabe

- Ein zusammenfassender PR-Kommentar plus Inline-Kommentare, auf Deutsch.
- Der PR-Kommentar beginnt mit `## Überblick` (höchstens 6 Stichpunkte):
  Task-ID, Soll laut `tasks.md`, Ist laut Diff, Abweichung.
- Danach `## Befunde`, nach Schwere sortiert.
