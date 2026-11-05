# Spec 001: TI Visualizer, interaktiver Netzwerk-Baukasten

**Status:** Freigegeben (2026-11-05). Die fachlich freigegebene Fassung
vom 2026-09-20 ist erweitert um die Funktionen aus dem Mockup
(`design/mockup/`) und einen vollständigen Katalog der gängigen
TI-Komponenten. Die Kombinationsregeln stehen im
[Regelwerk](./regelwerk.md), jede mit Quelle. Widersprüche zwischen Spec,
Regelwerk und Plan sind aufgelöst (2026-11-03). Fachlich freigegeben
durch Justin am 2026-11-05 (T-907).
**Feature:** 001-ti-visualizer-baukasten
**Projekt:** ti-visualizer (komplett neues Repo, ersetzt nicht das bestehende
`ti-network-visualizer`, das als Referenz/Prototyp bestehen bleibt)

## Warum

Der TI Visualizer hilft, die Architektur der Telematikinfrastruktur zu
verstehen und zu vermitteln. Er ist ein Lern- und Schulungswerkzeug für
alle, die die TI verstehen wollen. Ein Werkzeug zur Diagnose oder
Log-Analyse echter Produktivumgebungen ist er nicht. Nutzer bauen sich eine
eigene, vereinfachte TI-Landschaft zusammen: eine Praxis, eine Apotheke,
ein Krankenhaus oder etwas ganz Freies. Das Prinzip stammt von Cisco
Packet Tracer und ist auf die TI übertragen. Schritt für Schritt sehen die
Nutzer, was bei typischen Vorgängen wie eGK stecken, eRezept ausstellen
oder KIM-Mail senden zwischen den Komponenten passiert.

Dafür sollen **alle gängigen Komponenten der TI** verfügbar sein, vom
Primärsystem über das lokale Praxisnetz bis zu den zentralen Diensten.
Einsteiger arbeiten mit einer vereinfachten Sicht, Fortgeschrittene können
Anschlüsse, Netzwerkeinstellungen und typische Störungen nachvollziehen.

Log-Import und Replay gehören nicht dazu.

## Nutzer-Szenarien

**Aufbauen**
1. Benutzer beginnt entweder leer oder wählt ein vordefiniertes Preset
   ("Arztpraxis"/PVS, "Apotheke"/AVS, "Krankenhaus"/KIS, "Klinikum") als
   Start-Topologie.
2. Benutzer zieht Geräte aus einer nach Kategorie gruppierten Palette auf
   die Canvas, beliebig viele Geräte je Typ. Eine Suche findet Geräte
   nach Namen.
3. Benutzer verbindet zwei Geräte durch Auswahl von Quell- und Zielgerät.
   Das System lässt nur fachlich gültige Verbindungen zu (siehe
   [Regelwerk](./regelwerk.md)) und verhindert ungültige Versuche mit einer
   erklärenden Meldung.
4. Benutzer fasst Geräte in **Zonen** zusammen (z. B. „Praxisnetz“,
   „Telematikinfrastruktur“), benennt und färbt sie.
5. Benutzer nutzt die üblichen Editor-Hilfen: Rückgängig/Wiederholen,
   Kopieren/Einfügen/Duplizieren, automatisch anordnen, Zoom, Minimap,
   „alles einpassen“.
6. Benutzer speichert seine Topologie als Datei, auf Wunsch zusammen mit
   seinen Einstellungen, und öffnet sie später wieder, auch in einem
   anderen Browser oder auf einem anderen Gerät. Beim Öffnen wird die
   Topologie übernommen, Einstellungen nur nach Rückfrage. Ein Autosave
   schützt vor Datenverlust beim Neuladen.

**Ansichten**
7. Benutzer wechselt zwischen **Einfach** und **Erweitert**. Die
   Topologie bleibt dabei dieselbe. Einfach blendet Netzgeräte wie Switch
   und Router aus und fasst Wege über sie als Sammelkanten zusammen.
   Erweitert zeigt alle Geräte, ihre Anschlüsse (z. B. Ethernet, USB,
   WLAN) und erlaubt Netzwerk- und Geräteeinstellungen (siehe FR-17).

**Abläufe**
8. Benutzer öffnet per Rechtsklick auf ein Gerät ein Kontextmenü mit allen
   dafür grundsätzlich möglichen Aktionen. Was gerade nicht ausführbar
   ist, bleibt sichtbar, ist aber ausgegraut und begründet.
9. Benutzer startet eine verfügbare Aktion auf einem konkreten Gerät. Der
   Ablauf nimmt den tatsächlichen Pfad dieses Geräts zur TI. Bei
   kartenbasierten Aktionen wie NFDM/eMP geht er lokal über den Konnektor
   bis zur eGK. Der Simulation-Modus zeigt den Ablauf verlangsamt, Schritt
   für Schritt und mit Erklärtext.
10. Benutzer kann eine laufende Aktion jederzeit abbrechen.
11. Benutzer klickt auf ein Gerät oder eine Verbindung und sieht
    Detailinformationen (Protokoll, Port, TLS-Stufe, Datenformat).

**Lernen**
12. Benutzer folgt einem **geführten Tutorial**: Schritt für Schritt eine
    Arztpraxis aufbauen bis zum ersten E-Rezept, danach eine Apotheke
    ergänzen und das Rezept dort einlösen. Persona-Figuren (z. B.
    Praxisinhaber:in, MFA, Apotheker:in) begleiten die Schritte.
13. Benutzer löst **Herausforderungen**: Eine vorbereitete Topologie
    enthält einen Fehler (z. B. „Kein Rezept am Empfang“, „Montagmorgen“,
    „Nach dem Umzug“, „Schnelles Internet“, „Totalausfall“). Ziel ist, die
    Ursache zu finden und zu beheben. Gelöste Herausforderungen werden
    markiert.
14. Benutzer stößt eine **Sicherheitsprüfung** an. Sie listet Probleme der
    Topologie: ausgefallene Geräte, abgelaufene Karten oder Zertifikate,
    fehlende PIN-Freischaltung, falsche Netzsegmente, fehlende
    Erreichbarkeit.
15. Benutzer simuliert **Störungen**: Gerät ausfallen lassen, Verbindung
    trennen, Karte ablaufen lassen, PIN-Status ändern. Aktionen und
    Prüfung reagieren darauf, in beiden Modi.

## Funktionale Anforderungen

**Bestand (freigegeben 2026-09-20, sinngemäß erweitert)**
- **FR-1**: Geräte-Palette, gruppiert nach den Kategorien des
  Komponentenkatalogs, zum Ziehen auf die Canvas, mit Suche.
- **FR-2**: Presets "Arztpraxis" (PVS), "Apotheke" (AVS), "Krankenhaus"
  (KIS), "Klinikum" sowie leerer Start.
- **FR-3**: Zwei Geräte durch Quell-/Zielauswahl verbinden können. Pro
  Topologie sind beliebig viele Geräte desselben Typs erlaubt.
- **FR-4**: Fachliche Gültigkeit wird nach dem [Regelwerk](./regelwerk.md)
  geprüft. Eine ungültige Verbindung wird mit Begründung verhindert. Konnektor
  und TI-Gateway schließen sich innerhalb einer Topologie gegenseitig aus
  (nur eines von beiden).
- **FR-5**: Topologie als Datei speichern und in jedem Browser wieder
  öffnen. Einstellungen nur optional zusätzlich, nie allein, und beim
  Öffnen nur nach Rückfrage übernommen. Autosave des aktuellen Stands im
  Browser.
- **FR-6**: Rechtsklick auf ein Gerät öffnet Kontextmenü mit allen für den
  Gerätetyp grundsätzlich möglichen Aktionen (siehe Operationskatalog).
- **FR-7**: Aktuell nicht ausführbare Aktionen werden im Kontextmenü
  sichtbar, aber ausgegraut angezeigt, mit Begründung.
- **FR-8**: Eine gewählte Aktion läuft über den tatsächlichen Pfad von genau
  diesem Gerät zur TI. Bei rein kartenbasierten Aktionen endet sie an der
  betroffenen Smartcard.
- **FR-9**: Ablauf wird im Simulation-Modus (verlangsamt, Schritt für
  Schritt, mit Erklärtext) visualisiert.
- **FR-10**: Laufende Aktion jederzeit abbrechbar.
- **FR-11**: Klick auf Gerät/Verbindung zeigt Detailinformationen:
  Protokoll, Datenformat, TLS und Netzport, soweit belegt, dazu die
  Quelle.
- **FR-12**: Alle Fachdaten (Gerätetypen, Regeln, Protokolle, Aktionen,
  Presets, Herausforderungen, Tutorial) sowie gespeicherte Topologien
  persistent und versioniert.

**Neu (aus dem Mockup, 2026-11-03)**
- **FR-13**: Ansichtsmodus **Einfach/Erweitert**, jederzeit umschaltbar.
  Der Modus ändert nur die Darstellung, nie die Topologie. Im Modus
  Einfach werden Netzgeräte ausgeblendet und als Sammelkanten gezeigt.
- **FR-14**: **Anschlüsse** je Gerätetyp (z. B. Ethernet, WAN, USB, WLAN,
  logischer VPN-/TI-Zugang). Im Modus Erweitert wählt der Nutzer beim
  Verbinden den Anschluss. Im Modus Einfach wählt das System einen freien
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
  Ablaufdatum von Karten (gegen ein festes Simulationsdatum der
  Topologie), PIN-Status (freigeschaltet oder nicht), Gerät als
  ausgefallen markieren, Verbindung trennen.
- **FR-19**: **Sicherheitsprüfung**: prüft die Topologie gegen die
  Prüfregeln des Regelwerks und listet Befunde mit Erklärung und
  betroffenem Gerät. Auswahl eines Befunds hebt das Gerät hervor.
- **FR-20**: **Geführtes Tutorial** mit Schritten, Fortschritt,
  Vor/Zurück und Persona-Figuren. Es hat zwei Teile: Praxis bis zum
  E-Rezept, Apotheke bis zur Einlösung.
- **FR-21**: **Herausforderungen**: vorbereitete fehlerhafte Topologien
  mit Aufgabenstellung. Das System erkennt, wenn der Fehler behoben ist,
  und merkt sich gelöste Herausforderungen in den Einstellungen.
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
[Regelwerk, Abschnitt 1](./regelwerk.md#1-gerätetypen). Alle Quellen
stehen in **[quellen.md](./quellen.md)**.

**Primärsysteme und Clients**
- PVS (Praxisverwaltungssystem für Arztpraxis, Zahnarzt- und
  Psychotherapiepraxis) (F)
- KIS (Krankenhausinformationssystem, zentral) (F)
- AVS (Apotheken-Verwaltungssystem) (F)
- Pflege-Software (Pflegeeinrichtung) (N)
- RIS, LIS (Subsysteme im Krankenhaus) (N)
- Arbeitsplatz-PC, Visite-Tablet (Arbeitsplätze eines Primärsystems) (N)
- KIM-Clientmodul (lokal, zwischen Primärsystem und Konnektor) (N)
- TI-Messenger-Client (N)

**Smartcards**
- eGK (elektronische Gesundheitskarte der Versicherten). Sie trägt neben
  der Identität auch NFDM- und eMP-Daten direkt auf dem Chip (F)
- HBA (Heilberufsausweis für QES/Signatur und für NFDM/eMP) (F)
- SMC-B (Institutionskarte von Praxis, Apotheke, Klinik oder Pflege für
  die Anmeldung an der TI) (F)
- Technische Karten gSMC-KT, gSMC-K und HSM-B: **keine eigenen Knoten**,
  sondern Eigenschaften des jeweiligen Geräts (N)
- Karten sind **kein eigener Knoten auf der Canvas**, sondern stecken in
  einem Kartenterminal (Zustand des Terminals, entschieden 2026-11-03)

**Kartenterminals**
- eHealth-Kartenterminal (stationär) (F)
- Mobiles Kartenterminal. Es arbeitet offline und gibt die Daten per USB
  ans Primärsystem (F)
- eHealth-CardLink. Ein Dienst im Internet ohne Kartenslots. Er liest
  nur die eGK per NFC über das Smartphone der versicherten Person, ohne
  PIN, und verhält sich gegenüber dem Konnektor/TI-Gateway wie ein
  eHealth-Kartenterminal. Gedacht vor allem für die E-Rezept-Einlösung in
  der Fernversorgung durch Apotheken (F)

**Lokales Netz** (N)
- Switch, Internet-Router (mit WLAN), WLAN Access Point, Firewall

**Zugang zur TI und Netze**
- Konnektor, Betriebsart Reihe oder Parallel (F)
- Highspeed-Konnektor (Rechenzentrum, Krankenhaus) (F)
- TI-Gateway als Übergangsweg zur TI 2.0. **Schließt sich mit
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
- TI-Messenger-Fachdienst (TIM) für informelle Chats in Echtzeit,
  getrennt von KIM (F)
- ePA-Aktensystem (ePA für alle) (F)
- PoPP-Service (Nachweis des Behandlungskontexts, TI 2.0). In v1 nur als
  Komponente im Modus Erweitert, ohne eigenen Ablauf (N)

**Versicherte und Gegenstellen** (N)
- Krankenkasse als Empfänger (z. B. der eAU über KIM)
- Versicherten-Apps: E-Rezept-App, ePA-App

**NFDM und eMP haben keinen eigenen zentralen Fachdienst.**
Notfalldatenmanagement (NFDM) und der elektronische Medikationsplan (eMP)
werden direkt auf dem Chip der eGK gespeichert (dezentral). Die Aktion
läuft über Primärsystem → Konnektor (Fachmodul NFDM bzw. AMTS) →
Kartenterminal → eGK, **ohne** VPN-Zugangsdienst und Fachdienst.
Am 2026-11-03 korrigiert: Die Fachmodule sind Teil des Konnektors
(gemSpec_FM_NFDM, gemSysL_AMTS_A, siehe [quellen.md](./quellen.md),
[gematik NFDM](https://fachportal.gematik.de/anwendungen/notfalldaten-management),
[gematik eMP](https://fachportal.gematik.de/anwendungen/elektronischer-medikationsplan)).

**Die eAU ist kein eigener Fachdienst-Knoten.** Die
elektronische Arbeitsunfähigkeitsbescheinigung ist ein Anwendungsfall, der
über den bestehenden KIM-Fachdienst läuft (PVS/KIS → KIM → Krankenkasse),
optional zusätzlich als Patientenkopie in die ePA hochladbar.

**Weiterhin nicht im Zielumfang:** MyHealth@EU, Digitale Patientenrechnung
(DiPag), Signaturdienst, Schlüsselgenerierungsdienst ePA, HDDT. Sie sind
für den Lernzweck zu speziell. Das Regelwerk kann sie neu bewerten.

## Regelwerk

Wie die Komponenten kombiniert werden dürfen, wird in einem eigenen
Dokument erarbeitet: **[regelwerk.md](./regelwerk.md)** (freigegeben 2026-11-05, jede
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
vollständig dort aufgegangen. Die alte Fassung findet sich in der
Git-Historie.

Grundsätze des Regelwerks:
- Nur ausdrücklich erlaubte Verbindungen sind gültig (Erlaubnisliste).
- Smartcards stecken nur in Kartenterminals. Nur die eGK geht per NFC an
  CardLink oder eine Versicherten-App.
- Primärsysteme und Kartenterminals erreichen Fachdienste nie direkt,
  sondern über Konnektor/TI-Gateway und VPN-Zugangsdienst.
- Konnektor/Highspeed-Konnektor und TI-Gateway schließen sich in einer
  Topologie aus. Das ist eine Vereinfachung: Eine Topologie bildet in v1
  eine Einrichtung ab.
- Der Modus Einfach oder Erweitert ändert nur die Darstellung, nie die
  Topologie.
- NFDM/eMP laufen lokal über die Fachmodule im Konnektor bis zur eGK,
  ohne VPN und Fachdienst.
- Der IDP wird über die TI erreicht, der TI-Messenger über das Internet.
  Das gilt seit 2026-11-03, bis ein Beleg etwas anderes zeigt.
- Die Anzahl der Geräte pro Typ ist unbegrenzt. Ein Kartenterminal
  arbeitet mit höchstens einem Konnektor.

## Operationskatalog

Die Liste unten ist freigegeben (2026-09-20). Ergänzungen für die neuen
Komponenten und die genauen Voraussetzungen je Aktion kommen ins
[Regelwerk](./regelwerk.md).

**Kartenterminal / eHealth-CardLink**
- Karte stecken / ziehen: „Stecken“ legt eine neue Karte einer Art an,
  die im Terminal noch fehlt, „Ziehen“ entfernt sie
- eGK/HBA/SMC-B einlesen (Karte stecken, ggf. PIN-Eingabe). Über
  eHealth-CardLink nur die eGK per NFC, ohne PIN
- VSDM-Prüfung/-Aktualisierung anstoßen: Konnektor/TI-Gateway gleicht Daten
  über die TI mit dem VSDM-Fachdienst der Krankenkasse ab. Nach
  erfolgreicher Prüfung werden die Daten auf der eGK bei Bedarf
  aktualisiert und ins Primärsystem übernommen
  ([gematik VSDM](https://fachportal.gematik.de/anwendungen/versichertenstammdaten-management))
- Notfalldaten auf die eGK schreiben (NFDM): Vorerkrankungen, aktuelle
  Medikation, Allergien, Kontakte behandelnder Ärzte/Angehöriger. Der
  Datensatz wird mit dem HBA qualifiziert signiert und direkt auf dem
  Kartenchip gespeichert. Die versicherte Person kann ihn per PIN schützen
  ([gematik NFDM](https://fachportal.gematik.de/anwendungen/notfalldaten-management))
- Persönliche Erklärungen auf die eGK schreiben (NFDM): Aufbewahrungsort von
  Organspendeausweis, Patientenverfügung, Vorsorgevollmacht
- Medikationsplan (eMP) auf die eGK schreiben/aktualisieren. Auch das
  läuft über die Karte, ohne zentralen Dienst
  ([gematik eMP](https://fachportal.gematik.de/anwendungen/elektronischer-medikationsplan))
- Medikationsplan (eMP) auslesen, auch durch Apotheken (siehe AVS)

**PVS / KIS** (Praxis/Klinik-seitige Aktionen)
- eRezept ausstellen (signiert mit HBA/QES, ggf. per Komfortsignatur mehrere
  auf einmal ohne erneute PIN-Eingabe)
- eAU ausstellen und per KIM an die Krankenkasse übermitteln
- eAU-Patientenkopie optional als PDF/A in die ePA hochladen. Das
  geschieht **nicht automatisch**, nur auf Wunsch der Patientin oder des
  Patienten
  ([KBV](https://www.kbv.de/praxis/tools-und-services/praxisnachrichten/2025/07-31/neue-serie-alles-nur-eine-frage-welche-dokumente-stellen-praxen-in-die-epa-ein))
- Befund-/Arztbrief/Bilddaten in die ePA hochladen (bis 25 MB/Dokument)
- ePA-Medikationsliste einsehen (verordnete/eingelöste Rezepte)
- Notfalldatensatz erfassen und signiert auf die eGK schreiben (NFDM)
- Medikationsplan (eMP) erstellen/aktualisieren. Die Erstanlage macht
  meist die Hausarztpraxis, auf Wunsch der versicherten Person
- VSDM-Prüfung anstoßen (siehe Kartenterminal)
- eArztbrief oder KIM-Nachricht senden

**TI-Messenger-Client**
- TIM-Nachricht senden (informelle Rückfrage an Kolleg:innen). Der Client
  ist ein eigenes Gerät und spricht über das Internet mit dem
  TI-Messenger-Fachdienst

**AVS** (Apotheke)
- eRezept einlösen, auf drei Wegen: eGK einlesen (mit
  VSDM-Prüfungsnachweis), Rezeptcode (App/Ausdruck) scannen oder in der
  Fernversorgung per eHealth-CardLink ([gematik E-Rezept Apotheken](https://www.gematik.de/anwendungen/e-rezept/apotheken))
- Medikationsplan (eMP) auslesen, z. B. für Interaktionsprüfung oder
  Beratung. Apotheken sind laut gematik ausdrücklich dazu berechtigt
- SMC-B-Authentifizierung für TI-Zugang (Voraussetzung jeder Apotheken-Aktion)

**Konnektor / TI-Gateway**
Sie laufen bei jeder Aktion mit Fachdienst im Hintergrund mit: Sie
signieren mit HBA oder SMC-B, liefern die Authentisierung mit der SMC-B,
bauen den VPN-Tunnel auf und leiten weiter. Für VSDM fragen sie selbst
den Fachdienst ab (ReadVSD). Mit dem E-Rezept-Fachdienst und der ePA
spricht dagegen das Primärsystem selbst, der Konnektor leitet die
Verbindung nur durch den Tunnel (korrigiert 2026-11-04, gemILF_PS_eRp).
Ein eigenes Kontextmenü mit Nutzer-Aktionen haben sie nicht. Bei NFDM/eMP arbeitet der Konnektor nur lokal über seine
Fachmodule, ohne VPN und Fachdienst (korrigiert 2026-11-03).

**Fachdienste** (Gegenstelle, kein eigener Nutzer-Trigger)
- VSDM-Fachdienst: beantwortet ReadVSD
- E-Rezept-Fachdienst: nimmt Rezepte entgegen, gibt sie bei Einlösung heraus
- ePA-Aktensystem: nimmt Dokumente entgegen, verwaltet Zugriffsrechte
  (Befugnis nach VSDM-Prüfung: 90 Tage in Praxis und Krankenhaus, 3 Tage
  in der Apotheke, von Versicherten per App veränderbar)
- KIM-/TIM-Fachdienst: übermitteln Nachrichten
- IDP: stellt Token bereit, v. a. beim ePA-Zugriff

**Alle Geräte** (neu)
- Details anzeigen
- Gerät als ausgefallen markieren bzw. wieder in Betrieb nehmen (Störung)
- Einstellungen öffnen (nur Modus Erweitert)

## Außerhalb des Scopes (v1)

- Import und Replay echter Logs (kein Diagnose-Tool)
- Eine KI-Funktion in der Anwendung selbst. Die KI steckt in diesem
  Projekt im Entwicklungsprozess (Spec → Plan → Tasks → Umsetzung durch
  Agenten), nicht im Produkt
- Nutzer-Accounts/Mehrbenutzerbetrieb (gespeicherte Topologien ohne Login)
- Zweiter Modus (Realtime) zusätzlich zum Simulation-Modus
- Echte Protokollimplementierung oder Paketanalyse. Die
  Netzwerkeinstellungen (FR-17) dienen dem Verständnis und werden nur
  gegen die Prüfregeln ausgewertet
- MyHealth@EU, DiPag und weitere Spezialdienste (siehe Komponentenkatalog)
- Teilen per Link und eine Vorlagen-Bibliothek. Weitergegeben wird in v1
  nur als Datei

## Erfolgskriterien

- Nutzer kann von einem der vier Presets oder leer starten, beliebig viele
  Geräte aus allen Kategorien hinzufügen und nur gültig verbinden (inkl.
  Konnektor/TI-Gateway gegenseitig ausschließend)
- Nutzer kann eine Topologie als Datei speichern und in einem anderen
  Browser wieder öffnen. Fremde Einstellungen werden dabei nie ungefragt
  übernommen
- Die bekannten Aktionen (eGK stecken/VSDM, eRezept ausstellen und
  einlösen, KIM-Mail senden, NFDM-Notfalldaten erfassen, eMP anlegen und
  auslesen) sind über das Kontextmenü auf einem passenden Gerät ausführbar
  und im Simulation-Modus sichtbar
- Nicht ausführbare Aktionen erscheinen ausgegraut statt versteckt
- Modus Einfach und Erweitert funktionieren beide. Im Modus Erweitert sind
  Anschlüsse und Einstellungen sichtbar
- Das Tutorial lässt sich vollständig durchspielen. Jede Herausforderung
  ist lösbar und wird als gelöst erkannt
- Die Sicherheitsprüfung findet jede simulierte Störung
- Tests decken jede Regel des Regelwerks, die Aktions-Ausführung und die
  Prüfregeln ab

## Offene Punkte

- [x] Fachliche Freigabe von Operationskatalog und Verbindungsregel-Matrix
  (Fassung 2026-09-20)
- [x] Format/Umfang der gespeicherten Topologie: steht in plan.md
- [x] Komponentenkatalog festgelegt, jede Komponente im Regelwerk mit
  Quelle belegt (2026-11-03)
- [x] Widersprüche Spec ↔ Regelwerk ↔ Plan aufgelöst (2026-11-03):
  Verbindungsmatrix nur noch im Regelwerk, IDP über die TI, TI-Messenger
  über das Internet, Karten als Zustand des Terminals, PoPP nur als
  Komponente, Preset Klinikum aus dem Mockup
- [x] Persona-Bilder: von Justin selbst generiert, zur Veröffentlichung
  freigegeben (2026-11-03)
- [x] Prüfbericht (Fable, 2026-11-04) eingearbeitet: Anschlussmodell,
  Modus nur als Darstellung mit Sammelkanten, Presets gegen die
  Erlaubnisliste, Karten als Stecken-Regeln, Pfadregel, Rolle des
  Konnektors, Prüfungsnachweis, CardLink, TI-Messenger, Simulationsdatum,
  Importbefunde, gekürzte Pipeline, Datenschutzhinweis
- [x] Restpunkte im Regelwerk (Abschnitt 12 dort, bleiben als Präzisierung
  der Belege sichtbar, die Einträge behalten ihren Status, T-905: CardLink-Netzweg,
  Belege V-17 und V-20, eAU-Dienstkennungen, Befugnisdauer der ePA,
  mobiles KT, Ablauf `epa`, offene Netzports)
- [ ] Herausforderungen und Tutorial-Texte fachlich abnehmen
- [x] Neue fachliche Freigabe der erweiterten Spec durch Justin
- [x] plan.md an die Erweiterung angepasst (2026-11-04): UI-Konzept nach
  dem Mockup, Katalogformat, Speichern über Dateien,
  Deployment
