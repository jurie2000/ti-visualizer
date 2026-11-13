---
name: fix-issue
description: Setzt ein GitHub-Issue des TI Visualizers als kleinen PR um. Nutzen bei „/fix-issue 123“, „Issue 123 umsetzen“ oder „behebe Issue 123“.
argument-hint: <issue-nummer>
---

# Issue umsetzen

## Voraussetzungen prüfen

`gh issue view $ARGUMENTS --comments` lesen.

- Kein Label `bug`, `enhancement` oder `chore`: anhalten und den Nutzer
  um das Label bitten.
- `enhancement` ohne Label `freigegeben`: anhalten und den Nutzer um
  Freigabe bitten. Nie selbst setzen.
- Größe L: anhalten und eine Teilung vorschlagen.

## Umsetzen

1. Fachliche Grundlage per `grep` in `docu/001-ti-visualizer-baukasten/`
   suchen (Regel-ID, Stichwort), den Abschnitt ganz lesen, samt
   Nachbarregeln und Ausnahmen. Dazu den betroffenen Code. Ändert sich das
   Verhalten, zuerst `regelwerk.md` ergänzen; Auslegung mit Quelle
   (`quellen.md`) festhalten.
2. Skizze vor dem Code (drei bis zehn Zeilen, nur im Kopf oder PR-Text):
   Randfälle, Fehlerfälle, Tastatur und Screenreader bei UI.
3. Branch `issue/$ARGUMENTS-kurzname` von `main`.
4. Bug: zuerst einen Test, der fehlschlägt und den Fehler zeigt. Dann die
   Ursache beheben, alle Aufrufer der geänderten Funktion prüfen.
5. Regeln aus `CLAUDE.md` (Code, Kommentare, Größe, Tests) einhalten.
6. Vor dem PR den eigenen Diff (`git diff main`) gegen die Checkliste in
   `.github/review-richtlinien.md` prüfen und Treffer beheben. Lokale
   Checks laufen lassen, PR mit Vorlage öffnen, im Text
   `Closes #$ARGUMENTS` nennen.
7. KI-Review abwarten, jeden Befund disponieren (neuer Lauf nur nach Hoch,
   höchstens einmal, Label `ki-review`; `.github/review-richtlinien.md`).
   Mergen nur, wenn der Nutzer das freigegeben hat; sonst den PR zur
   Abnahme übergeben.
