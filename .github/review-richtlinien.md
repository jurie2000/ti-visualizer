# Review-Richtlinien

Checkliste für die Selbstprüfung des eigenen Diffs vor dem PR. Sie
konzentriert sich auf das, was Sonar und Tests nicht sehen.

## Vorgehen

Erst `git diff main`, dann das verknüpfte Issue (Beschreibung, „Fertig, wenn“,
Bilder), dann nur die geänderten Dateien. Fachliche Fragen
per `grep` im Regelwerk (`docu/001-ti-visualizer-baukasten/regelwerk.md`)
nach Regel-ID oder Stichwort klären, nicht das ganze Regelwerk lesen. Nur auf
Dateien verweisen, die im Repo liegen. Den Diff aus drei Blickwinkeln prüfen.

## Blickwinkel 1: Treue zum Issue

1. **Issue:** Nennt der Pull Request das Issue (`Closes #n`)? Setzt der Diff
   um, was Beschreibung, „Fertig, wenn“ und Bilder im Issue verlangen?
2. **Regelwerk:** Stimmt die Änderung mit den berührten Regeln überein
   (Voraussetzungen, Abläufe)?
3. **Tests:** Sind die Kriterien aus dem Issue und geänderte Regeln getestet?
4. **Katalog:** Hat jeder neue Katalogeintrag `source` und `status`?

## Blickwinkel 2: Umfang und Einfachheit

5. **Umfang:** Ändert der Diff etwas, das nicht zum Issue gehört?
6. **Größe:** Mehr als etwa 300 geänderte Zeilen Produktivcode (ohne Tests
   und Katalog-JSON)? Dann Teilung vorschlagen.
7. **Overengineering:** Abstraktion, Option oder Parameter mit nur einem
   Aufrufer? Nachgebaut, was es im Projekt, der Standardbibliothek oder
   einer installierten Abhängigkeit schon gibt? Neue Abhängigkeit ohne
   Begründung?
8. **Kommentare und Tests:** Kommentare, die den Code nacherzählen oder
   Absätze aus dem Regelwerk kopieren? Tests, die dasselbe mehrfach prüfen?

## Blickwinkel 3: Robustheit und Sicherheit

9. **Sicherheit beim Öffnen:** Werden geöffnete Dateien durch das Schema
   geprüft? Werden Texte nie als HTML ausgegeben?
10. **Barrierefreiheit:** Werden Zustände nie nur über Farbe angezeigt? Ist
    alles per Tastatur bedienbar?
11. **Verhalten:** Randfälle aus dem Issue abgedeckt? Bugfix an der
    Ursache statt am Symptom?

## Befunde

- Höchstens 7 Befunde, die wichtigsten zuerst.
- Jeder Befund mit Beleg: `Datei:Zeile` und, wo es um Fachliches geht, die
  Stelle im Regelwerk. Ohne Beleg kein Befund.
- Keine Vermutungen als Befund. Unsicheres höchstens als Hinweis.

## Schweregrade

Jeder Befund trägt eine Schwere. Sie entscheidet, ob er vor dem PR behoben wird:

- **Hoch:** Verstoß gegen Issue oder Regelwerk, falsches Verhalten, fehlende
  Prüfung beim Öffnen. Gehört nicht in den PR, wird vorher behoben.
- **Mittel:** fachliche Abweichung mit begrenzter Wirkung, Änderung außerhalb
  des Issues, deutliches Overengineering. Kann vertretbar vertagt werden,
  dann im PR-Text nennen.
- **Niedrig / Hinweis:** kleine Unstimmigkeit oder Vormerkung für einen
  Folge-Issue.

## Nicht Aufgabe der Prüfung

Stil, Formatierung, Benennung und Lint-Regeln. Das erledigen ESLint,
Prettier und Sonar.
