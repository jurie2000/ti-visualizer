# Sicherheitsrichtlinie

## Schwachstellen melden

Bitte melde Sicherheitslücken **nicht** als öffentliches Issue.

Nutze stattdessen die private Meldung von GitHub („Private vulnerability
reporting“): im Repository den Reiter **Security** öffnen, dann
**Report a vulnerability** wählen. Die Meldung ist nur für die
Maintainer sichtbar.

Hilfreich sind:

- betroffene Version bzw. Commit,
- Schritte zur Reproduktion (bei Dateien: eine Beispieldatei `.tiv.json`),
- erwartete und beobachtete Auswirkung.

Die Bearbeitung erfolgt im Rahmen eines privaten, nicht-kommerziellen
Lernprojekts ohne feste Fristen. Eine Rückmeldung versuche ich in der Regel
innerhalb weniger Tage zu geben. Weitere Kontaktangaben stehen im
[Impressum](./IMPRESSUM.md).

## Geltungsbereich

Die App läuft vollständig im Browser und sendet keine Daten an einen Server.
Relevant sind vor allem das Öffnen präparierter Dateien (Injection,
Denial of Service) sowie Schwachstellen in Abhängigkeiten und der Build-
Pipeline.
