# Spec-Driven Development in diesem Repo

Bevor Code entsteht, wird die Anforderung in `specs/<nr>-<feature>/` schriftlich
festgehalten – angelehnt an den Workflow von [GitHub Spec-Kit](https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/):

1. **spec.md** – Was und warum, aus Nutzersicht. Keine Technik-Entscheidungen.
2. **plan.md** – Wie: Architektur, Datenmodell, API-Vertrag, Technologieentscheidungen.
3. **tasks.md** – Zerlegung in einzeln umsetzbare, überprüfbare Arbeitspakete.
4. **Implementierung** – Coding-Agenten arbeiten die Tasks ab; jeder Commit
   referenziert die Task-ID.

Ziel: nachvollziehbare, überprüfbare KI-gestützte Entwicklung statt
"Prompt und hoffen" – die Spec ist die Quelle der Wahrheit, nicht der Chat-Verlauf.

## Features

| Nr. | Feature | Status |
|---|---|---|
| [001](./001-ti-visualizer-baukasten/spec.md) | TI Visualizer – interaktiver Netzwerk-Baukasten | Spec in Überarbeitung, Regelwerk offen |
