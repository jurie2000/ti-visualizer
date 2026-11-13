# Regelwerk 001: Kombinationsregeln der TI-Komponenten

**Status:** Überarbeitet am 2026-11-04 nach dem Prüfbericht
(Fable). Ausgangsbasis waren die
Regeln aus dem Mockup (`design/mockup/TI Visualizer.dc.html`) und die
freigegebene Matrix der [Spec](./spec.md). Alle Regeln sind jetzt mit
mindestens einer offiziellen Quelle belegt oder ausdrücklich als
Vereinfachung bzw. offen markiert. Fachlich freigegeben durch Justin am
2026-11-05 (T-907).
**Bezug:** Spec FR-4, FR-7, FR-14, FR-17 bis FR-21
**Quellen:** [quellen.md](./quellen.md)

## Zweck und Aufbau

Dieses Dokument ist die fachliche Quelle für die Regel-Engine und den
Datenkatalog. Jede Regel hat eine ID, eine Erklärung, einen Status und
eine Quelle.

| Status | Bedeutung |
|---|---|
| **bestätigt** | in einer gematik-Quelle ausdrücklich belegt |
| **plausibel** | aus gematik-Quellen abgeleitet, aber nicht wörtlich belegt. Einträge bis zur Freigabe am 2026-11-05 von Justin fachlich geprüft (T-907); neue Einträge brauchen eine eigene Prüfung |
| **Vereinfachung** | für den Lernzweck vereinfacht. Die Quelle beschreibt den echten Sachverhalt |
| **offen** | noch ohne Beleg oder zu entscheiden |

**Quellenkürzel** (alle Links in [quellen.md](./quellen.md)):
Spezifikationen werden mit ihrem gematik-Kürzel genannt (z. B.
`gemSpec_KT`). Weitere Kürzel: **Arch** = gemKPT_Arch_TIP ·
**DVO** = gemInfo_Anschluss_TI_DVO · **KH** = gemInfo_Anschluss_KH_TI
(Anschluss von Krankenhäusern) · **Betriebsarten** = Infoblatt
Betriebsarten des Konnektors · **PM eAU** = gematik-Pressemitteilung eAU ·
**KIM-DK** = Fachverfahren und Dienstkennungen KIM · **FP** =
gematik-Fachportal-Seite zur jeweiligen Anwendung.

Abschnitte: 1 Gerätetypen · 2 Anschlüsse · 3 Verbindungsarten ·
4 Verbindungsregeln · 5 Karten · 6 Aktionen · 7 Abläufe ·
8 Konfiguration · 9 Prüfregeln · 10 Herausforderungen · 11 Modus Einfach
und Erweitert · 12 Offene Fragen · 13 Presets

## 1. Gerätetypen

Die Topologie ist in beiden Modi dieselbe (Abschnitt 11). „In Einfach
sichtbar: nein“ heißt: Das Gerät wird im Modus Einfach ausgeblendet und
seine Verbindungen werden zu Sammelkanten zusammengefasst. In der Palette
des Modus Einfach fehlt es. „neu“ = nicht im Mockup.

### 1.1 Software, Rechner und Clients

**Auslegung (2026-11-13, T-724a):** Software (`pvs`, `kis`, `avs`, `pflege`, `ris`, `lis`; Kategorie `primary`, Name „Software“) läuft auf einem Rechner (Kategorie `computer`, Name „Rechner“: `pc`, `server`, `tab`). Das Netzkabel hängt am Rechner, nicht an der Software. Die Software wird dem Rechner über „läuft auf“ (Anschlussart `host`, Abschnitt 2.1) zugeordnet. Quelle: Infomodell in gemILF_PS (Clientsystem läuft am Arbeitsplatz); die Verkabelung selbst nennt keine Quelle (Vereinfachung).

| Schlüssel | Name | In Einfach sichtbar | Status | Quelle |
|---|---|---|---|---|
| `pvs` | Praxisverwaltungssystem | ja | bestätigt | gemILF_PS |
| `kis` | Krankenhausinformationssystem | ja | bestätigt | gemILF_PS, KH |
| `avs` | Apothekenverwaltungssystem | ja | bestätigt | gemILF_PS, gemF_eRp_Autorisierung_Apo |
| `pflege` | Pflege-Software (Pflegeeinrichtung), neu | ja | bestätigt | gematik Pflege-FAQ |
| `ris` | Radiologie-Informationssystem | nein | plausibel (Subsystem im Krankenhaus) | KH |
| `lis` | Labor-Informationssystem | nein | plausibel (Subsystem im Krankenhaus) | KH |
| `pc` | Arbeitsplatz-PC | nein | bestätigt (Arbeitsplatz im Infomodell) | gemILF_PS |
| `server` | Server, neu | nein | plausibel | gemILF_PS, DVO |
| `tab` | Visite-Tablet (KIS-Client per WLAN) | nein | plausibel | gemILF_PS, KH |
| `kimcm` | KIM-Clientmodul, neu | nein | bestätigt | gemSpec_CM_KOMLE |
| `timc` | TI-Messenger-Client, neu | ja | bestätigt | gemSpec_TI-M_Basis |

### 1.2 Smartcards

| Schlüssel | Name | In Einfach sichtbar | Status | Quelle |
|---|---|---|---|---|
| `egk` | elektronische Gesundheitskarte | ja | bestätigt | gemSpec_eGK_ObjSys_G2_1 |
| `hba` | Heilberufsausweis | ja | bestätigt | gemSpec_HBA_ObjSys |
| `smcb` | Institutionskarte SMC-B | ja | bestätigt | gemSpec_SMC-B_ObjSys_G2_1 |

Smartcards sind **keine Knoten** auf der Fläche (D12). Sie stecken in
Geräten mit der Fähigkeit `cardSlots` oder `nfcCard` (Abschnitt 5). Die
Tabelle nennt die Kartenarten.

Technische Karten sind ebenfalls keine Knoten, sondern Eigenschaften:
gSMC-KT im Kartenterminal, gSMC-K im Konnektor (Zertifikat, siehe
P-18), HSM-B im Highspeed-Konnektor. Quelle: Arch, gemSpec_KT,
gemF_Highspeed-Konnektor.

### 1.3 Kartenterminals

| Schlüssel | Name | In Einfach sichtbar | Status | Quelle |
|---|---|---|---|---|
| `kt` | eHealth-Kartenterminal | ja | bestätigt | gemSpec_KT |
| `mkt` | Mobiles Kartenterminal (offline) | ja | bestätigt | gemSpec_MobKT |
| `cardlink` | eHealth-CardLink (Dienst im Internet ohne Kartenslots, liest die eGK über das Smartphone der versicherten Person) | ja | bestätigt | gemSpec_eHealth-CardLink, FP eHealth-CardLink |

### 1.4 Lokales Netz

| Schlüssel | Name | In Einfach sichtbar | Status | Quelle |
|---|---|---|---|---|
| `switch` | Switch | nein | plausibel | DVO |
| `router` | Internet-Router (IAG, Internet Access Gateway), mit WLAN | nein | bestätigt | Betriebsarten, gemSpec_Kon |
| `ap` | WLAN Access Point | nein | plausibel | DVO |
| `fw` | Firewall, neu | nein | bestätigt (im Parallelbetrieb nötig) | Betriebsarten |

### 1.5 Zugang zur TI und Netze

| Schlüssel | Name | In Einfach sichtbar | Status | Quelle |
|---|---|---|---|---|
| `kon` | Konnektor | ja | bestätigt | gemSpec_Kon |
| `hskon` | Highspeed-Konnektor | ja | bestätigt | gemF_Highspeed-Konnektor |
| `gateway` | TI-Gateway (Zugangsmodul + HSK-Instanz) | ja | bestätigt | gemF_TI-Gateway |
| `vpn` | VPN-Zugangsdienst | ja | bestätigt | Arch, gemSpec_VPN_ZugD |
| `internet` | Internet (Transportnetz), neu | nein | bestätigt | Arch |
| `zentral` | Zentrales Netz der TI, neu | nein | bestätigt | Arch, gemSpec_Net |

### 1.6 Zentrale Dienste (neu)

| Schlüssel | Name | In Einfach sichtbar | Status | Quelle |
|---|---|---|---|---|
| `dns` | Namensdienst | nein | bestätigt | gemSpec_Net |
| `ntp` | Zeitdienst | nein | bestätigt | gemSpec_Net |
| `vzd` | Verzeichnisdienst (FHIR-Directory) | nein | bestätigt | gemSpec_VZD, gemSpec_VZD_FHIR_Directory |
| `tsl` | TSL-Dienst mit OCSP-Responder | nein | bestätigt | gemSpec_TSL, gemSpec_PKI |
| `idp` | Identity Provider (zentral) | ja | bestätigt | gemSpec_IDP_FD, gemSpec_FD_eRp |
| `idpsek` | Sektoraler IDP (GesundheitsID) | nein | bestätigt | gemSpec_IDP_Sek |

### 1.7 Fachdienste

| Schlüssel | Name | In Einfach sichtbar | Status | Quelle |
|---|---|---|---|---|
| `vsdm` | VSDM-Fachdienst der Krankenkasse | ja | bestätigt | gemSysL_VSDM, gemSpec_VSDM_2 |
| `erp` | E-Rezept-Fachdienst | ja | bestätigt | gemSpec_FD_eRp |
| `kim` | KIM-Fachdienst | ja | bestätigt | gemSpec_FD_KOMLE |
| `tim` | TI-Messenger-Fachdienst | ja | bestätigt | gemSpec_TI-M_Basis |
| `epa` | ePA-Aktensystem | ja | bestätigt | gemSpec_Aktensystem_ePAfueralle |
| `popp` | PoPP-Service, neu | nein | bestätigt | gemSpec_PoPP_Service |

### 1.8 Versicherte und Gegenstellen (neu)

| Schlüssel | Name | In Einfach sichtbar | Status | Quelle |
|---|---|---|---|---|
| `kk` | Krankenkasse (Empfänger z. B. der eAU) | ja | bestätigt | PM eAU, KIM-DK |
| `erpapp` | E-Rezept-App der Versicherten | ja | bestätigt | gemSpec_eRp_FdV |
| `epaapp` | ePA-App der Versicherten | nein | bestätigt | gemSpec_Aktensystem_ePAfueralle |

Kategorien haben je eine farbenblind-sichere Farbe und eine eigene Form
(Mockup). Neue Kategorien: Zentrale Dienste und Versicherte.

### 1.9 Fähigkeiten

Fähigkeiten im Katalog legen fest, was ein Gerätetyp darf (D35). Die
Regel-Engine und das Dateischema prüfen dagegen.

| Fähigkeit | Bedeutung | Gerätetypen |
|---|---|---|
| `cardSlots` | nimmt gesteckte Karten auf | `kt`, `mkt` |
| `nfcCard` | liest die eGK kontaktlos | `cardlink`, `erpapp`, `epaapp` |
| `netConfig:konnektor` | Einstellungen als KonnektorConfig | `kon`, `hskon`, `gateway` |
| `netConfig:terminal` | Einstellungen als TerminalConfig | `kt`, `cardlink` |
| `netConfig:client` | Einstellungen als ClientConfig | `pvs`, `kis`, `avs`, `pflege`, `pc`, `server`, `ris`, `lis`, `tab`, `kimcm` |
| `netConfig:router` | Einstellungen als RouterConfig | `router` |
| `netConfig:infra` | Einstellungen als InfraConfig (nur Grundfelder) | `switch`, `ap`, `fw` |
| `zugang` | gehört zur Gruppe „Zugang“ in Abschnitt 4 und 6 | `kon`, `hskon`, `gateway` |

## 2. Anschlüsse

Ein **Anschluss** ist die Buchse an einem Gerät (im Datenmodell `port`).
Davon zu unterscheiden ist der **Netzport** eines Protokolls (z. B. 4742
für SICCT), siehe Abschnitt 3.

### 2.1 Anschlussarten

| Art | Bezeichnung | Status | Quelle |
|---|---|---|---|
| `eth` | Ethernet (RJ45) | Vereinfachung | DVO |
| `wan` | WAN-Seite zum Router bzw. Internet | Vereinfachung | Betriebsarten |
| `usb` | USB | bestätigt (Mobiles KT) | gemSpec_MobKT |
| `wifi` | WLAN (Funk) | plausibel | DVO |
| `net` | Anschluss an ein Netz (Internet, Zentrales Netz) | Vereinfachung | Arch |
| `tun` | VPN-Zugang (logisch) | bestätigt | Arch, gemSpec_VPN_ZugD |
| `ti` | Anschluss am Zentralen Netz (logisch) | bestätigt | Arch |
| `host` | Läuft auf (logisch, kein Kabel) | Vereinfachung | gemILF_PS |

Karten haben keine Anschlüsse. Wie sie in Geräte kommen, regelt
Abschnitt 5.

### 2.2 Anschlüsse je Gerät

„mehrfach“ = beliebig viele Verbindungen, sonst genau eine.

| Gerät | Anschlüsse | Status | Quelle |
|---|---|---|---|
| PVS, AVS, Pflege | Ethernet0, USB0, USB1, Läuft auf (`host`, mehrfach: dieselbe Software läuft auf mehreren Rechnern) | Mockup, plausibel; „Läuft auf“ Vereinfachung (T-724a) | gemILF_PS |
| PC | Ethernet0, USB0, USB1, Software (`host`, mehrfach) | Mockup, plausibel; „Software“ Vereinfachung (T-724a) | gemILF_PS |
| Server | Ethernet0, Ethernet1, USB0, Software (`host`, mehrfach) | plausibel (T-724a) | gemILF_PS, DVO |
| KIS | LAN0 bis LAN5, USB0 (für das mobile KT, ergänzt 2026-11-05) | Mockup, plausibel | KH, gemSpec_MobKT |
| RIS, LIS | LAN0, LAN1 (KIS-Schnittstelle) | Mockup, plausibel | KH |
| Visite-Tablet | WLAN0, USB-C | Mockup, plausibel | KH |
| KIM-Clientmodul | LAN0 (`eth`, mehrfach, spricht mit Primärsystem und Zugang) | Vereinfachung | gemSpec_CM_KOMLE |
| TI-Messenger-Client | WAN (Internet) | plausibel | gemSpec_TI-M_Basis |
| eHealth-KT | LAN0 | bestätigt | gemSpec_KT |
| Mobiles KT | USB0 | bestätigt | gemSpec_MobKT |
| eHealth-CardLink | WAN (Internet, mehrfach) | bestätigt (Dienst im Internet) | gemSpec_eHealth-CardLink, FP eHealth-CardLink |
| Switch | Port 1 bis 8 | Mockup, Vereinfachung | DVO |
| Router (IAG) | LAN1 bis LAN4, WLAN (mehrfach), WAN | Mockup, plausibel | Betriebsarten |
| Access Point | LAN (PoE), WLAN (mehrfach) | Mockup, plausibel | DVO |
| Firewall | LAN, WAN | plausibel | Betriebsarten |
| Konnektor, TI-Gateway | LAN (mehrfach), WAN, VPN (`tun`, logisch) | Vereinfachung: physisch hat der Konnektor einen LAN-Anschluss hinter einem Switch. Im Modell trägt er mehrere, damit im Modus Einfach Primärsystem, Kartenterminal und KIM-Clientmodul direkt daran hängen können | gemSpec_Kon, Betriebsarten |
| Highspeed-Konnektor | LAN0, LAN1 (mehrfach), WAN, VPN (`tun`, logisch) | Vereinfachung wie Konnektor | gemF_Highspeed-Konnektor |
| VPN-Zugangsdienst | Zugangspunkt (`tun`, mehrfach), Zentrales Netz (`ti`, mehrfach), Internet (`net`) | bestätigt | Arch |
| Internet | Netz (`net`, mehrfach) | Vereinfachung | Arch |
| Zentrales Netz | Netz (`ti`, mehrfach) | Vereinfachung | Arch |
| Zentrale Dienste, Fachdienste, Krankenkasse | TI-Zugang (`ti`, mehrfach) | bestätigt | Arch, gemSpec_Net |
| E-Rezept-FD, ePA, IDP, sektoraler IDP, PoPP, TI-Messenger-FD | zusätzlich Internet (`net`, mehrfach) | bestätigt | gemSpec_eRp_FdV, gemSpec_Aktensystem_ePAfueralle, gemSpec_IDP_Sek, gemSpec_PoPP_Service, gemSpec_TI-M_Basis |
| E-Rezept-App, ePA-App | Internet (`net`, mehrfach) | bestätigt | gemSpec_eRp_FdV |

### 2.3 Verträglichkeit

- **A-1** Gleiche Arten passen zusammen, außer `wan` mit `wan`. (Mockup,
  Vereinfachung)
- **A-2** Zusätzlich erlaubt: `eth` mit `wan`, `wan` mit `net`, `tun` mit `net`.
  (Vereinfachung nach Arch)
- **A-3** Modus Einfach: Das System wählt das erste freie, verträgliche
  Anschlusspaar. Modus Erweitert: Der Nutzer wählt. (Mockup)
- **A-4** Läuft eine Verbindung über `wifi`, ist sie eine
  WLAN-Verbindung. (Mockup)
- **A-5** Jede erlaubte Verbindung aus 4.2 und jede Kante der Presets
  muss über die Anschlüsse herstellbar sein. Ein Test prüft das für alle
  Paare und alle Presets.

## 3. Verbindungsarten

| Art | Name | Bedeutung | Linienstil |
|---|---|---|---|
| `phys` | Physisch | Kabel | durchgezogen, dick |
| `tcp` | TCP/TLS | im lokalen Netz bzw. in der TI | durchgezogen, dünn |
| `vpn` | VPN | IPsec-Tunnel in die TI | gestrichelt |
| `wlan` | WLAN | Funk im lokalen Netz | kurz gestrichelt |
| `inet` | Internet | offenes Netz | Strich-Punkt |
| `usb` | USB | lokale Kabelverbindung, z. B. Mobiles KT | durchgezogen, dick |
| `host` | Läuft auf | Software läuft auf einem Rechner, kein Kabel | gepunktet, dünn |
| `sammel` | Sammelkante | nur im Modus Einfach: fasst einen Weg über ausgeblendete Geräte zusammen (Abschnitt 11) | durchgezogen, doppelt |

Zuordnung einer Kante zur Art, in dieser Reihenfolge (aus den
Anschlussarten der beiden Enden und der Protokolltabelle unten, keine
eigene Regel-ID):

0. beide Enden `host`: `host`
1. über `wifi` (A-4): `wlan`
2. beide Enden `tun`: `vpn`
3. ein Ende `net`: `inet`
4. beide Enden `ti`: `tcp`
5. ein Ende `usb`: `usb`
6. Kabel zwischen zwei Geräten, für die die Protokolltabelle TLS
   führt, und keines davon ist ein Netzgerät (Kategorie `lan`: Switch,
   Internet-Router, WLAN Access Point, Firewall): `tcp`, z. B.
   eHealth-KT ↔ Zugang, Primärsystem ↔ Zugang, Primärsystem ↔
   KIM-Clientmodul
7. sonst `phys`

Status: **Vereinfachung** (2026-11-06). Eine Kante steht für die
Strecke zwischen zwei Geräten. Ist ein Endpunkt ein Netzgerät, ist die
physische Strecke gemeint: `phys`. Verbinden zwei Endgeräte direkt, die
laut Protokolltabelle TLS sprechen, zeigt die Kante die logische
Verbindung: `tcp`. Daher weicht KT ↔ Zugang vom Mockup ab (dort Kabel):
SICCT läuft nach dem Pairing über TLS (gemSpec_KT).

Protokolle je Verbindung (Detailpanel, FR-11). „offen“ heißt: noch
nicht belegt, das Detailpanel zeigt dann nur die belegten Angaben.

| Verbindung | Protokoll und Datenformat | Netzport | TLS | Status | Quelle |
|---|---|---|---|---|---|
| eHealth-KT ↔ Zugang | SICCT, nach Pairing | 4742 | ja | bestätigt (Netzport plausibel) | gemSpec_KT |
| CardLink ↔ Zugang | wie Kartenterminal, über das Internet | offen | ja | plausibel | gemSpec_eHealth-CardLink (A_24769); Netzweg offen (12) |
| Primärsystem ↔ Zugang | SOAP, XML | 443 | ja | bestätigt (Netzport plausibel) | gemILF_PS |
| Mobiles KT ↔ Primärsystem oder PC | CT-API über USB | keiner | nein | bestätigt | gemSpec_MobKT |
| Zugang ↔ VPN-Zugangsdienst | IPsec (IKEv2) über das Transportnetz | UDP 500 und 4500 | nein (IPsec) | bestätigt (Netzport plausibel) | Arch, gemSpec_VPN_ZugD |
| Primärsystem ↔ KIM-Clientmodul | SMTP und POP3 | offen | ja | bestätigt | gemSpec_CM_KOMLE |
| KIM-Clientmodul ↔ KIM-Fachdienst | SMTP und POP3, über die Route des Zugangs | offen | ja (mTLS) | bestätigt | gemSpec_CM_KOMLE |
| TI-Messenger-Client ↔ TI-Messenger-FD | Matrix (Client-Server-API), JSON | 443 | ja | bestätigt (Netzport plausibel) | gemSpec_TI-M_Basis |
| Primärsystem ↔ E-Rezept-FD | HTTPS mit VAU, FHIR. Läuft über die Route des Zugangs, der Zugang leitet nur weiter | 443 | ja | bestätigt | gemILF_PS_eRp |
| Primärsystem ↔ ePA | HTTPS mit VAU, FHIR. Über die Route des Zugangs | 443 | ja | plausibel | gemILF_PS_ePA |
| Zugang ↔ VSDM-FD | SOAP (ReadVSD) | offen | ja | plausibel | gemSysL_VSDM |
| Primärsystem ↔ IDP | OAuth 2.0 und OpenID Connect, über die Route des Zugangs | 443 | ja | bestätigt | gemSpec_IDP_FD, gemILF_PS_eRp |
| KIS ↔ RIS/LIS | HL7 v2 (außerhalb der TI) | offen | ja | plausibel | KH |

## 4. Verbindungsregeln

**Zugang** steht in diesem Abschnitt für Konnektor, Highspeed-Konnektor
und TI-Gateway (Fähigkeit `zugang`). „In Einfach sichtbar“ zeigt, ob die
Verbindung im Modus Einfach als eigene Kante erscheint. Gültig ist jede
erlaubte Verbindung in beiden Modi.

### 4.0 Prüflogik (entschieden 2026-11-03)

| Liste | Aufgabe | Entscheidet über Gültigkeit? |
|---|---|---|
| **Grundprüfungen** (4.1) | Selbstverbindung, Doppelung, Anschlüsse, Anzahl | ja |
| **Erlaubnisliste** (4.2) | erlaubte Gerätepaare | **ja, allein** für die Paarfrage |
| **Begründungsliste** (4.3) | Erklärtexte für typische Fehlversuche | nein, nur Meldungstext |
| **Ausschlüsse** (4.4) | Komponenten, die nicht gemeinsam vorkommen dürfen | ja |

Ablauf: (1) Grundprüfungen G-1, G-2, G-4 und Ausschlüsse, (2) Paar in der
Erlaubnisliste? Dann G-3 mit den Anschlussarten dieser Regel, danach
gültig. (3) Sonst abgelehnt mit dem Text der passenden Begründungsregel,
(4) ohne passende Regel mit der Meldung „Diese Verbindung gibt es in der
TI nicht. ‹Gerät› kann verbunden werden mit: …“.

Ergänzt 2026-11-05 (T-105):

- G-3 läuft erst nach der Paarfrage, weil die Regel festlegt, welche
  Anschlussarten zählen. Sonst käme etwa bei PVS ↔ Fachdienst die
  Meldung von G-3 statt der Begründung V-4.
- Steht ein Paar mehrfach in der Erlaubnisliste (z. B. Switch ↔ Firewall),
  gilt die Regel mit dem stärkeren Status: bestätigt vor plausibel vor
  Vereinfachung vor offen. Bei Gleichstand gilt die erste im Katalog.
- Passen mehrere Begründungsregeln, gilt die erste im Katalog.

**Konsistenztests:** Kein Paar der Erlaubnisliste darf von einer
Begründungsregel erfasst werden. Eine im Modus Einfach sichtbare
Verbindung darf nur zwischen Geräten liegen, die dort sichtbar sind.

### 4.1 Grundprüfungen

Die früheren Mockup-Regeln V-1, V-2 und V-11 sind hier als G-1 bis G-3
aufgegangen, die frühere G-5 als K-9. Ihre Nummern bleiben frei, damit
alte Verweise eindeutig bleiben.

| ID | Regel | Meldung | Status | Quelle |
|---|---|---|---|---|
| G-1 | Keine Verbindung eines Geräts mit sich selbst | Ein Gerät kann nicht mit sich selbst verbunden werden. | Vereinfachung | keine (Editorregel) |
| G-2 | Keine doppelte Verbindung zwischen denselben Geräten | Diese beiden Geräte sind bereits verbunden. | Vereinfachung | keine (Editorregel) |
| G-3 | Es gibt ein freies, verträgliches Anschlusspaar (2.3) | ‹Gerät› hat keinen freien passenden Anschluss mehr. | Vereinfachung | DVO |
| G-4 | Ein eHealth-KT ist mit höchstens **einem** Zugang gepairt | Ein Kartenterminal arbeitet immer nur mit einem Konnektor zusammen. | bestätigt | gemSpec_KT |

### 4.2 Erlaubnisliste

Verbindungen gelten in beide Richtungen.

Angaben wie „Router-LAN“, „Router (WAN)“ oder „Zugang (WAN)“ meinen
Anschlussarten: LAN ist `eth`, WAN ist `wan` (2.1). Der Katalog hält sie je
Regel in `kinds` fest. Ohne Angabe zählt jedes verträgliche Anschlusspaar
(A-2), etwa für KT, PVS oder Switch am Zugang.

**Kartenterminals**

| Von | Nach | In Einfach sichtbar | Status | Quelle |
|---|---|---|---|---|
| eHealth-KT | Zugang | ja | bestätigt | gemSpec_KT, gemSpec_Kon |
| eHealth-KT | Switch, Router-LAN | nein | bestätigt (KT im LAN) | gemSpec_KT, DVO |
| eHealth-CardLink | Zugang | ja | bestätigt (verhält sich wie ein Kartenterminal) | gemSpec_eHealth-CardLink (A_24769) |
| eHealth-CardLink | Internet | nein | bestätigt (Dienst im Internet) | FP eHealth-CardLink |
| Mobiles KT | PVS, KIS, AVS, Pflege (USB, zur Datenübergabe) | ja | bestätigt | gemSpec_MobKT |
| Mobiles KT | PC, Server (USB) | nein | bestätigt | gemSpec_MobKT |

**Primärsysteme und Clients**

| Von | Nach | In Einfach sichtbar | Status | Quelle |
|---|---|---|---|---|
| PVS, KIS, AVS, Pflege | Zugang | ja | bestätigt | gemILF_PS, gemF_Highspeed-Konnektor, KH |
| PVS, KIS, AVS, Pflege, PC, Server, RIS, LIS | Switch, Router-LAN | nein | plausibel (T-724a: Software direkt am Switch bis T-724b) | DVO |
| PVS, KIS, AVS, Pflege, RIS, LIS | PC, Server (läuft auf) | nein | Vereinfachung (T-724a) | gemILF_PS |
| Visite-Tablet | Access Point, Router-WLAN | nein | plausibel | KH |
| PC | KIS, PVS, AVS (als Arbeitsplatz) | nein | bestätigt (Arbeitsplatz im Infomodell) | gemILF_PS |
| RIS, LIS | KIS (HL7-Schnittstelle) | nein | plausibel | KH |
| PVS, KIS, AVS, Pflege | KIM-Clientmodul | nein | bestätigt | gemSpec_CM_KOMLE |
| KIM-Clientmodul | Zugang | nein | bestätigt | gemSpec_CM_KOMLE |
| TI-Messenger-Client | TI-Messenger-FD (direkt) | ja | Vereinfachung: in Wirklichkeit über das Internet | gemSpec_TI-M_Basis |
| TI-Messenger-Client | Internet | nein | plausibel | gemSpec_TI-M_Basis |

**Lokales Netz**

| Von | Nach | In Einfach sichtbar | Status | Quelle |
|---|---|---|---|---|
| Switch | Switch, Router-LAN, Access Point, Firewall, Zugang | nein | plausibel | DVO |
| Router (WAN) | Internet | nein | bestätigt | Betriebsarten |
| Firewall | Router-LAN, Switch, Zugang | nein | bestätigt (Parallelbetrieb) | Betriebsarten |

**Zugang zur TI**

| Von | Nach | In Einfach sichtbar | Status | Quelle |
|---|---|---|---|---|
| Zugang (WAN) | Router (Weg ins Internet, im Reihenbetrieb zwischen LAN und Router) | nein | bestätigt | Betriebsarten, gemSpec_Kon |
| Zugang | VPN-Zugangsdienst (direkt, über `tun`) | ja | Vereinfachung: in Wirklichkeit über Router und Internet | Arch |
| VPN-Zugangsdienst | Internet | nein | bestätigt | Arch |
| VPN-Zugangsdienst | Zentrales Netz | nein | bestätigt | Arch |
| VPN-Zugangsdienst | VSDM, E-Rezept, KIM, ePA, IDP (direkt) | ja | Vereinfachung: in Wirklichkeit über das Zentrale Netz | Arch |

**Zentrales Netz, Dienste und Versicherte**

| Von | Nach | In Einfach sichtbar | Status | Quelle |
|---|---|---|---|---|
| Zentrales Netz | DNS, NTP, VZD, TSL/OCSP, IDP, VSDM, E-Rezept, KIM, ePA | nein | bestätigt | gemSpec_Net, Arch |
| KIM-Fachdienst | Krankenkasse | ja | plausibel (Krankenkasse hat eigenen KIM-Zugang) | KIM-DK, PM eAU |
| E-Rezept-FD, ePA, IDP, sektoraler IDP, PoPP, TI-Messenger-FD | Internet | nein | bestätigt | gemSpec_eRp_FdV, gemSpec_IDP_Sek, gemSpec_PoPP_Service, gemSpec_TI-M_Basis |
| E-Rezept-App | E-Rezept-FD (direkt) | ja | Vereinfachung: in Wirklichkeit über das Internet | gemSpec_eRp_FdV |
| ePA-App | ePA (direkt) | nein | Vereinfachung: in Wirklichkeit über das Internet | gemSpec_Aktensystem_ePAfueralle |
| E-Rezept-App, ePA-App | Internet, sektoraler IDP | nein | bestätigt | gemSpec_eRp_FdV, gemSpec_IDP_Sek |

Der PoPP-Service hat keine direkte Verbindung zum Primärsystem. Er ist
über Router und Internet erreichbar (ZETA, TI 2.0). In v1 hat er keinen
eigenen Ablauf.

### 4.3 Begründungsliste

Frühere Regeln V-3 und V-13 betreffen Karten. Sie stehen jetzt als K-8
und K-6 in Abschnitt 5.

| ID | Fehlversuch | Meldung | Status | Quelle |
|---|---|---|---|---|
| V-4 | Primärsystem (PVS, KIS, AVS, Pflege, PC, Server, Tablet, RIS, LIS) direkt an Fachdienst oder zentralen Dienst | Ein Primärsystem darf nicht direkt mit einem Fachdienst verbunden werden. Der Weg führt immer über Konnektor oder TI-Gateway und den VPN-Zugangsdienst. | bestätigt | Arch, gemILF_PS |
| V-5 | Kartenterminal direkt an Fachdienst | Kartenterminals sprechen nie direkt mit einem Fachdienst. Dazwischen steht immer der Konnektor. | bestätigt | gemSpec_KT, Arch |
| V-6 | Primärsysteme untereinander außerhalb der erlaubten Paare | Diese Systeme werden nicht direkt verkabelt. Arbeitsplatz-PCs hängen am KIS, PVS oder AVS. RIS und LIS sind über eine Schnittstelle mit dem KIS verbunden. | plausibel | gemILF_PS, KH |
| V-7 | Lokales Netz direkt an Fachdienst | Geräte des lokalen Netzes erreichen Fachdienste nur über Konnektor und VPN-Zugangsdienst. | bestätigt | Arch |
| V-8 | Switch oder Access Point an VPN-Zugangsdienst oder Internet | Nur der Router führt ins Internet. Switch und Access Point bleiben im lokalen Netz. | plausibel | Betriebsarten |
| V-9 | Fachdienste untereinander | Fachdienste werden nicht direkt miteinander verbunden. Sie hängen am Zentralen Netz. | bestätigt | Arch |
| V-10 | Konnektor an TI-Gateway | Konnektor und TI-Gateway kommen in diesem Lernmodell nicht in derselben Topologie vor. | Vereinfachung | siehe X-1 |
| V-12 | Primärsystem oder Kartenterminal direkt an VPN-Zugangsdienst | Den VPN-Tunnel in die TI baut nur der Konnektor bzw. das TI-Gateway auf. | bestätigt | Arch, gemSpec_VPN_ZugD |
| V-14 | Mobiles KT an Zugang oder Netzwerk | Das mobile Kartenterminal arbeitet offline, etwa beim Hausbesuch. Die Daten gehen später per USB ans Primärsystem. | bestätigt | gemSpec_MobKT |
| V-15 | Versicherten-App an Zugang oder Primärsystem | Versicherte nutzen ihre Apps über das Internet, nicht über die Infrastruktur der Praxis. | bestätigt | gemSpec_eRp_FdV |
| V-16 | Zentrale Dienste direkt ins lokale Netz | Zentrale Dienste der TI liegen im Zentralen Netz und sind nur über den VPN-Zugangsdienst erreichbar. | bestätigt | Arch, gemSpec_Net |
| V-17 | Zugang an Zugang | Eine Einrichtung nutzt ihre Konnektoren unabhängig voneinander. Sie werden nicht miteinander verbunden. | plausibel | gemSpec_Kon |
| V-18 | Kartenterminal an Kartenterminal | Kartenterminals werden nicht hintereinander geschaltet. Jedes spricht direkt mit dem Konnektor. | bestätigt | gemSpec_KT |
| V-19 | TI-Messenger-FD an VPN-Zugangsdienst oder Zentrales Netz | Der TI-Messenger läuft über das Internet, nicht über den VPN-Zugangsdienst. | plausibel | gemSpec_TI-M_Basis |
| V-20 | Router an Router | Eine Einrichtung hat in diesem Modell einen Internet-Router. Weitere Netzgeräte hängen am Switch. | Vereinfachung | DVO |

### 4.4 Ausschlüsse

| ID | Regel | Status | Quelle |
|---|---|---|---|
| X-1 | Konnektor/Highspeed-Konnektor und TI-Gateway nicht in derselben Topologie. Eine Topologie bildet in v1 eine Einrichtung ab. Topologien mit mehreren Einrichtungen und unterschiedlichem Zugang sind nicht vorgesehen | Vereinfachung: die gematik beschreibt das TI-Gateway als Alternative zum Konnektor, ein Verbot beider nebeneinander steht dort nicht | FP Konnektor/TI-Gateway, gemF_TI-Gateway |

## 5. Karten

Karten sind keine Knoten (D12). Diese Regeln ersetzen für Karten die
Verbindungsregeln aus Abschnitt 4.

| ID | Regel | Meldung bei Verstoß | Status | Quelle |
|---|---|---|---|---|
| K-1 | Karten stecken nur in Geräten mit der Fähigkeit `cardSlots` (eHealth-KT, mobiles KT). Je Gerät eine Karte pro Kartenart | keine | Vereinfachung (Anzahl der Slots ist herstellerabhängig) | gemSpec_KT, gemSpec_MobKT |
| K-2 | „Karte stecken“ legt eine neue Karte einer Art an, die im Gerät noch fehlt. Der Kartenvorrat ist unbegrenzt. „Karte ziehen“ entfernt die Karte | Alle Kartenarten stecken bereits in diesem Terminal. | Vereinfachung | gemSpec_KT |
| K-3 | Jede Karte hat ein Ablaufdatum (Zertifikatslaufzeit). Verglichen wird mit dem Simulationsdatum der Topologie (`simDate`), nicht mit der echten Uhr. Eine abgelaufene Karte zählt als nicht gesteckt | ‹Karte› ist seit ‹Datum› abgelaufen. | bestätigt | gemSpec_PKI |
| K-4 | HBA und SMC-B müssen per PIN freigeschaltet sein („erhöhter Sicherheitszustand“), sonst schlagen PIN-pflichtige Aktionen fehl | ‹Karte› ist nicht freigeschaltet. | bestätigt | gemILF_PS_AMTS, gemILF_PS |
| K-5 | Die SMC-B ist im Infomodell einem Mandanten zugeordnet und steckt dauerhaft | keine | bestätigt | gemILF_PS |
| K-6 | Geräte mit der Fähigkeit `nfcCard` (CardLink, Versicherten-Apps) lesen nur die eGK, ohne PIN, mit CAN | Über eHealth-CardLink wird nur die eGK gelesen, ohne PIN. HBA und SMC-B gehören in ein stationäres Kartenterminal. | bestätigt | gemSpec_eHealth-CardLink |
| K-7 | Die eGK-PIN dient als Einwilligung für eMP/AMTS, sofern die versicherte Person sie nicht abgeschaltet hat (Feld `pinActive` an der eGK) | Für den Medikationsplan ist die PIN der eGK nötig. | bestätigt | gemILF_PS_AMTS |
| K-8 | Karten gehören nie an Konnektor, Primärsystem oder Fachdienst | Smartcards werden nur in ein Kartenterminal gesteckt, nie direkt an Konnektor, Primärsystem oder Fachdienst. | bestätigt | Arch |
| K-9 | Eine Karte steckt in genau einem Gerät | Diese Karte steckt bereits in einem anderen Terminal. | bestätigt (physisch) | gemSpec_KT |

Darstellung: Eine gesteckte Karte erscheint als Chip im Terminal mit der
Beschriftung „gesteckt · ISO 7816“, eine per NFC gelesene eGK mit
„NFC · ISO 14443, CAN“ (gemSpec_KT, gemSpec_eHealth-CardLink).

## 6. Aktionen und Voraussetzungen

### 6.0 Pfadregel

Ein **TI-Pfad** hat immer diese Rollenfolge (Spec FR-8):

Auslöser → lokale Netzgeräte und Arbeitsplatz (beliebig viele) → **Zugang**
→ Router und Internet (beliebig viele) → **VPN-Zugangsdienst** →
Zentrales Netz (optional) → **Dienst**

- Wege, die den Zugang oder den VPN-Zugangsdienst auslassen, zählen
  nicht als TI-Pfad, auch wenn sie über das Internet zum Dienst führen.
- Wege nur über das Internet gelten ausschließlich für
  Versicherten-Apps, TI-Messenger, CardLink und PoPP, und zwar nur für
  diese Paare (Vereinfachung, abgeleitet aus 4.2):
  E-Rezept-App ↔ E-Rezept-Dienst, IdP, sektoraler IdP ·
  ePA-App ↔ ePA-Dienst, sektoraler IdP ·
  TI-Messenger-Client ↔ TI-Messenger ·
  CardLink ↔ sein Zugang · jeder Auslöser ↔ PoPP.
- Ausgeblendete Geräte (Modus Einfach) zählen voll mit.
- **Mehrere Zugänge im Netz:** Ein Kartenterminal gehört zu dem Zugang,
  mit dem es gepairt ist (`pairedWith` in der TerminalConfig). Bei einer
  direkten Verbindung ist das der verbundene Zugang. Fehlt beides und gibt
  es im Netz nur einen Zugang, gehört das Kartenterminal zu diesem
  (Vereinfachung, etwa für ein KT am Switch ohne Pairing). Dasselbe gilt
  für CardLink.
- **Mehrere passende Karten:** Es zählt das Terminal, das dem
  Arbeitsplatz des Auslösers zugeordnet ist (P-29). Gibt es keine
  Zuordnung, fragt die App, welches Terminal genutzt wird.

Status: Vereinfachung nach Arch und gemILF_PS.

### 6.1 Bausteine der Voraussetzungen

| Baustein | Bedingung | Quelle |
|---|---|---|
| **Zugang** | Ein Zugang ist vom Auslöser aus nach 6.0 erreichbar und nicht ausgefallen | Arch |
| **TI** | Der Zugang hat einen Weg zum VPN-Zugangsdienst (direkt oder über Router und Internet) | Arch |
| **Karte X** | Karte steckt in einem Terminal dieses Zugangs, ist zum `simDate` gültig (K-3) und, bei HBA/SMC-B, freigeschaltet (K-4) | gemSpec_KT, gemILF_PS |
| **Dienst X** | Dienst X ist über einen TI-Pfad erreichbar | Arch |
| **Prüfungsnachweis** | VSDM-Prüfung mit eGK und SMC-B über die TI ist möglich, der VSDM-Fachdienst ist erreichbar | gemSysL_VSDM, FP eHealth-CardLink |
| **Gerät vorhanden** | Ein Gerät des Typs existiert in der Topologie, ohne Prüfung auf Verbindung oder Zugang (Vereinfachung; betrifft Aktionen mit KIM-Clientmodul, CardLink und Primärsystem am mobilen KT) | Arch |
| **Befugnis (ePA)** | Prüfungsnachweis oder PoPP-Token. Dauer: 90 Tage in Praxis und Krankenhaus, 3 Tage in der Apotheke | gemSpec_Aktensystem_ePAfueralle, gematik ePA für alle Praxen, gematik ePA für alle Apotheken (plausibel, Stand 2026 prüfen) |

Die erste nicht erfüllte Bedingung liefert die Begründung im
ausgegrauten Menüeintrag.

**Auslegung (2026-11-10, T-402):** (a) „Gerät vorhanden“ ist bewusst nur
ein Existenztest, Status `Vereinfachung` (Quellen nennen keine feste
Verkabelung des KIM-Clientmoduls). (b) K-7 steht im Katalog als
`{card: egk, pin: true}`, die Engine liest `pinActive` über `cardState`.
(c) PC und Tablet erben die Aktionen der Primärsysteme (PVS, KIS, AVS), die
sie direkt oder über Netzgeräte erreichen, ohne einen Weg über ein anderes
Primärsystem. (d) Karten dürfen auf mehrere Terminals desselben Zugangs verteilt sein
(Baustein „Karte X“); gilt das zugeordnete Terminal (P-29), zählt nur
dieses. Steckt eine benötigte Karte in mehr als einem Terminal ohne
Zuordnung, ist die Aktion aktiv mit Liste `chooseTerminal`. Bei mehreren
Zugängen gilt die Aktion, wenn sie an einem von ihnen erfüllt ist.
(e) Bei Alternativen („oder“) im Menüeintrag nennt die Begründung alle
Alternativen, damit klar ist, was fehlt. Bekannte Grenze bei mehreren
Zugängen: der Weg zum Dienst ist nicht an den Zugang der Karte gebunden
(Issue #60).

\* Im Modus Einfach gilt das KIM-Clientmodul als Teil des Primärsystems,
der sektorale IDP als Teil der Versicherten-App (Vereinfachung).

### 6.2 PVS, KIS (und deren PC/Tablet als Arbeitsplatz)

| Aktion | Voraussetzungen | Ablauf | Quelle |
|---|---|---|---|
| eRezept ausstellen | Zugang, TI, HBA (QES), SMC-B, E-Rezept, IDP | `erezept` | gemILF_PS_eRp, gemSpec_FD_eRp, KH (HBA für QES) |
| eAU ausstellen und per KIM senden | Zugang, TI, HBA (QES), SMC-B, KIM-Clientmodul\*, KIM | `eau` | PM eAU, gemSpec_CM_KOMLE |
| eArztbrief per KIM senden | Zugang, TI, HBA (QES), SMC-B, KIM-Clientmodul\*, KIM | `kim` | gemSpec_CM_KOMLE, KIM-DK |
| KIM-Nachricht senden | Zugang, TI, SMC-B, KIM-Clientmodul\*, KIM | `kim` | gemSpec_CM_KOMLE |
| eAU-Kopie in die ePA hochladen | Zugang, TI, SMC-B, Befugnis, ePA, IDP | `epa` | gemILF_PS_ePA, KBV (nur auf Wunsch) |
| Befund in die ePA hochladen | Zugang, TI, SMC-B, Befugnis, ePA, IDP | `epa` | gemILF_PS_ePA |
| ePA-Medikationsliste einsehen | Zugang, TI, SMC-B, Befugnis, ePA, IDP | `epa` | gemSpec_Aktensystem_ePAfueralle |
| Notfalldatensatz schreiben | Zugang, eGK, HBA (QES) | `notfalldaten` | gemSpec_FM_NFDM, KH |
| Persönliche Erklärungen schreiben | Zugang, eGK, SMC-B oder HBA | `notfalldaten` | KH (Schreiben mit SMC-B) |
| Notfalldaten lesen | Zugang, eGK, HBA oder SMC-B (freigeschaltet) | `notfalldaten` | KH |
| Medikationsplan erstellen/aktualisieren | Zugang, eGK (mit PIN, K-7), HBA oder SMC-B (freigeschaltet) | `emp` | gemILF_PS_AMTS, gemSysL_AMTS_A |
| Medikationsplan auslesen | Zugang, eGK (mit PIN, K-7), HBA oder SMC-B (freigeschaltet) | `emp` | gemSysL_AMTS_A |
| VSDM-Prüfung anstoßen | Zugang, TI, eGK, SMC-B oder HBA, VSDM | `vsdm` | gemSysL_VSDM, gemILF_PS |

**Arbeitsplatz-PC und Visite-Tablet** bieten die Aktionen des
Primärsystems an, an dem sie hängen (Arbeitsplatz im Infomodell,
gemILF_PS). **RIS und LIS** bieten nur „Befund in die ePA hochladen“
und „eArztbrief per KIM senden“ mit denselben Voraussetzungen (plausibel,
KH).

### 6.3 AVS (Apotheke)

| Aktion | Voraussetzungen | Ablauf | Quelle |
|---|---|---|---|
| eRezept einlösen (eGK einlesen) | Zugang, TI, SMC-B, eGK, Prüfungsnachweis, E-Rezept, IDP | `erezeptEinloesen` | gemF_eRp_Autorisierung_Apo, FP eHealth-CardLink |
| eRezept einlösen (Rezeptcode scannen) | Zugang, TI, SMC-B, E-Rezept, IDP | `erezeptEinloesenCode` | FP E-Rezept Apotheken |
| eRezept per CardLink einlösen (Fernversorgung) | Zugang, TI, CardLink am Zugang, eGK per NFC, SMC-B, Prüfungsnachweis, E-Rezept, IDP | `cardlinkErp` | FP eHealth-CardLink, gemSpec_eHealth-CardLink |
| Medikationsplan auslesen | Zugang, eGK (mit PIN, K-7), SMC-B (freigeschaltet) | `emp` | gemSysL_AMTS_A |
| ePA-Medikationsliste einsehen | Zugang, TI, SMC-B, Befugnis (3 Tage), ePA, IDP | `epa` | gemSpec_Aktensystem_ePAfueralle, gematik ePA für alle Apotheken |

### 6.4 Pflege-Software

| Aktion | Voraussetzungen | Ablauf | Quelle |
|---|---|---|---|
| Dokument in die ePA hochladen / einsehen | Zugang, TI, SMC-B, Befugnis, ePA, IDP | `epa` | gematik Pflege-FAQ, gemSpec_Aktensystem_ePAfueralle |
| KIM-Nachricht senden | Zugang, TI, SMC-B, KIM-Clientmodul\*, KIM | `kim` | gematik Pflege-FAQ, gemSpec_CM_KOMLE |

### 6.5 Kartenterminals, CardLink und TI-Messenger-Client

| Gerät | Aktion | Voraussetzungen | Ablauf | Quelle |
|---|---|---|---|---|
| eHealth-KT, mobiles KT | Karte stecken / ziehen | K-1, K-2 | Dialog | gemSpec_KT |
| eHealth-KT | eGK einlesen / VSDM-Prüfung | wie VSDM-Prüfung (6.2) | `vsdm` | gemSysL_VSDM |
| eHealth-KT | Notfalldaten / Medikationsplan schreiben oder lesen | wie 6.2 | `notfalldaten`, `emp` | gemSpec_FM_NFDM, gemILF_PS_AMTS |
| Mobiles KT | eGK offline einlesen | eGK, dazu HBA oder SMC-B im mobilen KT | `mobkt` | gemSpec_MobKT (plausibel, Kapitel zur Authentisierung nachlesen) |
| Mobiles KT | Daten ans Primärsystem übergeben | USB-Verbindung zum Primärsystem | `mobkt` | gemSpec_MobKT |
| CardLink | eGK per Smartphone prüfen (VSDM) | eGK per NFC, CardLink am Zugang, SMC-B, VSDM | `cardlinkVsdm` | gemSpec_eHealth-CardLink |
| TI-Messenger-Client | TIM-Nachricht senden | TI-Messenger-FD erreichbar (direkt oder über das Internet). Die Organisation gilt als per SMC-B registriert (Vereinfachung) | `tim` | gemSpec_TI-M_Basis, FP TI-Messenger |

### 6.6 Versicherte

| Aktion | Voraussetzungen | Ablauf | Quelle |
|---|---|---|---|
| E-Rezept-App: Rezepte abrufen | E-Rezept-FD erreichbar (direkt oder über das Internet), GesundheitsID (sektoraler IDP\*) oder eGK per NFC | `app` | gemSpec_eRp_FdV, gemSpec_IDP_Sek |
| ePA-App: Akte ansehen, Befugnis verwalten | ePA erreichbar (direkt oder über das Internet), GesundheitsID (sektoraler IDP\*) | `app` | gemSpec_Aktensystem_ePAfueralle, gemSpec_IDP_Sek |

### 6.7 Alle Geräte und Verbindungen

- Details anzeigen (FR-11)
- Gerät: Ausfall simulieren / wieder in Betrieb nehmen (FR-18, P-1)
- Verbindung: trennen / wiederherstellen (FR-18, P-2)
- Einstellungen öffnen, nur Modus Erweitert (FR-17)

## 7. Abläufe

Rollen: P = Primärsystem, CM = KIM-Clientmodul, K = Zugang
(Konnektor/TI-Gateway), T = Kartenterminal, V = VPN-Zugangsdienst.
Im Katalog stehen `P` (Auslöser), `K`, `T` und sonst Gerätetyp-IDs
(`CM` ist `kimcm`, `V` ist `vpn`); `E` ist eine Seite außerhalb der
Topologie (Empfänger von `tim`, Smartphone der versicherten Person bei
CardLink). Auslegung 2026-11-10: Bei `mobkt` ist `P` das per USB
verbundene Primärsystem. Ohne Weg nach 6.0 hat ein Schritt keine Knoten.
„über K→V“ heißt: Das Primärsystem spricht selbst mit dem Dienst, der
Zugang leitet die Pakete nur durch den VPN-Tunnel weiter. Erklärtexte je
Schritt stehen im Mockup und werden in den Katalog übernommen.

| Ablauf | Schritte (Protokoll) | Status | Quelle |
|---|---|---|---|
| `erezept` | P→K Signaturauftrag (SOAP) · K→T HBA signiert, QES (SICCT, ISO 7816) · K→P signierte Verordnung · P→K Authentisierung mit der SMC-B · P→IDP Token holen (OAuth 2.0, über K→V) · P→E-Rezept-FD Verordnung einstellen (VAU, FHIR, über K→V) · E-Rezept-FD→P Rezept-ID | bestätigt | gemILF_PS_eRp, gemSpec_FD_eRp, gemSpec_KT |
| `vsdm` | P→K ReadVSD (SOAP) · K→T eGK lesen (SICCT) · T→K Kartendaten · K→V→VSDM Abgleich, Prüfziffer · K→P Daten und Prüfungsnachweis | bestätigt | gemSysL_VSDM, gemILF_PS |
| `notfalldaten` | P→K Fachmodul NFDM (SOAP) · K→T Schreib-/Leseauftrag (SICCT) · T→K eGK bestätigt · K→P, **ohne VPN und ohne Fachdienst** | bestätigt | gemSpec_FM_NFDM |
| `emp` | P→K Fachmodul AMTS (ReadMP/WriteMP) · K→T C2C-Authentisierung HBA/SMC-B mit eGK, eGK-PIN · T→K · K→P, **ohne VPN und ohne Fachdienst** | bestätigt | gemSysL_AMTS_A, gemILF_PS_AMTS |
| `eau` | P→CM eAU (SMTP) · CM→K Signatur mit HBA (QES) über T · CM→K Verschlüsselung mit der SMC-B · CM→KIM (mTLS, über K→V) · KIM→Krankenkasse · Krankenkasse→KIM→P Quittung | bestätigt | gemSpec_CM_KOMLE, PM eAU, KIM-DK |
| `kim` | wie `eau`, Empfänger aus dem VZD. HBA-Signatur nur beim eArztbrief | plausibel | gemSpec_CM_KOMLE, gemSpec_VZD_FHIR_Directory |
| `epa` | P→K Authentisierung mit der SMC-B · P→IDP Token (über K→V) · Befugnis prüfen (Prüfungsnachweis oder PoPP) · P→ePA Dokument bzw. Abfrage (VAU, FHIR, über K→V) · ePA→P | plausibel | gemILF_PS_ePA, gemSpec_Aktensystem_ePAfueralle |
| `tim` | Client→TI-Messenger-FD (Matrix, Internet) · FD→FD des Empfängers (Föderation über VZD) · Zustellung | plausibel | gemSpec_TI-M_Basis |
| `erezeptEinloesen` | eGK-Weg: P→K ReadVSD mit eGK · K→V→VSDM Prüfungsnachweis · P→K Authentisierung mit der SMC-B · P→IDP Token (über K→V) · P→E-Rezept-FD Abruf mit Prüfungsnachweis (über K→V) · E-Rezept-FD→P Verordnung | bestätigt | gemF_eRp_Autorisierung_Apo, FP eHealth-CardLink |
| `erezeptEinloesenCode` | Rezeptcode-Weg: wie `erezeptEinloesen` ohne eGK und ohne VSDM, also ab P→K Authentisierung mit der SMC-B | bestätigt | FP E-Rezept Apotheken |
| `cardlinkErp` | eGK→Smartphone (NFC, CAN) · Smartphone→CardLink (Internet) · CardLink→K wie ein Kartenterminal · P→K ReadVSD · K→V→VSDM Prüfungsnachweis · P→E-Rezept-FD Abruf (über K→V) · E-Rezept-FD→P | bestätigt | FP eHealth-CardLink, gemSpec_eHealth-CardLink |
| `cardlinkVsdm` | wie `cardlinkErp` bis zum Prüfungsnachweis | bestätigt | gemSpec_eHealth-CardLink |
| `mobkt` | eGK→Mobiles KT (offline lesen, speichern) · später Mobiles KT→P per USB (CT-API) | bestätigt | gemSpec_MobKT |
| `appErezept` | App→Internet→sektoraler IDP (GesundheitsID) · App→E-Rezept-FD | bestätigt | gemSpec_eRp_FdV, gemSpec_IDP_Sek |
| `appEpa` | App→Internet→sektoraler IDP (GesundheitsID) · App→ePA | bestätigt | gemSpec_Aktensystem_ePAfueralle, gemSpec_IDP_Sek |

Rollenbindung: Knoten werden über den Pfad nach 6.0 bestimmt, nicht
über „erstes passendes Gerät der Topologie“ wie im Mockup.

**Simulation und Bearbeitung:** Während eine Simulation läuft oder
pausiert, ist die Topologie gesperrt. Öffnen einer Datei, Moduswechsel,
Störungen und jede Änderung der Topologie brechen die Simulation ab.

**Kein fachlicher Zustand (Vereinfachung):** Das Modell merkt sich nicht,
ob ein Rezept ausgestellt oder ein Medikationsplan geschrieben wurde.
„eRezept einlösen“ funktioniert deshalb auch ohne vorheriges Ausstellen.
Das Tutorial führt die Schritte in der richtigen Reihenfolge.

## 8. Konfiguration im Modus Erweitert

| Einstellung | Feld | Standard | Regel | Status | Quelle |
|---|---|---|---|---|---|
| IP-Adresse | `ip` | Router .1, Konnektor .2, sonst ab .10 im Netz 192.168.10.0/24 | Beispielwerte | Vereinfachung | DVO |
| Netzmaske | `mask` | 255.255.255.0 | keine | Vereinfachung | DVO |
| Betriebsart | `mode` (KonnektorConfig) | Reihe | Reihe: Zugang zwischen LAN und Router, der Router führt ins Internet. Parallel: Zugang als Gerät im LAN, Router führt ins Internet. In beiden Fällen braucht der Zugang einen Weg ins Internet (P-33) | bestätigt | Betriebsarten, gemSpec_Kon (ANLW_ANBINDUNGS_MODUS) |
| Gateway der Clients | `gateway` | Reihe: Zugang. Parallel: Router | keine | bestätigt | Betriebsarten, DVO |
| Route in die TI (Parallel) | `routeTI` (ClientConfig) | gesetzt | 100.102.0.0/15 über den Zugang, für offene Fachdienste und WANDA | bestätigt | gemILF_PS (Abschnitt 3.2.3), gemSpec_Net |
| DNS der Clients | `dns` | Zugang | TI-Namen löst der Zugang auf | plausibel, wegen Rückbau von Split-DNS (C_12389) neu zu prüfen | gemILF_PS |
| SIS | `sis` (KonnektorConfig) | aus | Reihe: Internet über SIS möglich. Parallel: SIS optional (ANLW_INTERNET_MODUS) | bestätigt | gemSpec_Kon |
| DHCP-Client | `dhcp` | aus | bezieht die Adresse von einem DHCP-Server im Segment | Vereinfachung | gemSpec_Kon |
| DHCP-Server | `dhcpServer` (KonnektorConfig, RouterConfig) | aus | Zugang oder Router kann DHCP-Server sein | plausibel | gemSpec_Kon |
| VLAN | `vlan` | „TI“ | Geräte müssen im selben Segment wie der Zugang liegen | Vereinfachung | DVO |
| Arbeitsplatz | `workplace` (Client, Terminal) | „AP-1“ | jedem Arbeitsplatz ist im Normalfall ein Kartenterminal zugeordnet | bestätigt | gemILF_PS |
| Pairing | `paired`, `pairedWith` (TerminalConfig) | ja, mit dem verbundenen Zugang | ohne Pairing führt der Konnektor nur eingeschränkte Kommandos aus | bestätigt | gemSpec_KT |
| Zertifikat gSMC-K | `certExpires` (KonnektorConfig) | 31.03.2029 | geprüft gegen `simDate` | bestätigt | Arch, gemF_Laufzeitverlängerung_gSMC-K |
| Zeitabweichung | `timeOffset` (KonnektorConfig) | 0 s | Grenzwert NTP_MAX_TIMEDIFFERENCE = 3600 s | bestätigt | gemSpec_Kon |
| Letzte Zeitsynchronisation | `lastTimeSync` (KonnektorConfig) | gleich `simDate` | Warnung nach 30 Tagen, kritisch nach 50 Tagen | bestätigt | gemSpec_Kon (NTP_WARN_PERIOD, NTP_GRACE_PERIOD) |
| Kritisches Update | `updateOk` (KonnektorConfig) | ja | fehlt es nach Frist, baut der Zugang keinen VPN-Tunnel mehr auf | bestätigt | Arch |
| IPsec an der Router-Firewall | `ipsecAllowed` (RouterConfig) | erlaubt | UDP 500/4500 für den VPN-Tunnel | plausibel | gemSpec_VPN_ZugD |

TI-Gateway und Highspeed-Konnektor nutzen die KonnektorConfig. Felder,
die für sie nicht gelten (z. B. `sis`), bleiben leer.

Hostnamen der Dienste aus dem Mockup (`*.splitdns.ti-dienste.de` u. a.)
werden **nicht** übernommen: Split-DNS wird laut gematik zurückgebaut
(C_12389). Anzeigenamen kommen ohne konkrete Hostnamen aus. Quelle:
gemILF_PS (Änderung C_12389).

## 9. Prüfregeln für die Sicherheitsprüfung

Schwere: **Fehler**, **Warnung**, **Hinweis**. Regeln unter „nur
Erweitert“ werden nur im Modus Erweitert geprüft, weil ihre Felder nur
dort einstellbar sind. Alle anderen gelten in beiden Modi.

**Zustand (beide Modi)**

| ID | Regel | Feld | Schwere | Status | Quelle |
|---|---|---|---|---|---|
| P-1 | Gerät ist ausgefallen | Node `fault` | Fehler | Vereinfachung | keine (Simulation) |
| P-2 | Verbindung ist unterbrochen | Edge `fault` | Fehler | Vereinfachung | keine (Simulation) |
| P-3 | Gesteckte Karte ist abgelaufen | Card `expires`, `simDate` | Fehler | bestätigt | gemSpec_PKI |
| P-4 | Kein Zugang (Konnektor, HSK, TI-Gateway) | Node `type` | Warnung | bestätigt | Arch |
| P-5 | Kartenterminal erreicht seinen Zugang nicht (6.0) | Kanten, `pairedWith` | Warnung | bestätigt | gemSpec_KT |
| P-6 | WLAN im selben Segment wie Kartenterminal oder Zugang | Kanten, `vlan` | Warnung | plausibel | DVO |
| P-7 | Gerät ist mit nichts verbunden | Kanten | Hinweis | Vereinfachung | keine |
| P-18 | Zertifikat der gSMC-K abgelaufen | `certExpires`, `simDate` | Fehler | bestätigt | Arch, gemF_Laufzeitverlängerung_gSMC-K |
| P-22 | HBA oder SMC-B nicht freigeschaltet | PinCard `unlocked` | Fehler | bestätigt | gemILF_PS_AMTS, gemILF_PS |
| P-31 | Kartenterminal mit mehr als einem Zugang gepairt | `pairedWith`, Kanten | Fehler | bestätigt | gemSpec_KT |
| P-32 | Konnektor und TI-Gateway in derselben Topologie | Node `type` | Fehler | Vereinfachung | X-1 |
| P-33 | Zugang ohne Weg ins Internet (weder zum Router noch direkt zum VPN-Zugangsdienst) | Kanten | Fehler | bestätigt | Betriebsarten |

Auslegung (2026-11-11, T-503): Die Regeln hängen an Geräten und Kanten,
nicht am „ersten Gerät“. Ein Befund nennt Regel, Schwere, Erklärtext und
die betroffenen Geräte (und Kante). Ungesetzte Felder gelten als
Standardwert (Regelwerk 8), nicht als Verstoß.

- P-1, P-2: Ausfälle melden nur diese Regeln. P-5 und P-33 prüfen die
  Verdrahtung ohne Rücksicht auf Ausfälle, damit ein Ausfall nicht doppelt
  erscheint.
- P-3, P-22: wie K-3 und K-4 (`cardState`). Ablauf am `simDate` gilt noch.
  Eine abgelaufene Karte meldet nur P-3, nicht zusätzlich P-22. Ungesetztes
  `unlocked` zählt als nicht freigeschaltet.
- P-4: nur bei mindestens einem Gerät. Ein ausgefallener Zugang ist
  vorhanden (P-1).
- P-5: gilt für das stationäre eHealth-KT (`kt`), nicht für das mobile
  Kartenterminal (offline) und nicht für CardLink. Ein Terminal ohne
  bestimmbaren Zugang (`zugangOf`, 6.0 samt der Vereinfachung „einziger Zugang“) meldet P-5, sofern es einen Zugang gibt.
- P-6: nur Access Points. Das Segment reicht über Switches und weitere
  Access Points, nicht über Router und Firewall. Gleiches VLAN (ungesetzt:
  „TI“) wie ein Kartenterminal oder Zugang im Segment löst die Warnung aus.
  Das Preset Klinikum meldet sie daher (Access Point im Standard-VLAN).
- P-7: eine unterbrochene Kante zählt als Verbindung, eine Kante zu einem
  unbekannten Knoten nicht.
- P-18: Konnektor und Highspeed-Konnektor. Das TI-Gateway hat keine gSMC-K.
- P-31: gepairt heißt `pairedWith` plus jede direkte Verbindung zu einem
  Zugang. Mehr als ein verschiedener Zugang ergibt den Fehler.
- P-32: ein Befund für die ganze Topologie, mit allen Zugängen beider
  Seiten (Ausschlussregel X-1).
- P-33: Weg über Switches, Access Points und Firewalls zu Router oder
  VPN-Zugangsdienst (oder Internet). Primärsysteme und Terminals leiten
  nicht weiter. Je Zugang ein Befund.

**Adressierung (nur Erweitert)**

| ID | Regel | Feld | Schwere | Status | Quelle |
|---|---|---|---|---|---|
| P-8 | Ungültige IP-Adresse | `ip` | Fehler | Vereinfachung | keine |
| P-9 | IP-Konflikt | `ip` | Fehler | Vereinfachung | keine |
| P-10 | Ungültige Subnetzmaske | `mask` | Fehler | Vereinfachung | keine |
| P-11 | Netz- oder Broadcast-Adresse als Geräteadresse | `ip`, `mask` | Fehler | Vereinfachung | keine |
| P-12 | Ungültiges Gateway | `gateway` | Fehler | Vereinfachung | keine |
| P-13 | Gateway nicht im eigenen Subnetz | `gateway`, `ip`, `mask` | Fehler | Vereinfachung | keine |
| P-14 | Gateway gibt es im Netz nicht | `gateway` | Fehler | Vereinfachung | keine |
| P-15 | Gerät in anderem Subnetz als sein Zugang | `ip`, `mask` | Fehler | plausibel | DVO |

P-8 bis P-14 sind allgemeine Netzwerkregeln ohne TI-Bezug. Sie brauchen
keinen gematik-Beleg.

Auslegung (2026-11-11, T-504): nur IPv4. Ungesetzte Felder melden nichts,
nur die Maske gilt ungesetzt als Standardwert (Regelwerk 8). Jedes Gerät
mit Konfiguration wird geprüft.

- P-8, P-12: vier Zahlen 0 bis 255 ohne führende Nullen.
- P-9: ein Befund je Adresse mit allen Geräten, die sie führen. Ungültige
  Adressen zählen nicht (P-8).
- P-10: zusammenhängende Einsen, Präfix /1 bis /30. /0, /31 und /32 gelten
  als ungültig, weil kein Hostbereich bleibt.
- P-11, P-13, P-14, P-15 setzen gültige Werte voraus, sonst melden P-8,
  P-10 und P-12.
- P-13: Gateway liegt im Netz aus eigener IP und eigener Maske.
- P-14: kein anderes Gerät trägt die Gateway-Adresse.
- P-15: gilt für Clients und stationäre Kartenterminals. Die IP des Geräts
  muss im Netz des Zugangs (dessen IP und Maske) liegen. Zugang nach
  `zugangOf`; ohne bestimmbaren Zugang keine Aussage. Eine weitere Maske
  am Gerät (z. B. /16, Herausforderung 3) ist kein Verstoß.

**Betrieb (nur Erweitert)**

| ID | Regel | Feld | Schwere | Status | Quelle |
|---|---|---|---|---|---|
| P-16 | Kritisches Update nicht eingespielt, deshalb kein VPN-Tunnel | `updateOk` | Fehler | bestätigt | Arch |
| P-17 | Zeitabweichung des Zugangs über 3600 s (NTP_MAX_TIMEDIFFERENCE) führt zum Fehlerzustand | `timeOffset` | Fehler | bestätigt | gemSpec_Kon |
| P-17a | Keine Zeitsynchronisation seit 30 Tagen (Warnung) bzw. 50 Tagen (Fehler) | `lastTimeSync`, `simDate` | Warnung / Fehler | bestätigt | gemSpec_Kon |
| P-19 | Parallelbetrieb ohne Firewall. Der Zugang schützt das LAN dann nicht vor dem Internet | `mode`, Firewall-Knoten | Warnung | bestätigt | Betriebsarten |
| P-20 | Parallelbetrieb ohne Router | `mode`, Router-Knoten | Fehler | bestätigt | Betriebsarten |
| P-21 | Router-Firewall blockiert IPsec, deshalb kein VPN-Tunnel | `ipsecAllowed` | Fehler | plausibel | gemSpec_VPN_ZugD |
| P-23 | DHCP aktiv, aber kein DHCP-Server im Segment | `dhcp`, `dhcpServer` | Fehler | Vereinfachung | gemSpec_Kon |
| P-24 | Gerät in anderem VLAN als der Zugang | `vlan` | Fehler | Vereinfachung | DVO |
| P-25 | Reihenbetrieb: Gateway eines Clients ist nicht der Zugang | `mode`, `gateway` | Fehler | bestätigt | Betriebsarten |
| P-26 | Parallelbetrieb: Gateway eines Clients ist nicht der Router | `mode`, `gateway` | Fehler | bestätigt | Betriebsarten |
| P-27 | Parallelbetrieb: Client ohne Route 100.102.0.0/15 über den Zugang | `routeTI` | Fehler | bestätigt | gemILF_PS |
| P-28 | DNS eines Clients ist nicht der Zugang | `dns` | Warnung | plausibel, wegen C_12389 neu zu prüfen | gemILF_PS |
| P-29 | Arbeitsplatz eines Clients keinem Kartenterminal zugeordnet | `workplace` | Fehler | bestätigt | gemILF_PS |
| P-30 | Kartenterminal nicht gepairt, Karten darin sind unsichtbar | `paired` | Fehler | bestätigt | gemSpec_KT |

**Geändert gegenüber dem Mockup:** P-16 (statt „Firmware älter als 5“),
P-17 (3600 s statt 5 Minuten), P-19 (SIS im Parallelbetrieb ist erlaubt,
die Regel prüft jetzt die fehlende Firewall). Neu: P-17a, P-31, P-32,
P-33. In beiden Modi geprüft: P-18, P-22. P-28 ist nur noch eine Warnung.

## 10. Herausforderungen

Grundlage ist das Preset Arztpraxis. Beim Start schaltet die App in den
Modus Erweitert, weil die Fehler dort liegen. Gelöst ist eine
Herausforderung, wenn

1. ihre Prüfregeln keinen Fehler und keine Warnung mehr melden,
2. alle Geräte aus dem Start noch vorhanden sind und
3. die Zielaktion ausführbar ist.

| Nr. | Titel | Eingebaute Fehler | Verletzte Regeln | Zielaktion |
|---|---|---|---|---|
| 1 | Kein Rezept am Empfang | PVS in falschem Subnetz | P-13, P-15 | eRezept ausstellen am PVS |
| 2 | Montagmorgen | KT 1 mit doppelter IP, KT 2 mit Broadcast-Adresse | P-9, P-11 | VSDM-Prüfung an KT 1 und KT 2 |
| 3 | Nach dem Umzug | PVS mit falschem Gateway und /16-Maske, KT 1 nicht gepairt | P-14, P-25, P-30 | eRezept ausstellen am PVS |
| 4 | Schnelles Internet | Router ergänzt, Zugang parallel, PVS ohne TI-Route und mit fremdem DNS, Firewall blockiert IPsec | P-27, P-28, P-21 | eRezept ausstellen am PVS |
| 5 | Totalausfall | wie 4, dazu Zeitabweichung **75 min** (Mockup: 14 min, liegt unter dem Grenzwert), KT 1 nicht gepairt, HBA nicht freigeschaltet, Arbeitsplatz falsch zugeordnet, IP-Konflikt KT 2 | P-17, P-21, P-22, P-27 bis P-30, P-9 | eRezept ausstellen und VSDM-Prüfung |

## 11. Modus Einfach und Erweitert

Entschieden 2026-11-04 (Plan D36).

| | Einfach | Erweitert |
|---|---|---|
| **Topologie** | dieselbe | dieselbe |
| **Geräte** | Geräte mit „In Einfach sichtbar: ja“. Die anderen sind ausgeblendet, aber vorhanden | alle |
| **Verbindungen** | Verbindungen zwischen sichtbaren Geräten. Ein Weg über ausgeblendete Geräte erscheint als **Sammelkante** (z. B. PVS über den Switch zum Konnektor). Ein Klick auf die Sammelkante zeigt die ausgeblendeten Geräte | alle einzeln |
| **Palette** | nur sichtbare Gerätetypen | alle |
| **Anschlüsse und Einstellungen** | ausgeblendet, das System wählt Anschlüsse (A-3) | sichtbar und änderbar |
| **Prüfregeln** | Abschnitt 9 ohne „nur Erweitert“ | alle |
| **Vereinfachte Direktverbindungen** | erlaubt | erlaubt, die Sicherheitsprüfung weist mit einem Hinweis auf den realen Weg hin |

Der Modus gehört zu den Einstellungen, nicht zur Topologie. Eine Datei
mit ausgeblendeten Geräten lässt sich daher in jedem Modus öffnen.

Auslegung (2026-11-06): Ausgeblendete Geräte, die keine Sammelkante nennt
(Sackgasse an nur einem sichtbaren Gerät, Abzweig neben dem Weg), zeigt ein
Knopf „+n ausgeblendet“ am sichtbaren Nachbarn; ein Klick klappt ihre Namen
auf. Ausgeblendete Geräte ganz ohne sichtbaren Nachbarn nennt ein Hinweis
auf der Canvas („nur im Modus Erweitert sichtbar“). So bleibt jedes
ausgeblendete Gerät auffindbar. Status: Vereinfachung.

Auslegung (2026-11-12, Issue 124): Eine Sammelkante entsteht nur, wenn
mindestens ein Ende kein Endgerät am LAN ist oder wenn eine Verbindungsregel
die beiden Endgeräte verbindet (z. B. mobiles Kartenterminal und PVS, `erl-mkt-ps`). Endgeräte sind die Geräte der
Kategorie `primary` (Primärsysteme) und `terminal` (Kartenterminals); die
Abgrenzung kommt aus den Katalogdaten, ein neues Feld gibt es nicht. Ziele
sind alle übrigen sichtbaren Geräte (Konnektor, Gateway, Dienste). Zwei
Endgeräte am selben Switch ohne solche Regel haben keine Sammelkante, sonst sähe es nach einer
Direktverbindung zwischen Kartenterminals aus, die es in den Daten und im
Modus Erweitert nicht gibt. Der Switch bleibt über die Sammelkanten zum
Konnektor auffindbar. Status: Vereinfachung.

## 12. Offene Fragen

**Entschieden bzw. durch Quellen geklärt**

- [x] Verbots- oder Erlaubnisliste: Erlaubnisliste entscheidet (4.0).
- [x] NFDM/eMP laufen über die Fachmodule im Konnektor, ohne VPN und
  Fachdienst (gemSpec_FM_NFDM, gemSysL_AMTS_A).
- [x] Mobiles KT arbeitet offline, Übergabe per USB (gemSpec_MobKT).
- [x] SIS im Parallelbetrieb ist erlaubt (gemSpec_Kon), P-19 ist umgebaut.
- [x] TI-Route 100.102.0.0/15 ist korrekt (gemILF_PS).
- [x] Zeitgrenzwert 3600 s statt 5 Minuten (gemSpec_Kon).
- [x] eMP braucht eGK und HBA oder SMC-B (gemSysL_AMTS_A).
- [x] VSDM braucht neben der eGK die SMC-B oder den HBA (gemSysL_VSDM).
- [x] IDP über die TI, TI-Messenger über das Internet (2026-11-03).
- [x] Karten sind Zustand des Terminals (D12), ihre Regeln stehen in
  Abschnitt 5.
- [x] PoPP und VSDM 2.0 nur als Komponente im Modus Erweitert.
- [x] Rolle des Konnektors bei E-Rezept und ePA: er signiert, liefert die
  SMC-B-Authentisierung und leitet weiter. Mit dem Fachdienst spricht das
  Primärsystem (gemILF_PS_eRp, Prüfbericht 2026-11-04).
- [x] Prüfungsnachweis als Voraussetzung für Apotheke und ePA ergänzt.
- [x] Modus nur als Darstellung, Sammelkanten im Modus Einfach (11).

**Noch offen**

Diese Punkte präzisieren nur die Belege. Die betroffenen Einträge behalten
ihren Status aus den Tabellen (plausibel, Vereinfachung bzw. bestätigt) und
gehen so in den Katalog (T-905, abgeschlossen am 2026-11-05). Die Punkte
bleiben hier sichtbar, bis ein Beleg vorliegt.

- [ ] Netzweg von CardLink zum Konnektor in gemSpec_eHealth-CardLink
  Kapitel 6.3 nachlesen.
- [ ] Belege für V-17, V-20 und die Anschlusszahlen der LAN-Geräte.
- [ ] Gültigkeit der eAU-Dienstkennungen ab 2026 prüfen (KIM-DK).
- [ ] Befugnisdauer der ePA (90 bzw. 3 Tage) gegen den Stand 2026 prüfen.
- [ ] Authentisierung am mobilen KT in gemSpec_MobKT nachlesen.
- [ ] Ablauf `epa` gegen gemILF_PS_ePA im Detail prüfen.
- [ ] Netzports mit „offen“ in Abschnitt 3 belegen.

## 13. Presets

Jedes Preset ist eine fertig verbundene Topologie. Jede Kante steht im
Katalog (`presets.json`) und wird in der CI mit `validateConnection` und
gegen die Anschlüsse geprüft (A-5). Karten stecken bereits, damit
Aktionen sofort ausführbar sind. Das Simulationsdatum ist fest
(`simDate` = 2026-11-01), damit Presets und Tests nicht veralten.
Grundlage ist das Mockup, Abweichungen sind markiert.

| Preset | Name im Mockup | Geräte | Karten | Abweichung vom Mockup |
|---|---|---|---|---|
| Arztpraxis | Arztpraxis Dr. Behrens | 1 PVS, 2 eHealth-KT, 1 Switch, 1 Router, 1 Konnektor, 1 VPN-Zugangsdienst, 1 TI-Messenger-Client. Dienste: IDP, VSDM, E-Rezept, KIM, TI-Messenger, ePA | KT 1: SMC-B, **HBA**. KT 2: eGK | HBA ergänzt (sonst kein eRezept). Router ergänzt (Weg ins Internet, P-33). TI-Messenger-Client ergänzt und direkt am TI-Messenger-FD statt am VPN |
| Apotheke | Apotheke am Markt | 1 AVS, 1 eHealth-KT, 1 Switch, 1 Router, 1 Konnektor, 1 VPN-Zugangsdienst, 1 CardLink. Dienste: IDP, **VSDM**, E-Rezept, **ePA** | KT: SMC-B, eGK | VSDM ergänzt (Prüfungsnachweis), ePA ergänzt (Medikationsliste), Router und CardLink ergänzt |
| Krankenhaus | Kreiskrankenhaus Nord, TI 2.0 | 1 KIS, 2 Arbeitsplatz-PCs, 2 eHealth-KT, 2 Switches, **1 Router**, 1 TI-Gateway, 1 VPN-Zugangsdienst, 1 TI-Messenger-Client. Dienste: IDP, VSDM, E-Rezept, KIM, TI-Messenger, ePA | KT 1: eGK, SMC-B. KT 2: HBA | ein Router statt zwei (V-20). TI-Gateway am Switch wie ein Konnektor. TI-Messenger-Client ergänzt. Zeigt das TI-Gateway statt Konnektor (X-1) |
| Klinikum | Klinikum St. Anna | 1 KIS, 6 Arbeitsplatz-PCs, 1 Visite-Tablet, RIS, LIS, 3 eHealth-KT, 6 Switches, 1 Access Point, 1 Router, 1 Highspeed-Konnektor, 1 VPN-Zugangsdienst, 1 TI-Messenger-Client. Dienste: IDP, VSDM, E-Rezept, KIM, TI-Messenger, ePA. Zonen: Notaufnahme, Station Innere (WLAN), Radiologie, Labor | KT: eGK, HBA · HBA · eGK, SMC-B | Router nicht direkt am VPN-Zugangsdienst: der Highspeed-Konnektor hängt direkt am VPN (vereinfacht), der Router führt ins Internet. TI-Messenger-Client ergänzt |

Quelle: Mockup (`design/mockup/TI Visualizer.dc.html`, `PRESETS`). Belege
für die einzelnen Verbindungen siehe Abschnitt 4.2.
