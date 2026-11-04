# Spec 001: TI Visualizer – interaktiver Netzwerk-Baukasten

**Status:** In Überarbeitung (2026-11-03). Die fachlich freigegebene Fassung
vom 2026-09-20 ist erweitert um die Funktionen aus dem Mockup
(`design/mockup/`) und einen vollständigen Katalog der gängigen
TI-Komponenten. Die Kombinationsregeln stehen im
[Regelwerk](./regelwerk.md), jede mit Quelle. Widersprüche zwischen Spec,
Regelwerk und Plan sind aufgelöst (2026-11-03). Neue Freigabe durch
Justin offen.
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

Dafür sollen **alle gängigen Komponenten der TI** verfügbar sein, vom
Primärsystem über das lokale Praxisnetz bis zu den zentralen Diensten.
Einsteiger arbeiten mit einer vereinfachten Sicht, Fortgeschrittene können
Anschlüsse, Netzwerkeinstellungen und typische Störungen nachvollziehen.

Log-Import/Replay ist bewusst kein Teil der Vision.

## Nutzer-Szenarien

**Aufbauen**
1. Besucher beginnt entweder leer oder wählt ein vordefiniertes Preset
   ("Arztpraxis"/PVS, "Apotheke"/AVS, "Krankenhaus"/KIS, "Klinikum") als
   Start-Topologie.
2. Besucher zieht Geräte aus einer nach Kategorie gruppierten Palette auf
   die Canvas — beliebig viele Geräte je Typ. Eine Suche findet Geräte
   nach Namen.
3. Besucher verbindet zwei Geräte durch Auswahl von Quell- und Zielgerät;
   das System lässt nur fachlich gültige Verbindungen zu (siehe
   [Regelwerk](./regelwerk.md)) und verhindert ungültige Versuche mit einer
   erklärenden Meldung.
4. Besucher fasst Geräte in **Zonen** zusammen (z. B. „Praxisnetz“,
   „Telematikinfrastruktur“), benennt und färbt sie.
5. Besucher nutzt die üblichen Editor-Hilfen: Rückgängig/Wiederholen,
   Kopieren/Einfügen/Duplizieren, automatisch anordnen, Zoom, Minimap,
   „alles einpassen“.
6. Besucher speichert seine aufgebaute Topologie unter einem Namen und kann
   sie später wieder laden.

**Ansichten**
7. Besucher wechselt zwischen **Einfach** und **Erweitert**. Einfach zeigt
   nur Geräte und logische Verbindungen. Erweitert zeigt zusätzlich die
   Anschlüsse der Geräte (z. B. Ethernet, USB, WLAN) und erlaubt
   Netzwerk- und Geräteeinstellungen (siehe FR-17).

**Abläufe**
8. Besucher öffnet per Rechtsklick auf ein Gerät ein Kontextmenü mit allen
   dafür grundsätzlich möglichen Aktionen; aktuell nicht ausführbare
   Aktionen sind sichtbar, aber ausgegraut, mit Begründung.
9. Besucher startet eine verfügbare Aktion auf einem konkreten Gerät; der
   Ablauf läuft über den tatsächlichen Pfad dieses Geräts zur TI (oder,
   bei kartenbasierten Aktionen wie NFDM/eMP, lokal über den Konnektor
   bis zur eGK) und wird
   im Simulation-Modus (verlangsamt, Schritt für Schritt, mit Erklärtext)
   visualisiert.
10. Besucher kann eine laufende Aktion jederzeit abbrechen.
11. Besucher klickt auf ein Gerät oder eine Verbindung und sieht
    Detailinformationen (Protokoll, Port, TLS-Stufe, Datenformat).

**Lernen**
12. Besucher folgt einem **geführten Tutorial**: Schritt für Schritt eine
    Arztpraxis aufbauen bis zum ersten E-Rezept, danach eine Apotheke
    ergänzen und das Rezept dort einlösen. Persona-Figuren (z. B.
    Praxisinhaber:in, MFA, Apotheker:in) begleiten die Schritte.
13. Besucher löst **Herausforderungen**: Eine vorbereitete Topologie
    enthält einen Fehler (z. B. „Kein Rezept am Empfang“, „Montagmorgen“,
    „Nach dem Umzug“, „Schnelles Internet“, „Totalausfall“). Ziel ist, die
    Ursache zu finden und zu beheben. Gelöste Herausforderungen werden
    markiert.
14. Besucher stößt eine **Sicherheitsprüfung** an. Sie listet Probleme der
    Topologie: ausgefallene Geräte, abgelaufene Karten oder Zertifikate,
    fehlende PIN-Freischaltung, falsche Netzsegmente, fehlende
    Erreichbarkeit.
15. Besucher simuliert **Störungen**: Gerät ausfallen lassen, Karte
    ablaufen lassen, PIN-Status ändern. Aktionen und Prüfung reagieren
    darauf.

## Funktionale Anforderungen

**Bestand (freigegeben 2026-09-20, sinngemäß erweitert)**
- **FR-1**: Geräte-Palette, gruppiert nach den Kategorien des
  Komponentenkatalogs, zum Ziehen auf die Canvas; mit Suche.
- **FR-2**: Presets "Arztpraxis" (PVS), "Apotheke" (AVS), "Krankenhaus"
  (KIS), "Klinikum" sowie leerer Start.
- **FR-3**: Zwei Geräte durch Quell-/Zielauswahl verbinden können; beliebig
  viele Geräte desselben Typs pro Topologie erlaubt.
- **FR-4**: Fachliche Gültigkeit wird nach dem [Regelwerk](./regelwerk.md)
  geprüft; ungültige Verbindung wird verhindert, mit Begründung. Konnektor
  und TI-Gateway schließen sich innerhalb einer Topologie gegenseitig aus
  (nur eines von beiden).
- **FR-5**: Aufgebaute Topologie unter einem Namen speichern und später
  wieder laden.
- **FR-6**: Rechtsklick auf ein Gerät öffnet Kontextmenü mit allen für den
  Gerätetyp grundsätzlich möglichen Aktionen (siehe Operationskatalog).
- **FR-7**: Aktuell nicht ausführbare Aktionen werden im Kontextmenü
  sichtbar, aber ausgegraut angezeigt, mit Begründung.
- **FR-8**: Eine gewählte Aktion läuft über den tatsächlichen Pfad von genau
  diesem Gerät zur TI bzw. — bei rein kartenbasierten Aktionen — bis zur
  betroffenen Smartcard.
- **FR-9**: Ablauf wird im Simulation-Modus (verlangsamt, Schritt für
  Schritt, mit Erklärtext) visualisiert.
- **FR-10**: Laufende Aktion jederzeit abbrechbar.
- **FR-11**: Klick auf Gerät/Verbindung zeigt Detailinformationen.
- **FR-12**: Alle Fachdaten (Gerätetypen, Regeln, Protokolle, Aktionen,
  Presets, Herausforderungen, Tutorial) sowie gespeicherte Topologien
  persistent und versioniert.

**Neu (aus dem Mockup, 2026-11-03)**
- **FR-13**: Ansichtsmodus **Einfach/Erweitert**, jederzeit umschaltbar.
- **FR-14**: **Anschlüsse** je Gerätetyp (z. B. Ethernet, WAN, USB, WLAN,
  logischer VPN-/TI-Zugang). Im Modus Erweitert wählt der Nutzer beim
  Verbinden den Anschluss; im Modus Einfach wählt das System einen freien
  passenden Anschluss automatisch. Welche Anschlüsse ein Gerät hat und wie
  viele Verbindungen ein Anschluss trägt, legt das Regelwerk fest.
- **FR-15**: **Zonen**: Geräte gruppieren, Zone benennen, einfärben,
  verschieben und entfernen.
- **FR-16**: **Editor-Hilfen**: Rückgängig/Wiederholen, Kopieren/Einfügen/
  Duplizieren, automatisch anordnen (rückgängig machbar), Zoom, Minimap,
  alles einpassen.
- **FR-17**: **Geräteeinstellungen** im Modus Erweitert, soweit für das
  Verständnis der TI nötig: IP-Adresse, Netzmaske, Gateway, DNS, VLAN,
  DHCP, Betriebsart des Konnektors (Reihe/Parallel), Secure Internet
  Service (SIS), Update-Stand, Zertifikatslaufzeit, Zeitabweichung.
  Der genaue Umfang steht im Regelwerk.
- **FR-18**: **Karten- und Gerätezustand**: Karten stecken und ziehen,
  Ablaufdatum von Karten, PIN-Status (freigeschaltet oder nicht), Gerät
  als ausgefallen markieren.
- **FR-19**: **Sicherheitsprüfung**: prüft die Topologie gegen die
  Prüfregeln des Regelwerks und listet Befunde mit Erklärung und
  betroffenem Gerät. Auswahl eines Befunds hebt das Gerät hervor.
- **FR-20**: **Geführtes Tutorial** mit Schritten, Fortschritt,
  Vor/Zurück und Persona-Figuren; zwei Teile (Praxis bis E-Rezept,
  Apotheke bis Einlösung).
- **FR-21**: **Herausforderungen**: vorbereitete fehlerhafte Topologien
  mit Aufgabenstellung; das System erkennt, wenn der Fehler behoben ist,
  und merkt sich gelöste Herausforderungen lokal.
- **FR-22**: **Hell-/Dunkelmodus** und vollständige Tastaturbedienung mit
  Übersicht der Tastaturkürzel.

## Komponentenkatalog

Ziel ist, **alle gängigen Komponenten der TI** abzubilden. Die folgende
Liste ist der Zielumfang. Welche Komponente in welcher Ansicht
(Einfach/Erweitert) erscheint und wie sie kombiniert werden darf, legt das
[Regelwerk](./regelwerk.md) fest.

Markierung: **(F)** freigegeben am 2026-09-20 · **(N)** neu seit
2026-11-03 (aus Mockup oder Recherche). Schlüssel, Modus (Einfach/
Erweitert), Status und Quelle jeder Komponente stehen im
[Regelwerk, Abschnitt 1](./regelwerk.md#1-gerätetypen); alle Quellen in
**[quellen.md](./quellen.md)**.

**Primärsysteme und Clients**
- PVS (Praxisverwaltungssystem, Arztpraxis; auch Zahnarzt- und
  Psychotherapiepraxis) (F)
- KIS (Krankenhausinformationssystem, zentral) (F)
- AVS (Apotheken-Verwaltungssystem) (F)
- Pflege-Software (Pflegeeinrichtung) (N)
- RIS, LIS (Subsysteme im Krankenhaus) (N)
- Arbeitsplatz-PC, Visite-Tablet (Arbeitsplätze eines Primärsystems) (N)
- KIM-Clientmodul (lokal, zwischen Primärsystem und Konnektor) (N)
- TI-Messenger-Client (N)

**Smartcards**
- eGK (elektronische Gesundheitskarte, Versicherte) — trägt neben der
  reinen Identität auch NFDM- und eMP-Daten direkt auf dem Chip (F)
- HBA (Heilberufsausweis — für QES/Signatur, für NFDM/eMP) (F)
- SMC-B (Institutionskarte, Praxis/Apotheke/Klinik/Pflege — für
  TI-Authentifizierung) (F)
- Technische Karten gSMC-KT, gSMC-K und HSM-B: **keine eigenen Knoten**,
  sondern Eigenschaften des jeweiligen Geräts (N)
- Karten sind **kein eigener Knoten auf der Canvas**, sondern stecken in
  einem Kartenterminal (Zustand des Terminals, entschieden 2026-11-03)

**Kartenterminals**
- eHealth-Kartenterminal (stationär) (F)
- Mobiles Kartenterminal — arbeitet offline, Übergabe ans Primärsystem
  per USB (F)
- eHealth-CardLink — liest nur die eGK per NFC über das Smartphone der
  versicherten Person, ohne PIN, und verhält sich gegenüber dem
  Konnektor/TI-Gateway wie ein eHealth-Kartenterminal (F)

**Lokales Netz** (N)
- Switch, Internet-Router (mit WLAN), WLAN Access Point, Firewall

**Zugang zur TI und Netze**
- Konnektor, Betriebsart Reihe oder Parallel (F)
- Highspeed-Konnektor (Rechenzentrum, Krankenhaus) (F)
- TI-Gateway — Übergangsweg zur TI 2.0. **Schließt sich mit
  Konnektor/Highspeed-Konnektor gegenseitig aus** (F)
- VPN-Zugangsdienst (F)
- Internet (Transportnetz) und Zentrales Netz der TI (N)

**Zentrale TI-Dienste**
- IDP (zentraler Identity Provider) (F)
- Namensdienst, Zeitdienst, Verzeichnisdienst (VZD), TSL-Dienst mit
  OCSP, sektoraler IDP (GesundheitsID) (N)

**Fachdienste**
- VSDM-Fachdienst (Krankenkasse) (F)
- E-Rezept-Fachdienst (F)
- KIM-Fachdienst (F)
- TI-Messenger-Fachdienst (TIM) — informeller Echtzeit-Chat, bewusst
  getrennt von KIM (F)
- ePA-Aktensystem (ePA für alle) (F)
- PoPP-Service (Nachweis des Behandlungskontexts, TI 2.0) — in v1 nur
  als Komponente im Modus Erweitert, ohne eigenen Ablauf (N)

**Versicherte und Gegenstellen** (N)
- Krankenkasse als Empfänger (z. B. der eAU über KIM)
- Versicherten-Apps: E-Rezept-App, ePA-App

**Wichtig: NFDM und eMP haben KEINEN eigenen zentralen Fachdienst.**
Notfalldatenmanagement (NFDM) und der elektronische Medikationsplan (eMP)
werden direkt auf dem Chip der eGK gespeichert (dezentral). Die Aktion
läuft über Primärsystem → Konnektor (Fachmodul NFDM bzw. AMTS) →
Kartenterminal → eGK, **ohne** VPN-Zugangsdienst und Fachdienst.
*Korrigiert 2026-11-03:* Die Fachmodule sind Teil des Konnektors
(gemSpec_FM_NFDM, gemSysL_AMTS_A, siehe [quellen.md](./quellen.md))
([gematik NFDM](https://fachportal.gematik.de/anwendungen/notfalldaten-management),
[gematik eMP](https://fachportal.gematik.de/anwendungen/elektronischer-medikationsplan)).

**Wichtige Präzisierung: eAU ist kein eigener Fachdienst-Knoten.** Die
elektronische Arbeitsunfähigkeitsbescheinigung ist ein Anwendungsfall, der
über den bestehenden KIM-Fachdienst läuft (PVS/KIS → KIM → Krankenkasse),
optional zusätzlich als Patientenkopie in die ePA hochladbar.

**Weiterhin nicht im Zielumfang:** MyHealth@EU, Digitale Patientenrechnung
(DiPag), Signaturdienst, Schlüsselgenerierungsdienst ePA, HDDT — zu
speziell für den Lernzweck. Kann im Regelwerk neu bewertet werden.

## Regelwerk

Wie die Komponenten kombiniert werden dürfen, wird in einem eigenen
Dokument erarbeitet: **[regelwerk.md](./regelwerk.md)** (Entwurf, jede
Regel mit Quelle). Es ist die fachliche Quelle für die Regel-Engine und den
Datenkatalog und umfasst:

- **Verbindungsregeln**: welche Gerätetypen über welche Anschlussart
  verbunden werden dürfen, mit Begründungstext für ungültige Versuche
- **Anschlüsse**: Anschlüsse je Gerätetyp und wie viele Verbindungen
  jeder trägt
- **Ausschlüsse**: Komponenten, die sich in einer Topologie gegenseitig
  ausschließen (z. B. Konnektor vs. TI-Gateway)
- **Aktionsvoraussetzungen**: was vorhanden, verbunden, gesteckt und
  freigeschaltet sein muss, damit eine Aktion ausführbar ist
- **Konfigurationsregeln** (Modus Erweitert): IP-Adressen, Gateway,
  VLAN, DNS, Betriebsart Reihe/Parallel, SIS
- **Prüfregeln** für die Sicherheitsprüfung und Herausforderungen,
  jeweils mit Erklärung
- **Sichtbarkeit**: welche Komponenten und Regeln im Modus Einfach gelten
  und welche nur im Modus Erweitert

Jede Regel hat eine Quelle aus [quellen.md](./quellen.md) und einen
Status (**bestätigt**, **plausibel**, **Vereinfachung**, **offen**).

**Die Verbindungsregeln stehen ausschließlich im Regelwerk** (Abschnitt
4: Grundprüfungen, Erlaubnisliste, Begründungsliste, Ausschlüsse). Die
hier früher geführte Verbindungsmatrix (freigegeben 2026-09-20) ist
vollständig dort aufgegangen; ihre alte Fassung bleibt in der
Git-Historie nachvollziehbar.

Leitsätze, die das Regelwerk umsetzt:
- Nur ausdrücklich erlaubte Verbindungen sind gültig (Erlaubnisliste).
- Smartcards stecken nur in Kartenterminals; nur die eGK geht per NFC an
  CardLink oder eine Versicherten-App.
- Primärsysteme und Kartenterminals erreichen Fachdienste nie direkt,
  sondern über Konnektor/TI-Gateway und VPN-Zugangsdienst.
- Konnektor/Highspeed-Konnektor und TI-Gateway schließen sich in einer
  Topologie aus.
- NFDM/eMP laufen lokal über die Fachmodule im Konnektor bis zur eGK,
  ohne VPN und Fachdienst.
- Der IDP wird über die TI erreicht; der TI-Messenger über das Internet
  (entschieden 2026-11-03 bis zu einem anderslautenden Beleg).
- Die Anzahl der Geräte pro Typ ist unbegrenzt; ein Kartenterminal
  arbeitet mit höchstens einem Konnektor.

## Operationskatalog

Die Liste unten ist freigegeben (2026-09-20). Ergänzungen für die neuen
Komponenten und die genauen Voraussetzungen je Aktion kommen ins
[Regelwerk](./regelwerk.md).

**Kartenterminal / eHealth-CardLink**
- Karte stecken / ziehen (Auswahl einer freien Karte)
- eGK/HBA/SMC-B einlesen (Karte stecken, ggf. PIN-Eingabe); über
  eHealth-CardLink nur die eGK per NFC, ohne PIN
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
läuft. Bei NFDM/eMP arbeitet der Konnektor nur lokal über seine
Fachmodule, ohne VPN und Fachdienst (korrigiert 2026-11-03).

**Fachdienste** (Gegenstelle, kein eigener Nutzer-Trigger)
- VSDM-Fachdienst: beantwortet ReadVSD
- E-Rezept-Fachdienst: nimmt Rezepte entgegen, gibt sie bei Einlösung heraus
- ePA-Aktensystem: nimmt Dokumente entgegen, verwaltet Zugriffsrechte
  (Standard-Behandlungskontext 90 Tage, von Versicherten per App verlängerbar)
- KIM-/TIM-Fachdienst: übermitteln Nachrichten
- IDP: stellt Token bereit, v. a. beim ePA-Zugriff

**Alle Geräte** (neu)
- Details anzeigen
- Gerät als ausgefallen markieren bzw. wieder in Betrieb nehmen (Störung)
- Einstellungen öffnen (nur Modus Erweitert)

## Außerhalb des Scopes (v1)

- Log-Import/Replay echter Logs — bewusst kein Teil der Vision (kein
  Diagnose-Tool)
- Eine KI-Funktion innerhalb der Anwendung selbst — die KI-Komponente
  dieses Projekts ist der Entwicklungsprozess (Spec → Plan → Tasks →
  agentenbasierte Umsetzung), nicht ein Produktfeature
- Nutzer-Accounts/Mehrbenutzerbetrieb (gespeicherte Topologien ohne Login)
- Zweiter Modus (Realtime) zusätzlich zum Simulation-Modus
- Echte Protokollimplementierung oder Paketanalyse — Netzwerkeinstellungen
  (FR-17) dienen dem Verständnis und werden nur gegen die Prüfregeln
  ausgewertet
- MyHealth@EU, DiPag und weitere Spezialdienste (siehe Komponentenkatalog)

## Erfolgskriterien

- Nutzer kann von einem der vier Presets oder leer starten, beliebig viele
  Geräte aus allen Kategorien hinzufügen und nur gültig verbinden (inkl.
  Konnektor/TI-Gateway gegenseitig ausschließend)
- Nutzer kann eine gebaute Topologie speichern und wieder laden
- Die bekannten Aktionen (eGK stecken/VSDM, eRezept ausstellen und
  einlösen, KIM-Mail senden, NFDM-Notfalldaten erfassen, eMP anlegen und
  auslesen) sind über das Kontextmenü auf einem passenden Gerät ausführbar
  und im Simulation-Modus sichtbar
- Nicht ausführbare Aktionen erscheinen ausgegraut statt versteckt
- Modus Einfach und Erweitert funktionieren beide; im Modus Erweitert sind
  Anschlüsse und Einstellungen sichtbar
- Das Tutorial lässt sich vollständig durchspielen; jede Herausforderung
  ist lösbar und wird als gelöst erkannt
- Die Sicherheitsprüfung findet jede simulierte Störung
- Tests decken jede Regel des Regelwerks, die Aktions-Ausführung und die
  Prüfregeln ab

## Offene Punkte

- [x] Fachliche Freigabe von Operationskatalog und Verbindungsregel-Matrix
  (Fassung 2026-09-20)
- [x] Format/Umfang der gespeicherten Topologie — an plan.md verwiesen
- [x] Komponentenkatalog festgelegt; jede Komponente im Regelwerk mit
  Quelle belegt (2026-11-03)
- [x] Widersprüche Spec ↔ Regelwerk ↔ Plan aufgelöst (2026-11-03):
  Verbindungsmatrix nur noch im Regelwerk, IDP über die TI, TI-Messenger
  über das Internet, Karten als Zustand des Terminals, PoPP nur als
  Komponente, Preset Klinikum aus dem Mockup
- [x] Persona-Bilder: von Justin selbst generiert, zur Veröffentlichung
  freigegeben (2026-11-03)
- [ ] Restpunkte im Regelwerk (Abschnitt 12 dort: CardLink-Netzweg,
  Beleg V-17, eAU-Dienstkennungen)
- [ ] Herausforderungen und Tutorial-Texte fachlich abnehmen
- [ ] Neue fachliche Freigabe der erweiterten Spec durch Justin
- [ ] plan.md vollständig an die Erweiterung anpassen (Katalogformat,
  Anschlüsse, Zonen, Modi, Tutorial, Herausforderungen, Einstellungen,
  Sicherheitsprüfung)
