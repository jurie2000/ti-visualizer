---
name: task-umsetzen
description: Setzt einen Task aus specs/001-ti-visualizer-baukasten/tasks.md als einen kleinen PR um. Nutzen bei „/task-umsetzen T-402“, „setze T-402 um“ oder „nächsten Task bearbeiten“.
argument-hint: <task-id>
---

# Task umsetzen

1. Task `$ARGUMENTS` in `tasks.md` lesen: Umfang, „Fertig, wenn“, FR- und
   Regel-IDs, Vorgänger unter „nach“. Ist ein Vorgänger offen, anhalten.
2. Nur die genannten FR- und Regel-Abschnitte per `grep` nachlesen,
   dazu den betroffenen Code.
3. **Umfang schätzen:** Dateien und Zeilen Produktivcode. Über etwa 300:
   anhalten und eine Teilung in `tasks.md` vorschlagen (T-xxxa, T-xxxb).
4. Branch `task/$ARGUMENTS-kurzname` von `main`, umsetzen nach `CLAUDE.md`.
5. Tests: je Regel-ID mindestens ein Testfall mit der ID im Namen, dazu die Kriterien
   aus „Fertig, wenn“.
6. Task in `tasks.md` abhaken, lokale Checks laufen lassen, PR mit Vorlage
   öffnen.
7. KI-Review abwarten, jeden Befund disponieren (Label `ki-review` nur nach
   einem Hoch-Befund und höchstens einmal neu setzen), dann nach grünen Checks
   mergen, wenn der Nutzer das freigegeben hat (bei Tasks mit Abnahme
   durch Justin erst nach der Abnahme); sonst den PR zur Abnahme übergeben.
