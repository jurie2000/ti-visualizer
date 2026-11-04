# Spec-Driven Development in diesem Repo

Bevor Code entsteht, wird die Anforderung in `specs/<nr>-<feature>/` schriftlich
festgehalten. Das Vorgehen lehnt sich an den Workflow von [GitHub Spec-Kit](https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/) an:

1. **spec.md**: was und warum, aus Sicht der Nutzer. Keine Technikentscheidungen.
2. **plan.md**: wie es umgesetzt wird. Architektur, Datenmodell, Dateiformate, Technologieentscheidungen.
3. **tasks.md**: einzeln umsetzbare, überprüfbare Arbeitspakete.
4. **Implementierung**: Coding-Agenten arbeiten die Tasks ab. Jeder Commit
   nennt die Task-ID.

Ziel ist eine KI-gestützte Entwicklung, die sich nachvollziehen und prüfen
lässt, statt „Prompt und hoffen“. Maßgeblich ist die Spec, nicht der Chat-Verlauf.

## Features

| Nr. | Feature | Status |
|---|---|---|
| [001](./001-ti-visualizer-baukasten/spec.md) | TI Visualizer: interaktiver Netzwerk-Baukasten | Spec, Regelwerk, Plan und Tasks im Entwurf |
