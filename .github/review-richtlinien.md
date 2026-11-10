# Review-Richtlinien (KI-Review)

Grundlage: `specs/001-ti-visualizer-baukasten/plan.md`, Abschnitt „KI-Review“.
Der Review konzentriert sich auf das, was Sonar und Tests nicht sehen. Über
den Merge entscheidet ein Mensch, der Review ist kein Pflicht-Check.

## Vorgehen

Erst `gh pr diff`, dann nur die geänderten Dateien und die im Task
genannten Spec-Abschnitte lesen (per `grep` nach Task-, FR- oder Regel-ID),
nicht die ganzen Specs. Den Diff aus drei Blickwinkeln prüfen.

## Blickwinkel 1: Spec-Treue

1. **Spec und Regelwerk:** Stimmt die Änderung mit der Spec und dem Regelwerk
   überein (Regel-IDs, Voraussetzungen, Abläufe)?
2. **Tests zu Regeln:** Hat jede neue oder geänderte Regel einen Testfall mit
   der Regel-ID im Namen (D18)?
3. **Katalog:** Hat jeder neue Katalogeintrag `source` und `status`?
4. **Task-ID:** Nennt der Pull Request die Task-ID?

## Blickwinkel 2: Umfang und Einfachheit

5. **Umfang:** Ändert der Diff etwas, das nicht zum Task gehört?
6. **Größe:** Mehr als etwa 300 geänderte Zeilen Produktivcode (ohne Tests
   und Katalog-JSON)? Dann Teilung vorschlagen.
7. **Overengineering:** Abstraktion, Option oder Parameter mit nur einem
   Aufrufer? Nachgebaut, was es im Projekt, der Standardbibliothek oder
   einer installierten Abhängigkeit schon gibt? Neue Abhängigkeit ohne
   Begründung?
8. **Kommentare und Tests:** Kommentare, die den Code nacherzählen oder
   Spec-Absätze kopieren? Tests, die dasselbe mehrfach prüfen?

## Blickwinkel 3: Robustheit und Sicherheit

9. **Sicherheit beim Öffnen:** Werden geöffnete Dateien durch das Schema
   geprüft? Werden Texte nie als HTML ausgegeben?
10. **Barrierefreiheit:** Werden Zustände nie nur über Farbe angezeigt? Ist
    alles per Tastatur bedienbar (D10)?
11. **Verhalten:** Randfälle aus „Fertig, wenn“ abgedeckt? Bugfix an der
    Ursache statt am Symptom?

## Befunde

- Höchstens 7 Befunde, die wichtigsten zuerst.
- Jeder Befund mit Beleg: `Datei:Zeile` und, wo es um Fachliches geht, die
  Stelle in Spec oder Regelwerk. Ohne Beleg kein Befund.
- Keine Vermutungen als Befund. Unsicheres höchstens als Hinweis.

## Schweregrade

Jeder Befund trägt eine Schwere. Sie entscheidet, ob er den Merge aufhält:

- **Hoch:** Verstoß gegen Spec oder Regelwerk, falsches Verhalten, fehlende
  Prüfung beim Öffnen. Blockt den Merge, wird im selben PR behoben.
- **Mittel:** fachliche Abweichung mit begrenzter Wirkung, Änderung außerhalb
  des Tasks, deutliches Overengineering. Kann vertretbar vertagt werden.
  Blockt nicht.
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

Ein erneuter Review nach Fixes läuft nicht automatisch, sondern über das
Label `ki-review` am PR.

## Nicht Aufgabe des Reviews

Stil, Formatierung, Benennung und Lint-Regeln. Das erledigen ESLint,
Prettier und Sonar.

## Ausgabe

- Ein zusammenfassender PR-Kommentar plus Inline-Kommentare, auf Deutsch.
- Der PR-Kommentar beginnt mit `## Überblick` (höchstens 6 Stichpunkte):
  Task-ID, Soll laut `tasks.md`, Ist laut Diff, Abweichung.
- Danach `## Befunde`, nach Schwere sortiert, je Befund der Blickwinkel.
