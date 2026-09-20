# Spec 001: TI Visualizer – interaktiver Netzwerk-Baukasten

**Status:** Von Justin fachlich freigegeben (2026-09-20). Komponentenkatalog,
Verbindungsregel-Matrix (inkl. des als "plausibel" markierten IDP-Pfads) und
Operationskatalog (inkl. NFDM, eMP) sind bestätigt. Bereit für die
Plan-Phase (plan.md).
**Feature:** 001-ti-visualizer-baukasten
**Projekt:** ti-visualizer (komplett neues Repo, ersetzt nicht das bestehende
`ti-network-visualizer`, das als Referenz/Prototyp bestehen bleibt)

## Warum

Der TI Visualizer dient dem Verständnis und der Vermittlung der
Telematikinfrastruktur-Architektur — als Lern- und Schulungswerkzeug für
alle, die die TI verstehen wollen, nicht als Diagnose- oder
Log-Analyse-Tool für echte Produktivumgebungen. Nutzer bauen sich eine
eigene, vereinfachte TI-Landschaft (Praxis, Apotheke, Krankenhaus oder
komplett frei) zusammen — ähnlich dem Prinzip von Cisco Packet Tracer,
übertragen auf die TI — und erleben Schritt für Schritt, was bei typischen
Vorgängen (eGK stecken, eRezept ausstellen, KIM-Mail senden) tatsächlich
zwischen den Komponenten passiert.

Log-Import/Replay ist bewusst kein Teil der Vision.

## Nutzer-Szenarien

1. Besucher beginnt entweder leer oder wählt ein vordefiniertes Preset
   ("Arztpraxis"/PVS, "Apotheke"/AVS, "Krankenhaus"/KIS) als Start-Topologie.
2. Besucher zieht Geräte aus einer nach Kategorie gruppierten Palette
   (Primärsysteme, Smartcards, Kartenterminals, Netzwerk-Komponenten,
   Fachdienste) auf die Canvas — beliebig viele Geräte je Typ.
3. Besucher verbindet zwei Geräte durch Auswahl von Quell- und Zielgerät;
   das System lässt nur fachlich gültige Verbindungen zu (siehe
   Verbindungsregel-Matrix) und verhindert ungültige Versuche mit einer
   erklärenden Meldung.
4. Besucher speichert seine aufgebaute Topologie unter einem Namen und kann
   sie später wieder laden.
5. Besucher öffnet per Rechtsklick auf ein Gerät ein Kontextmenü mit allen
   dafür grundsätzlich möglichen Aktionen; aktuell nicht ausführbare
   Aktionen sind sichtbar, aber ausgegraut.
6. Besucher startet eine verfügbare Aktion auf einem konkreten Gerät; der
   Ablauf läuft über den tatsächlichen Pfad dieses Geräts zur TI (oder,
   bei kartenbasierten Aktionen wie NFDM/eMP, nur bis zur eGK) und wird
   im Simulation-Modus (verlangsamt, Schritt für Schritt, mit Erklärtext)
   visualisiert.
7. Besucher kann eine laufende Aktion jederzeit abbrechen.
8. Besucher klickt auf ein Gerät oder eine Verbindung und sieht
   Detailinformationen (Protokoll, Port, TLS-Stufe, Datenformat).

## Funktionale Anforderungen

- **FR-1**: Geräte-Palette (gruppiert: Primärsysteme, Smartcards,
  Kartenterminals, Netzwerk-Komponenten, Fachdienste) zum Ziehen auf die
  Canvas.
- **FR-2**: Presets "Arztpraxis" (PVS), "Apotheke" (AVS), "Krankenhaus"
  (KIS) sowie leerer Start.
- **FR-3**: Zwei Geräte durch Quell-/Zielauswahl verbinden können; beliebig
  viele Geräte desselben Typs pro Topologie erlaubt.
- **FR-4**: Fachliche Gültigkeit wird nach der Verbindungsregel-Matrix
  geprüft; ungültige Verbindung wird verhindert, mit Begründung. Konnektor
  und TI-Gateway schließen sich innerhalb einer Topologie gegenseitig aus
  (nur eines von beiden).
- **FR-5**: Aufgebaute Topologie unter einem Namen speichern und später
  wieder laden.
- **FR-6**: Rechtsklick auf ein Gerät öffnet Kontextmenü mit allen für den
  Gerätetyp grundsätzlich möglichen Aktionen (siehe Operationskatalog).
- **FR-7**: Aktuell nicht ausführbare Aktionen werden im Kontextmenü
  sichtbar, aber ausgegraut angezeigt.
- **FR-8**: Eine gewählte Aktion läuft über den tatsächlichen Pfad von genau
  diesem Gerät zur TI bzw. — bei rein kartenbasierten Aktionen — bis zur
  betroffenen Smartcard.
- **FR-9**: Ablauf wird im Simulation-Modus (verlangsamt, Schritt für
  Schritt, mit Erklärtext) visualisiert.
- **FR-10**: Laufende Aktion jederzeit abbrechbar.
- **FR-11**: Klick auf Gerät/Verbindung zeigt Detailinformationen.
- **FR-12**: Alle Fachdaten (Gerätetypen, Verbindungsregeln, Protokolle,
  Aktionen, Presets, gespeicherte Topologien) persistent und versioniert.

## Komponentenkatalog

Quelle: gematik-Fachportal ([Komponenten & Dienste](https://fachportal.gematik.de/hersteller-anbieter/komponenten-dienste),
[Liste der Anwendungen](https://fachportal.gematik.de/anwendungen)),
[TI-Gateway](https://fachportal.gematik.de/hersteller-anbieter/komponenten-dienste/konnektor),
[TI-Messenger](https://www.gematik.de/anwendungen/ti-messenger),
[eHealth-CardLink](https://fachportal.gematik.de/hersteller-anbieter/komponenten-dienste/ehealth-cardlink).

**Primärsysteme** (ein Gerätetyp, drei Ausprägungen — passend zu den Presets)
- PVS (Praxisverwaltungssystem, Arztpraxis)
- KIS (Krankenhausinformationssystem, Krankenhaus)
- AVS (Apotheken-Verwaltungssystem, Apotheke)

**Smartcards**
- eGK (elektronische Gesundheitskarte, Versicherte) — trägt neben der
  reinen Identität auch NFDM- und eMP-Daten direkt auf dem Chip
- HBA (Heilberufsausweis, Ärzt:innen — für QES/Signatur, ab 2. Generation
  für NFDM/eMP erforderlich)
- SMC-B (Institutionskarte, Praxis/Apotheke — für TI-Authentifizierung)
- *Bewusst ausgeschlossen*: SMC-KT/gSMC-K (technische Karten in
  Kartenterminal/Konnektor, werden nie selbst "gesteckt")

**Kartenterminals**
- eHealth-Kartenterminal (stationär)
- Mobiles Kartenterminal
- eHealth-CardLink — Smartphone-Alternative: liest die eGK per NFC und
  verhält sich gegenüber dem Konnektor/TI-Gateway wie ein
  eHealth-Kartenterminal (TLS/SICCT übers Internet statt Kabel/TCP 4742)

**Netzwerk-Komponenten / Zugang zur TI**
- Konnektor
- Highspeed-Konnektor
- TI-Gateway — gematiks Übergangsweg zu TI 2.0 (Ziel: Hardware wie
  Konnektoren langfristig überflüssig machen). **Schließt sich mit
  Konnektor/Highspeed-Konnektor gegenseitig aus** — eine Topologie nutzt
  entweder klassische Konnektor-Hardware oder TI-Gateway, nicht beides.
- VPN-Zugangsdienst

**Fachdienste**
- IDP (Identity Provider)
- VSDM-Fachdienst
- E-Rezept-Fachdienst
- KIM-Fachdienst
- TI-Messenger (TIM) — informeller Echtzeit-Chat, bewusst getrennt von KIM
  (KIM = formal signierte Dokumente wie Arztbriefe/eAU; TIM = schnelle,
  informelle Rückfragen)
- ePA-Aktensystem (ePA 3.0 / "ePA für alle")

**Wichtig: NFDM und eMP haben KEINEN eigenen zentralen Fachdienst.**
Notfalldatenmanagement (NFDM) und der elektronische Medikationsplan (eMP)
werden direkt auf dem Chip der eGK gespeichert (dezentral) — die Aktion
läuft über Primärsystem → Kartenterminal → eGK, ohne den Umweg über
Konnektor-VPN → zentralen Fachdienst zu nehmen
([gematik NFDM](https://fachportal.gematik.de/anwendungen/notfalldaten-management),
[gematik eMP](https://fachportal.gematik.de/anwendungen/elektronischer-medikationsplan)).

**Wichtige Präzisierung: eAU ist kein eigener Fachdienst-Knoten.** Die
elektronische Arbeitsunfähigkeitsbescheinigung ist ein Anwendungsfall, der
über den bestehenden KIM-Fachdienst läuft (PVS/KIS → KIM → Krankenkasse),
optional zusätzlich als Patientenkopie in die ePA hochladbar.

**Bewusst nicht in die Palette aufgenommen:**
- Reine Infrastruktur/PKI-Ebene, für den Lernzweck zu tief: Verzeichnisdienst,
  Namensdienst, Konfigurationsdienst, Zeitdienst, OCSP-Proxy, TSL-Dienst,
  Signaturdienst, Trust-Service-Provider/CA, Schlüsselgenerierungsdienst
  ePA, HDDT
- Spezialisierte/neuere Anwendungen, für v1 zu weit vom Praxis-Alltag weg:
  MyHealth@EU (grenzüberschreitender EU-Datenaustausch), Digitale
  Patientenrechnung (DiPag)
  ([gematik Anwendungsliste](https://fachportal.gematik.de/anwendungen))

## Verbindungsregel-Matrix

Recherchiert anhand gematik-Fachportal/-Spezifikationen. Konfidenz pro Regel
markiert — **bestätigt** (klar in offiziellen Quellen belegt) oder
**plausibel** (aus mehreren Quellen abgeleitet, aber ohne eine einzelne
eindeutige Architektur-Referenz gefunden; bitte von Justin als TI-Praktiker
gegenprüfen).

| Von | Nach | Status |
|---|---|---|
| eGK / HBA / SMC-B | Kartenterminal (physisch gesteckt) | bestätigt |
| eGK | eHealth-CardLink (NFC) | bestätigt |
| Kartenterminal | Konnektor **oder** TI-Gateway | bestätigt |
| eHealth-CardLink | Konnektor **oder** TI-Gateway | bestätigt (verhält sich wie Kartenterminal) |
| Primärsystem (PVS/KIS/AVS) | Konnektor **oder** TI-Gateway | bestätigt |
| Konnektor / TI-Gateway | VPN-Zugangsdienst | bestätigt |
| VPN-Zugangsdienst | VSDM-Fachdienst, E-Rezept-Fachdienst, KIM-Fachdienst, TIM, ePA-Aktensystem | bestätigt |
| Primärsystem (bzw. dessen Middleware) | IDP-Dienst | **plausibel** — OIDC/OAuth2 direkt übers Internet, ohne zwingend über den VPN-Zugangsdienst zu laufen; so bereits im bestehenden Prototyp modelliert, aber nicht durch eine einzelne eindeutige Quelle belegt |

**Sonderfall NFDM/eMP**: keine eigene Verbindung nötig — läuft über die
bereits vorhandene Kette Primärsystem→Kartenterminal→eGK, nie über
Konnektor-VPN→Fachdienst.

**Explizit ungültig** (vom System zu verhindern):
- Kartenterminal/eHealth-CardLink/Smartcard direkt mit einem Fachdienst
  (muss immer über Konnektor/TI-Gateway laufen)
- Primärsystem direkt mit einem Fachdienst (muss immer über
  Konnektor/TI-Gateway + VPN-Zugangsdienst laufen)
- Smartcard direkt mit Konnektor/TI-Gateway (muss immer über
  Kartenterminal/eHealth-CardLink laufen)
- Konnektor/Highspeed-Konnektor UND TI-Gateway gleichzeitig in derselben
  Topologie

Innerhalb der erlaubten Typen ist die Anzahl der Geräte pro Typ unbegrenzt
(z. B. mehrere Kartenterminals an einem Konnektor, mehrere Primärsysteme in
einer Krankenhaus-Topologie).

## Operationskatalog

**Kartenterminal / eHealth-CardLink**
- eGK/HBA/SMC-B einlesen (Karte stecken bzw. NFC, ggf. PIN-Eingabe)
- VSDM-Prüfung/-Aktualisierung anstoßen: Konnektor/TI-Gateway gleicht Daten
  über die TI mit dem VSDM-Fachdienst der Krankenkasse ab; nach
  erfolgreicher Prüfung ggf. Update der Daten auf der eGK, Übernahme ins
  Primärsystem
  ([gematik VSDM](https://fachportal.gematik.de/anwendungen/versichertenstammdaten-management))
- Notfalldaten auf die eGK schreiben (NFDM): Vorerkrankungen, aktuelle
  Medikation, Allergien, Kontakte behandelnder Ärzte/Angehöriger — mit HBA
  qualifiziert signiert, direkt auf dem Kartenchip gespeichert, optional
  patienteneigener PIN-Schutz
  ([gematik NFDM](https://fachportal.gematik.de/anwendungen/notfalldaten-management))
- Persönliche Erklärungen auf die eGK schreiben (NFDM): Aufbewahrungsort von
  Organspendeausweis, Patientenverfügung, Vorsorgevollmacht
- Medikationsplan (eMP) auf die eGK schreiben/aktualisieren — ebenfalls
  kartenbasiert, kein zentraler Dienst
  ([gematik eMP](https://fachportal.gematik.de/anwendungen/elektronischer-medikationsplan))
- Medikationsplan (eMP) auslesen — auch durch Apotheken möglich (siehe AVS)

**PVS / KIS** (Praxis/Klinik-seitige Aktionen)
- eRezept ausstellen (signiert mit HBA/QES, ggf. per Komfortsignatur mehrere
  auf einmal ohne erneute PIN-Eingabe)
- eAU ausstellen und per KIM an die Krankenkasse übermitteln
- eAU-Patientenkopie optional als PDF/A in die ePA hochladen — **kein
  Automatismus**, nur auf Patientenwunsch
  ([KBV](https://www.kbv.de/praxis/tools-und-services/praxisnachrichten/2025/07-31/neue-serie-alles-nur-eine-frage-welche-dokumente-stellen-praxen-in-die-epa-ein))
- Befund-/Arztbrief/Bilddaten in die ePA hochladen (bis 25 MB/Dokument)
- ePA-Medikationsliste einsehen (verordnete/eingelöste Rezepte)
- Notfalldatensatz erfassen und signiert auf die eGK schreiben (NFDM)
- Medikationsplan (eMP) erstellen/aktualisieren — Erstanlage typischerweise
  durch den Hausarzt, auf Wunsch des Versicherten
- VSDM-Prüfung anstoßen (siehe Kartenterminal)
- TIM-Nachricht senden (informelle Rückfrage an Kolleg:innen)

**AVS** (Apotheke)
- eRezept einlösen — zwei Wege: eGK einlesen ODER Rezeptcode (App/Ausdruck)
  scannen ([gematik E-Rezept Apotheken](https://www.gematik.de/anwendungen/e-rezept/apotheken))
- Medikationsplan (eMP) auslesen (z. B. für Interaktionsprüfung/Beratung —
  Apotheken sind laut gematik explizit zum Auslesen berechtigt)
- SMC-B-Authentifizierung für TI-Zugang (Voraussetzung jeder Apotheken-Aktion)

**Konnektor / TI-Gateway**
Laufen im Hintergrund bei jeder Fachdienst-basierten Aktion mit (Signatur,
Verschlüsselung, VPN-Tunnel, ReadVSD, Rezept abrufen/übermitteln) — kein
eigenes Kontextmenü mit Nutzer-Aktionen, sondern der Pfad, über den alles
läuft. Bei NFDM/eMP sind sie nicht beteiligt (rein kartenbasiert).

**Fachdienste** (Gegenstelle, kein eigener Nutzer-Trigger)
- VSDM-Fachdienst: beantwortet ReadVSD
- E-Rezept-Fachdienst: nimmt Rezepte entgegen, gibt sie bei Einlösung heraus
- ePA-Aktensystem: nimmt Dokumente entgegen, verwaltet Zugriffsrechte
  (Standard-Behandlungskontext 90 Tage, von Versicherten per App verlängerbar)
- KIM-/TIM-Fachdienst: übermitteln Nachrichten
- IDP: stellt Token bereit, v. a. beim ePA-Zugriff

## Außerhalb des Scopes (v1)

- Log-Import/Replay echter Logs — bewusst kein Teil der Vision (kein
  Diagnose-Tool)
- Eine KI-Funktion innerhalb der Anwendung selbst — die KI-Komponente
  dieses Projekts ist der Entwicklungsprozess (Spec → Plan → Tasks →
  agentenbasierte Umsetzung), nicht ein Produktfeature
- Nutzer-Accounts/Mehrbenutzerbetrieb (gespeicherte Topologien vorerst ohne
  Login)
- Zweiter Modus (Realtime) zusätzlich zum Simulation-Modus
- Layer-3-/Geräte-Binnenkonfiguration (IP-Adressen, Zertifikate) — Fokus
  bleibt auf TI-Topologie-Ebene, nicht Geräte-Binnenkonfiguration wie bei
  Packet Tracer
- Reine Infrastruktur-/PKI-Dienste sowie MyHealth@EU/DiPag (siehe
  Komponentenkatalog) — laufen konzeptionell mit bzw. sind zu speziell,
  sind aber keine eigenen Palette-Einträge

## Erfolgskriterien

- Nutzer kann von einem der drei Presets oder leer starten, beliebig viele
  Geräte hinzufügen und nur gültig verbinden (inkl. Konnektor/TI-Gateway
  gegenseitig ausschließend)
- Nutzer kann eine gebaute Topologie speichern und wieder laden
- Die bekannten Aktionen (eGK stecken/VSDM, eRezept ausstellen und
  einlösen, KIM-Mail senden, NFDM-Notfalldaten erfassen, eMP anlegen und
  auslesen) sind über das Kontextmenü auf einem passenden Gerät ausführbar
  und im Simulation-Modus sichtbar
- Nicht ausführbare Aktionen erscheinen ausgegraut statt versteckt
- Tests decken Verbindungsvalidierung und Aktions-Ausführung ab

## Offene Punkte

Alle Punkte aus der Spec-Phase sind erledigt:

- [x] Fachliche Freigabe von Operationskatalog und Verbindungsregel-Matrix
  durch Justin, inkl. der als "plausibel" markierten IDP-Anbindung —
  freigegeben am 2026-09-20
- [x] Format/Umfang der gespeicherten Topologie — bewusst an plan.md
  verwiesen (technische Entscheidung, kein spec.md-Thema mehr)

Keine offenen Punkte mehr für spec.md. Nächster Schritt: plan.md
(technische Umsetzung: Architektur, Datenmodell, API-Vertrag,
Technologieentscheidungen).
