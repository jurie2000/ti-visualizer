---
name: fix-issue
description: Setzt ein eingeordnetes GitHub-Issue des TI Visualizers als kleinen PR um. Nutzen bei „/fix-issue 123“, „Issue 123 umsetzen“ oder „behebe Issue 123“.
argument-hint: <issue-nummer>
---

# Issue umsetzen

## Voraussetzungen prüfen

`gh issue view $ARGUMENTS --comments` lesen.

- Kein Label `bug`, `spec-lücke` oder `enhancement`: erst den Skill
  `triage` anwenden und dann anhalten.
- `enhancement` oder `spec-lücke` ohne Label `freigegeben`: anhalten und
  den Nutzer um Freigabe bitten.
- Größe L: anhalten und eine Teilung vorschlagen.

## Umsetzen

1. Bei Feature oder Spec-Lücke zuerst Spec und `tasks.md` ergänzen (neue
   Task-ID, „Umfang“, „Fertig, wenn“; Auslegung mit Quelle festhalten).
   Bei Bug: Task-ID aus dem Triage-Kommentar oder `T-9xx` nehmen.
2. Branch `task/T-xxx-kurzname` von `main`.
3. Bug: zuerst einen Test, der fehlschlägt und den Fehler zeigt. Dann die
   Ursache beheben, alle Aufrufer der geänderten Funktion prüfen.
4. Regeln aus `CLAUDE.md` (Code, Kommentare, Größe) einhalten.
5. Lokale Checks laufen lassen, PR mit Vorlage öffnen, im Text
   `Closes #$ARGUMENTS` nennen.
6. KI-Review abwarten, jeden Befund disponieren
   (`.github/review-richtlinien.md`), dann nach grünen Checks mergen.
