---
name: task-umsetzen
description: Setzt einen Task aus specs/001-ti-visualizer-baukasten/tasks.md als einen kleinen PR um. Nutzen bei „/task-umsetzen T-402“, „setze T-402 um“ oder „nächsten Task bearbeiten“.
argument-hint: <task-id>
---

# Task umsetzen

1. Task `$ARGUMENTS` in `tasks.md` lesen: Umfang, „Fertig, wenn“, FR- und
   Regel-IDs, Vorgänger unter „nach“. Ist ein Vorgänger offen, anhalten.
2. Nur die genannten FR- und Regel-Abschnitte per `grep` nachlesen, dazu
   den betroffenen Code. Jeden Abschnitt ganz lesen, samt der Nachbarregeln
   und Ausnahmen darin, nicht nur die `grep`-Zeile. Die meisten Hoch-Befunde
   im Review sind übersehene Nachbarregeln oder Randfälle.
3. **Umfang schätzen:** Dateien und Zeilen Produktivcode. Über etwa 300:
   anhalten und eine Teilung in `tasks.md` vorschlagen (T-xxxa, T-xxxb).
4. **Skizze vor dem Code** (drei bis zehn Zeilen, nur im Kopf oder PR-Text):
   Datenmodell oder Komponentenzustände, Randfälle (leer, ausgefallen,
   mehrere Treffer, Reihenfolge, Abbruch), Fehlerfälle, Tastatur und
   Screenreader bei UI. Bei Engine-Code zusätzlich: woran wird gebunden
   (Pfad, nicht „erstes Gerät“)? Ist die Antwort unklar, nach `quellen.md`
   entscheiden und als Auslegung festhalten.
5. Branch `task/$ARGUMENTS-kurzname` von `main`, umsetzen nach `CLAUDE.md`.
6. Tests: je Regel-ID mindestens ein Testfall mit der ID im Namen, dazu die
   Kriterien aus „Fertig, wenn“. Die Negativ- und Randfälle aus der Skizze
   zuerst schreiben.
7. **Selbstprüfung vor dem PR:** den eigenen Diff (`git diff main`) gegen
   die Checkliste in `.github/review-richtlinien.md` (Blickwinkel 1 bis 3)
   Punkt für Punkt durchgehen und Treffer vor dem Öffnen beheben. Was der
   Review als Hoch melden würde, gehört nicht mehr in den PR.
8. Task in `tasks.md` abhaken, lokale Checks laufen lassen, PR mit Vorlage
   öffnen.
9. KI-Review abwarten, jeden Befund disponieren (Label `ki-review` nur nach
   einem Hoch-Befund und höchstens einmal neu setzen), dann nach grünen Checks
   mergen, wenn der Nutzer das freigegeben hat (bei Tasks mit Abnahme
   durch Justin erst nach der Abnahme); sonst den PR zur Abnahme übergeben.
