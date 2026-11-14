# Review-Richtlinien (KI-Review)

Der Review konzentriert sich auf das, was Sonar und Tests nicht sehen. Über
den Merge entscheidet ein Mensch, der Review ist kein Pflicht-Check.

## Vorgehen

Erst `gh pr diff`, dann das verknüpfte Issue (`gh issue view`: Beschreibung,
„Fertig, wenn“, Bilder), dann nur die geänderten Dateien. Fachliche Fragen
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

Jeder Befund trägt eine Schwere. Sie entscheidet, ob er den Merge aufhält:

- **Hoch:** Verstoß gegen Issue oder Regelwerk, falsches Verhalten, fehlende
  Prüfung beim Öffnen. Blockt den Merge, wird im selben PR behoben.
- **Mittel:** fachliche Abweichung mit begrenzter Wirkung, Änderung außerhalb
  des Issues, deutliches Overengineering. Kann vertretbar vertagt werden.
  Blockt nicht.
- **Niedrig / Hinweis:** kleine Unstimmigkeit oder Vormerkung für einen
  Folge-Issue. Blockt nicht.

## Merge-Disziplin

Der Review ist kein Pflicht-Check und muss nicht null Befunde haben. Vor dem
Merge braucht aber **jeder Befund eine Disposition**, keine offen-ignorierten
Punkte:

- **Fix** — im selben PR behoben (bei Hoch Pflicht).
- **Vertagt** — mit Verweis auf ein Folge-Issue (z. B. „geht in #150“).
- **Wontfix** — mit einem Satz Begründung.

Nie mergen, ohne den Review gelesen zu haben. Ist jeder Befund disponiert und
kein Hoch-Befund offen, darf gemergt werden — die finale Abnahme bleibt beim
Menschen.

Ein erneuter Review nach Fixes läuft nicht automatisch, sondern über das
Label `ki-review` am PR. Er ist nur nach einem Hoch-Befund vorgesehen, um den
Fix zu prüfen, und dann höchstens einmal. Mittel und Niedrig werden
disponiert und im PR festgehalten, ohne neuen Lauf.

## Nicht Aufgabe des Reviews

Stil, Formatierung, Benennung und Lint-Regeln. Das erledigen ESLint,
Prettier und Sonar.

## Ausgabe

- Ein zusammenfassender PR-Kommentar plus Inline-Kommentare, auf Deutsch.
- Der PR-Kommentar beginnt mit `## Überblick` (höchstens 6 Stichpunkte):
  Issue-Nummer, Soll laut Issue, Ist laut Diff, Abweichung.
- Danach `## Befunde`, nach Schwere sortiert, je Befund der Blickwinkel.
