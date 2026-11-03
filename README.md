# TI Visualizer

Interaktiver Netzwerk-Baukasten zum Verstehen der deutschen **Telematikinfrastruktur (TI)**.

Du baust dir eine vereinfachte TI-Landschaft (Praxis, Apotheke, Krankenhaus oder komplett frei) und siehst Schritt für Schritt, was bei typischen Vorgängen wie *eGK stecken*, *eRezept ausstellen* oder *KIM-Mail senden* zwischen den Komponenten passiert – ähnlich wie Cisco Packet Tracer, nur für die TI.

> **Status:** Spec freigegeben, Plan im Entwurf. Es gibt noch keinen lauffähigen Code.

Reine Web-App (React, ohne Backend), die später öffentlich unter
`https://jurie2000.github.io/ti-visualizer/` erreichbar ist. Topologien werden im Browser gespeichert
und lassen sich als JSON-Datei exportieren und importieren.

Das Projekt entsteht im Rahmen einer Bachelorarbeit, siehe [Impressum](IMPRESSUM.md).

## Für wen?

Für alle, die die TI-Architektur lernen oder vermitteln wollen. Der Visualizer ist ein **Lern- und Schulungswerkzeug**, kein Diagnose- oder Log-Analyse-Tool für Produktivumgebungen.

## Was kann das Programm?

- **Topologie bauen**: Geräte aus einer Palette auf die Canvas ziehen, beliebig viele je Typ.
  - Primärsysteme (PVS, KIS, AVS)
  - Smartcards (eGK, HBA, SMC-B)
  - Kartenterminals (stationär, mobil, eHealth-CardLink)
  - Netzwerk-Komponenten (Konnektor, Highspeed-Konnektor, TI-Gateway, VPN-Zugangsdienst)
  - Fachdienste (IDP, VSDM, E-Rezept, KIM, TI-Messenger, ePA)
- **Presets**: Start mit *Arztpraxis*, *Apotheke*, *Krankenhaus* oder leer.
- **Nur gültige Verbindungen**: Das System prüft jede Verbindung fachlich und lehnt ungültige mit einer erklärenden Meldung ab. Beispiele: Ein Primärsystem darf nicht direkt an einen Fachdienst. Konnektor und TI-Gateway schließen sich in einer Topologie aus.
- **Aktionen per Rechtsklick**: Das Kontextmenü eines Geräts zeigt alle möglichen Aktionen. Aktuell nicht ausführbare sind ausgegraut statt versteckt.
- **Simulation-Modus**: Eine Aktion läuft verlangsamt, Schritt für Schritt und mit Erklärtext über den tatsächlichen Pfad des Geräts zur TI. Sie ist jederzeit abbrechbar.
- **Details**: Ein Klick auf Gerät oder Verbindung zeigt Protokoll, Port, TLS-Stufe und Datenformat.
- **Speichern und Laden**: Topologien unter einem Namen ablegen und später wieder öffnen.

### Abgedeckte Abläufe (Auswahl)

| Bereich | Beispiele |
|---|---|
| Karte / VSDM | eGK einlesen, Versichertenstammdaten prüfen und aktualisieren |
| E-Rezept | ausstellen (PVS/KIS), einlösen per eGK oder Rezeptcode (AVS) |
| eAU / KIM | eAU ausstellen und per KIM an die Krankenkasse senden |
| ePA | Dokumente hochladen, Medikationsliste einsehen |
| NFDM / eMP | Notfalldaten und Medikationsplan direkt auf der eGK schreiben und lesen (ohne zentralen Fachdienst) |
| TI-Messenger | informelle Rückfrage an Kolleg:innen |

## Entwicklung: Spec-Driven

Hier entsteht erst die Spec, dann der Code. Die Spec ist die Quelle der Wahrheit, nicht der Chat-Verlauf.

1. `spec.md` – Was und warum
2. `plan.md` – Architektur und Technologieentscheidungen
3. `tasks.md` – überprüfbare Arbeitspakete
4. Umsetzung durch Coding-Agenten, jeder Commit referenziert die Task-ID

Details: [specs/README.md](specs/README.md)

| Nr. | Feature | Status |
|---|---|---|
| [001](specs/001-ti-visualizer-baukasten/spec.md) | Netzwerk-Baukasten | Spec freigegeben, Plan im Entwurf |

## Quellen

Fachliche Grundlage ist das [gematik-Fachportal](https://fachportal.gematik.de/).
Dies ist kein offizielles Angebot der gematik GmbH.

## Lizenz

[MIT](LICENSE) © 2026 Justin Riedel
