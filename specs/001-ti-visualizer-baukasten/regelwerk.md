# Regelwerk 001: Kombinationsregeln der TI-Komponenten

**Status:** Entwurf, überarbeitet am 2026-11-03. Ausgangsbasis waren die
Regeln aus dem Mockup (`design/mockup/TI Visualizer.dc.html`) und die
freigegebene Matrix der [Spec](./spec.md). Alle Regeln sind jetzt mit
mindestens einer offiziellen Quelle belegt oder ausdrücklich als
Vereinfachung bzw. offen markiert. Fachliche Freigabe durch Justin offen.
**Bezug:** Spec FR-4, FR-7, FR-14, FR-17 bis FR-21
**Quellen:** [quellen.md](./quellen.md)

## Zweck und Aufbau

Dieses Dokument ist die fachliche Quelle für die Regel-Engine und den
Datenkatalog. Jede Regel hat eine ID, eine Erklärung, einen Status und
eine Quelle.

| Status | Bedeutung |
|---|---|
| **bestätigt** | in einer gematik-Quelle ausdrücklich belegt |
| **plausibel** | aus gematik-Quellen abgeleitet, aber nicht wörtlich belegt. Prüfung durch Justin offen |
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
8 Konfiguration · 9 Prüfregeln · 10 Herausforderungen · 11 Sichtbarkeit
je Modus · 12 Offene Fragen · 13 Presets

## 1. Gerätetypen

„Modus“: **E** = in beiden Modi, **X** = nur im Modus Erweitert (siehe
Abschnitt 11). „neu“ = nicht im Mockup.

### 1.1 Primärsysteme und Clients

| Schlüssel | Name | Modus | Status | Quelle |
|---|---|---|---|---|
| `pvs` | Praxisverwaltungssystem | E | bestätigt | gemILF_PS |
| `kis` | Krankenhausinformationssystem | E | bestätigt | gemILF_PS, KH |
| `avs` | Apothekenverwaltungssystem | E | bestätigt | gemILF_PS, gemF_eRp_Autorisierung_Apo |
| `pflege` | Pflege-Software (Pflegeeinrichtung), neu | E | bestätigt | gematik Pflege-FAQ |
| `ris` | Radiologie-Informationssystem | X | plausibel (Subsystem im Krankenhaus) | KH |
| `lis` | Labor-Informationssystem | X | plausibel (Subsystem im Krankenhaus) | KH |
| `pc` | Arbeitsplatz-PC | X | bestätigt (Arbeitsplatz im Infomodell) | gemILF_PS |
| `tab` | Visite-Tablet (KIS-Client per WLAN) | X | plausibel | gemILF_PS, KH |
| `kimcm` | KIM-Clientmodul, neu | X | bestätigt | gemSpec_CM_KOMLE |
| `timc` | TI-Messenger-Client, neu | E | bestätigt | gemSpec_TI-M_Basis |

### 1.2 Smartcards

| Schlüssel | Name | Modus | Status | Quelle |
|---|---|---|---|---|
| `egk` | elektronische Gesundheitskarte | E | bestätigt | gemSpec_eGK_ObjSys_G2_1 |
| `hba` | Heilberufsausweis | E | bestätigt | gemSpec_HBA_ObjSys |
| `smcb` | Institutionskarte SMC-B | E | bestätigt | gemSpec_SMC-B_ObjSys_G2_1 |

Technische Karten sind **keine Knoten**, sondern Eigenschaften:
gSMC-KT im Kartenterminal, gSMC-K im Konnektor (Zertifikat, siehe
P-18), HSM-B im Highspeed-Konnektor. Quelle: Arch, gemSpec_KT,
gemF_Highspeed-Konnektor.

### 1.3 Kartenterminals

| Schlüssel | Name | Modus | Status | Quelle |
|---|---|---|---|---|
| `kt` | eHealth-Kartenterminal | E | bestätigt | gemSpec_KT |
| `mkt` | Mobiles Kartenterminal (offline) | E | bestätigt | gemSpec_MobKT |
| `cardlink` | eHealth-CardLink | E | bestätigt | gemSpec_eHealth-CardLink |

### 1.4 Lokales Netz

| Schlüssel | Name | Modus | Status | Quelle |
|---|---|---|---|---|
| `switch` | Switch | X | plausibel | DVO |
| `router` | Internet-Router (IAG, Internet Access Gateway), mit WLAN | X | bestätigt | Betriebsarten, gemSpec_Kon |
| `ap` | WLAN Access Point | X | plausibel | DVO |
| `fw` | Firewall, neu | X | bestätigt (im Parallelbetrieb nötig) | Betriebsarten |

### 1.5 Zugang zur TI und Netze

| Schlüssel | Name | Modus | Status | Quelle |
|---|---|---|---|---|
| `kon` | Konnektor | E | bestätigt | gemSpec_Kon |
| `hskon` | Highspeed-Konnektor | E | bestätigt | gemF_Highspeed-Konnektor |
| `gateway` | TI-Gateway (Zugangsmodul + HSK-Instanz) | E | bestätigt | gemF_TI-Gateway |
| `vpn` | VPN-Zugangsdienst | E | bestätigt | Arch, gemSpec_VPN_ZugD |
| `internet` | Internet (Transportnetz), neu | X | bestätigt | Arch |
| `zentral` | Zentrales Netz der TI, neu | X | bestätigt | Arch, gemSpec_Net |

### 1.6 Zentrale Dienste (neu)

| Schlüssel | Name | Modus | Status | Quelle |
|---|---|---|---|---|
| `dns` | Namensdienst | X | bestätigt | gemSpec_Net |
| `ntp` | Zeitdienst | X | bestätigt | gemSpec_Net |
| `vzd` | Verzeichnisdienst (FHIR-Directory) | X | bestätigt | gemSpec_VZD, gemSpec_VZD_FHIR_Directory |
| `tsl` | TSL-Dienst mit OCSP-Responder | X | bestätigt | gemSpec_TSL, gemSpec_PKI |
| `idp` | Identity Provider (zentral) | E | bestätigt | gemSpec_IDP_FD, gemSpec_FD_eRp |
| `idpsek` | Sektoraler IDP (GesundheitsID) | X | bestätigt | gemSpec_IDP_Sek |

### 1.7 Fachdienste

| Schlüssel | Name | Modus | Status | Quelle |
|---|---|---|---|---|
| `vsdm` | VSDM-Fachdienst der Krankenkasse | E | bestätigt | gemSysL_VSDM, gemSpec_VSDM_2 |
| `erp` | E-Rezept-Fachdienst | E | bestätigt | gemSpec_FD_eRp |
| `kim` | KIM-Fachdienst | E | bestätigt | gemSpec_FD_KOMLE |
| `tim` | TI-Messenger-Fachdienst | E | bestätigt | gemSpec_TI-M_Basis |
| `epa` | ePA-Aktensystem | E | bestätigt | gemSpec_Aktensystem_ePAfueralle |
| `popp` | PoPP-Service, neu | X | bestätigt | gemSpec_PoPP_Service |

### 1.8 Versicherte und Gegenstellen (neu)

| Schlüssel | Name | Modus | Status | Quelle |
|---|---|---|---|---|
| `kk` | Krankenkasse (Empfänger z. B. der eAU) | E | bestätigt | PM eAU, KIM-DK |
| `erpapp` | E-Rezept-App der Versicherten | E | bestätigt | gemSpec_eRp_FdV |
| `epaapp` | ePA-App der Versicherten | X | bestätigt | gemSpec_Aktensystem_ePAfueralle |

Kategorien haben je eine farbenblind-sichere Farbe und eine eigene Form
(Mockup). Neue Kategorien: Zentrale Dienste und Versicherte.

## 2. Anschlüsse

### 2.1 Anschlussarten

| Art | Bezeichnung | Status | Quelle |
|---|---|---|---|
| `eth` | Ethernet (RJ45) | Vereinfachung | DVO |
| `wan` | WAN-Seite zum Router bzw. Internet | Vereinfachung | Betriebsarten |
| `usb` | USB | bestätigt (Mobiles KT) | gemSpec_MobKT |
| `wifi` | WLAN (Funk) | plausibel | DVO |
| `net` | Anschluss an ein Netz (Internet, Zentrales Netz), mehrfach | Vereinfachung | Arch |
| `tun` | VPN-Zugang (logisch) | bestätigt | Arch, gemSpec_VPN_ZugD |
| `ti` | Anschluss am Zentralen Netz (logisch) | bestätigt | Arch |
| `nfc` | kontaktlos (eGK) | bestätigt | gemSpec_eHealth-CardLink |
| `slot` | Kartenslot | bestätigt | gemSpec_KT, gemSpec_MobKT |

### 2.2 Anschlüsse je Gerät

„mehrfach“ = beliebig viele Verbindungen, sonst genau eine.

| Gerät | Anschlüsse | Status | Quelle |
|---|---|---|---|
| PVS, AVS, Pflege, PC | Ethernet0, USB0, USB1 | Mockup, plausibel | gemILF_PS |
| KIS | LAN0 bis LAN5 | Mockup, plausibel | KH |
| RIS, LIS | LAN0, LAN1 (KIS-Schnittstelle) | Mockup, plausibel | KH |
| Visite-Tablet | WLAN0, USB-C | Mockup, plausibel | KH |
| KIM-Clientmodul | LAN0 | plausibel | gemSpec_CM_KOMLE |
| TI-Messenger-Client | WAN (Internet) | plausibel | gemSpec_TI-M_Basis |
| eHealth-KT | LAN0, Slots (je Kartenart einer) | bestätigt (LAN, Slots) | gemSpec_KT |
| Mobiles KT | USB0, Slots (ID-1 und Plug-in gleichzeitig) | bestätigt | gemSpec_MobKT (TIP1-A_3720) |
| eHealth-CardLink | WAN (Internet), NFC (über das Smartphone der Versicherten) | bestätigt | gemSpec_eHealth-CardLink |
| Switch | Port 1 bis 8 | Mockup, Vereinfachung | DVO |
| Router (IAG) | LAN1 bis LAN4, WLAN (mehrfach), WAN | Mockup, plausibel | Betriebsarten |
| Access Point | LAN (PoE), WLAN (mehrfach) | Mockup, plausibel | DVO |
| Firewall | LAN, WAN | plausibel | Betriebsarten |
| Konnektor, TI-Gateway | LAN, WAN | bestätigt | gemSpec_Kon, Betriebsarten |
| Highspeed-Konnektor | LAN0, LAN1, WAN | plausibel | gemF_Highspeed-Konnektor |
| VPN-Zugangsdienst | Zugangspunkt (`tun`, mehrfach), Zentrales Netz (`ti`, mehrfach), Internet (`net`) | bestätigt | Arch |
| Internet | Netz (`net`, mehrfach) | Vereinfachung | Arch |
| Zentrales Netz | Netz (`ti`, mehrfach) | Vereinfachung | Arch |
| Zentrale Dienste, Fachdienste | TI-Zugang (`ti`) | bestätigt | Arch, gemSpec_Net |
| E-Rezept-FD, ePA, IDP, sektoraler IDP, PoPP, TI-Messenger-FD | zusätzlich Internet (`net`) für Versicherte bzw. TI 2.0 | bestätigt | gemSpec_eRp_FdV, gemSpec_Aktensystem_ePAfueralle, gemSpec_IDP_Sek, gemSpec_PoPP_Service, gemSpec_TI-M_Basis |
| Krankenkasse | TI-Zugang (`ti`) | plausibel | KIM-DK |
| E-Rezept-App, ePA-App | Internet (`net`), NFC (eGK) | bestätigt | gemSpec_eRp_FdV |

### 2.3 Verträglichkeit

- **A-1** Gleiche Arten passen zusammen, außer `wan` mit `wan`. (Mockup,
  Vereinfachung)
- **A-2** Zusätzlich erlaubt: `eth` mit `wan`, `wan` mit `net`, `tun` mit `net`,
  `ti` mit `ti`. (Vereinfachung nach Arch)
- **A-3** Modus Einfach: Das System wählt das erste freie, verträgliche
  Anschlusspaar. Modus Erweitert: Der Nutzer wählt. (Mockup)
- **A-4** Läuft eine Verbindung über `wifi`, ist sie eine
  WLAN-Verbindung. (Mockup)

## 3. Verbindungsarten

| Art | Name | Bedeutung | Linienstil |
|---|---|---|---|
| `phys` | Physisch | Kabel oder gesteckte Karte | durchgezogen, dick |
| `nfc` | NFC | kontaktlos, nur eGK | gepunktet |
| `tcp` | TCP/TLS | im lokalen Netz bzw. in der TI | durchgezogen, dünn |
| `vpn` | VPN | IPsec-Tunnel in die TI | gestrichelt |
| `wlan` | WLAN | Funk im lokalen Netz | kurz gestrichelt |
| `inet` | Internet | offenes Netz | Strich-Punkt |
| `usb` | USB | lokale Kabelverbindung, z. B. Mobiles KT | durchgezogen, dick |

Protokoll-Beschriftungen (Auswahl, mit Beleg):

| Verbindung | Beschriftung | Status | Quelle |
|---|---|---|---|
| Karte ↔ eHealth-KT | gesteckt · ISO 7816 | bestätigt | gemSpec_KT |
| eGK ↔ Smartphone/CardLink | NFC · ISO 14443, mit CAN | bestätigt | gemSpec_eHealth-CardLink |
| eHealth-KT ↔ Konnektor | SICCT über TLS, nach Pairing | bestätigt | gemSpec_KT |
| CardLink ↔ Konnektor | wie Kartenterminal, über Internet (TLS) | bestätigt | gemSpec_eHealth-CardLink (A_24769) |
| Primärsystem ↔ Konnektor | SOAP/TLS | bestätigt | gemILF_PS |
| Mobiles KT ↔ Primärsystem | USB · CT-API | bestätigt | gemSpec_MobKT |
| Konnektor ↔ VPN-Zugangsdienst | IPsec (IKEv2) über das Transportnetz | bestätigt | Arch, gemSpec_VPN_ZugD |
| Primärsystem ↔ KIM-Clientmodul | SMTP / POP3 | bestätigt | gemSpec_CM_KOMLE |
| KIM-Clientmodul ↔ KIM-Fachdienst | SMTP / POP3 über mTLS | bestätigt | gemSpec_CM_KOMLE |
| TI-Messenger-Client ↔ TI-Messenger-FD | Matrix (Client-Server-API) | bestätigt | gemSpec_TI-M_Basis |
| Konnektor ↔ E-Rezept-FD, ePA | TLS · FHIR bzw. VAU | bestätigt | gemSpec_FD_eRp, gemSpec_Aktensystem_ePAfueralle |
| Konnektor ↔ VSDM-FD | SOAP | plausibel | gemSysL_VSDM |
| Primärsystem ↔ IDP | OAuth 2.0 / OIDC | bestätigt | gemSpec_IDP_FD |
| KIS ↔ RIS/LIS | HL7 v2 · TLS (außerhalb der TI) | plausibel | KH |

## 4. Verbindungsregeln

### 4.0 Prüflogik (entschieden 2026-11-03)

| Liste | Aufgabe | Entscheidet über Gültigkeit? |
|---|---|---|
| **Grundprüfungen** (4.1) | Selbstverbindung, Doppelung, Anschlüsse, Anzahl | ja |
| **Erlaubnisliste** (4.2) | erlaubte Gerätepaare | **ja, allein** für die Paarfrage |
| **Begründungsliste** (4.3) | Erklärtexte für typische Fehlversuche | nein, nur Meldungstext |
| **Ausschlüsse** (4.4) | Komponenten, die nicht gemeinsam vorkommen dürfen | ja |

Ablauf: (1) Grundprüfungen und Ausschlüsse, (2) Paar in der
Erlaubnisliste? Dann gültig. (3) Sonst abgelehnt mit dem Text der
passenden Begründungsregel, (4) ohne passende Regel mit der Meldung
„Diese Verbindung gibt es in der TI nicht. ‹Gerät› kann verbunden werden
mit: …“.

**Konsistenztest:** Kein Paar der Erlaubnisliste darf von einer
Begründungsregel erfasst werden.

### 4.1 Grundprüfungen

Die früheren Mockup-Regeln V-1, V-2 und V-11 sind hier als G-1 bis G-3
aufgegangen. Ihre Nummern bleiben frei, damit alte Verweise eindeutig
bleiben.

| ID | Regel | Meldung | Status | Quelle |
|---|---|---|---|---|
| G-1 | Keine Verbindung eines Geräts mit sich selbst | Ein Gerät kann nicht mit sich selbst verbunden werden. | Vereinfachung | keine (Editorregel) |
| G-2 | Keine doppelte Verbindung zwischen denselben Geräten | Diese beiden Geräte sind bereits verbunden. | Vereinfachung | keine (Editorregel) |
| G-3 | Es gibt ein freies, verträgliches Anschlusspaar (2.3) | ‹Gerät› hat keinen freien passenden Anschluss mehr. | Vereinfachung | DVO |
| G-4 | Ein eHealth-KT ist mit höchstens **einem** Konnektor verbunden | Ein Kartenterminal arbeitet immer nur mit einem Konnektor zusammen. | bestätigt | gemSpec_KT |
| G-5 | Eine Karte steckt in höchstens einem Terminal | Diese Karte steckt bereits in einem anderen Terminal. | bestätigt (physisch) | gemSpec_KT |

### 4.2 Erlaubnisliste

Verbindungen gelten in beide Richtungen. „E“ = im Modus Einfach als
direkte logische Verbindung zulässig, „X“ = nur im Modus Erweitert.

**Karten und Terminals**

| Von | Nach | Modus | Status | Quelle |
|---|---|---|---|---|
| eGK, HBA, SMC-B | eHealth-KT (gesteckt) | E | bestätigt | gemSpec_KT, Arch |
| eGK, HBA, SMC-B | Mobiles KT (gesteckt) | E | bestätigt | gemSpec_MobKT |
| eGK | eHealth-CardLink (NFC über Smartphone) | E | bestätigt | gemSpec_eHealth-CardLink |
| eGK | E-Rezept-App, ePA-App (NFC) | X | bestätigt | gemSpec_eRp_FdV |
| eHealth-KT | Konnektor, HS-Konnektor, TI-Gateway | E | bestätigt | gemSpec_KT, gemSpec_Kon |
| eHealth-KT | Switch, Router-LAN | X | bestätigt (KT im LAN) | gemSpec_KT, DVO |
| eHealth-CardLink | Konnektor, TI-Gateway | E | bestätigt | gemSpec_eHealth-CardLink |
| eHealth-CardLink | Internet | X | bestätigt | gemSpec_eHealth-CardLink |
| Mobiles KT | PVS, KIS, AVS, Pflege, PC (USB, zur Datenübergabe) | E | bestätigt | gemSpec_MobKT |

**Primärsysteme**

| Von | Nach | Modus | Status | Quelle |
|---|---|---|---|---|
| PVS, KIS, AVS, Pflege | Konnektor, TI-Gateway | E | bestätigt | gemILF_PS, Spec-Matrix |
| KIS | Highspeed-Konnektor | E | bestätigt | gemF_Highspeed-Konnektor, KH |
| PVS, KIS, AVS, Pflege, PC, RIS, LIS | Switch, Router-LAN | X | plausibel | DVO |
| Visite-Tablet | Access Point, Router-WLAN | X | plausibel | KH |
| PC | KIS, PVS, AVS (als Arbeitsplatz) | E | bestätigt (Arbeitsplatz im Infomodell) | gemILF_PS |
| RIS, LIS | KIS (HL7-Schnittstelle) | E | plausibel | KH |
| PVS, KIS, AVS, Pflege | KIM-Clientmodul | E | bestätigt | gemSpec_CM_KOMLE |
| KIM-Clientmodul | Konnektor, HS-Konnektor, TI-Gateway | E | bestätigt | gemSpec_CM_KOMLE |
| PVS, KIS, AVS, Pflege | IDP (über Konnektor und TI, entschieden 2026-11-03) | E | plausibel | gemSpec_IDP_FD |
| TI-Messenger-Client | TI-Messenger-FD | E | bestätigt | gemSpec_TI-M_Basis |
| TI-Messenger-Client | Internet | X | plausibel | gemSpec_TI-M_Basis |

**Lokales Netz**

| Von | Nach | Modus | Status | Quelle |
|---|---|---|---|---|
| Switch | Switch, Router-LAN, Access Point, Firewall, Konnektor-LAN | X | plausibel | DVO |
| Router (WAN) | Internet | X | bestätigt | Betriebsarten |
| Firewall | Router, Switch, Konnektor | X | bestätigt (Parallelbetrieb) | Betriebsarten |

**Zugang zur TI**

| Von | Nach | Modus | Status | Quelle |
|---|---|---|---|---|
| Konnektor (WAN) | Router (Reihenbetrieb: Konnektor zwischen LAN und Router) | X | bestätigt | Betriebsarten, gemSpec_Kon |
| Konnektor (LAN) | Switch (Parallelbetrieb: Konnektor als Gerät im LAN) | X | bestätigt | Betriebsarten, gemSpec_Kon |
| Konnektor, TI-Gateway | VPN-Zugangsdienst (direkt) | E | Vereinfachung: in Wirklichkeit über Router und Internet | Arch |
| TI-Gateway | Router, Internet (Zugang zur HSK-Instanz nur per VPN) | X | bestätigt | gemF_TI-Gateway (A_23351) |
| VPN-Zugangsdienst | Internet | X | bestätigt | Arch |
| VPN-Zugangsdienst | Zentrales Netz | X | bestätigt | Arch |
| VPN-Zugangsdienst | Fachdienste, IDP (direkt) | E | Vereinfachung: in Wirklichkeit über das Zentrale Netz | Arch, Spec-Matrix |

**Zentrales Netz, Dienste und Versicherte**

| Von | Nach | Modus | Status | Quelle |
|---|---|---|---|---|
| Zentrales Netz | DNS, NTP, VZD, TSL/OCSP, IDP | X | bestätigt | gemSpec_Net, Arch |
| Zentrales Netz | VSDM, E-Rezept, KIM, ePA | X | bestätigt | Arch |
| KIM-Fachdienst | Krankenkasse | E | plausibel (Krankenkasse hat eigenen KIM-Zugang) | KIM-DK, PM eAU |
| E-Rezept-FD, ePA, IDP, sektoraler IDP, PoPP, TI-Messenger-FD | Internet | X | bestätigt | gemSpec_eRp_FdV, gemSpec_IDP_Sek, gemSpec_PoPP_Service, gemSpec_TI-M_Basis |
| E-Rezept-App | E-Rezept-FD | E | bestätigt | gemSpec_eRp_FdV |
| E-Rezept-App, ePA-App | Internet, sektoraler IDP | X | bestätigt | gemSpec_eRp_FdV, gemSpec_IDP_Sek |
| ePA-App | ePA | E | bestätigt | gemSpec_Aktensystem_ePAfueralle |
| PVS, KIS, AVS | PoPP-Service (über ZETA, Internet) | X | plausibel | gemSpec_PoPP_Service, Infoveranstaltung VSDM 2.0 |

### 4.3 Begründungsliste

| ID | Fehlversuch | Meldung | Status | Quelle |
|---|---|---|---|---|
| V-3 | Smartcard an etwas anderes als ein Kartenterminal. Ausnahme: eGK an Versicherten-App (NFC) | Smartcards werden nur in ein Kartenterminal gesteckt, nie direkt an Konnektor, Primärsystem oder Fachdienst. | bestätigt | Arch (Konnektor verwaltet Karten über Terminals) |
| V-4 | Primärsystem (PVS, KIS, AVS, Pflege, PC, Tablet, RIS, LIS) direkt an Fachdienst. Ausnahme: PoPP-Service (TI 2.0, über ZETA). Der TI-Messenger-Client fällt nicht darunter | Ein Primärsystem darf nicht direkt mit einem Fachdienst verbunden werden. Der Weg führt immer über Konnektor oder TI-Gateway und den VPN-Zugangsdienst. | bestätigt | Arch, gemILF_PS |
| V-5 | Kartenterminal direkt an Fachdienst | Kartenterminals sprechen nie direkt mit einem Fachdienst. Dazwischen steht immer der Konnektor. | bestätigt | gemSpec_KT, Arch |
| V-6 | Primärsysteme untereinander außerhalb der erlaubten Paare | Diese Systeme werden nicht direkt verkabelt. Arbeitsplatz-PCs hängen am KIS, PVS oder AVS. RIS und LIS sind über eine Schnittstelle mit dem KIS verbunden. | plausibel | gemILF_PS, KH |
| V-7 | Lokales Netz direkt an Fachdienst | Geräte des lokalen Netzes erreichen Fachdienste nur über Konnektor und VPN-Zugangsdienst. | bestätigt | Arch |
| V-8 | Switch oder Access Point an VPN-Zugangsdienst oder Internet | Nur der Router führt ins Internet. Switch und Access Point bleiben im lokalen Netz. | plausibel | Betriebsarten |
| V-9 | Fachdienste untereinander | Fachdienste werden nicht direkt miteinander verbunden. Sie hängen am Zentralen Netz. | bestätigt | Arch |
| V-10 | Konnektor an TI-Gateway | Konnektor und TI-Gateway schließen sich in einer Topologie gegenseitig aus. | bestätigt | siehe X-1 |
| V-12 | Primärsystem oder Kartenterminal direkt an VPN-Zugangsdienst | Den VPN-Tunnel in die TI baut nur der Konnektor bzw. das TI-Gateway auf. | bestätigt | Arch, gemSpec_VPN_ZugD |
| V-13 | HBA oder SMC-B an eHealth-CardLink | Über eHealth-CardLink wird nur die eGK gelesen, ohne PIN. HBA und SMC-B gehören in ein stationäres Kartenterminal. | bestätigt | gemSpec_eHealth-CardLink |
| V-14 | Mobiles KT an Konnektor oder Netzwerk | Das mobile Kartenterminal arbeitet offline, etwa beim Hausbesuch. Die Daten gehen später per USB ans Primärsystem. | bestätigt | gemSpec_MobKT |
| V-15 | Versicherten-App an Konnektor oder Primärsystem | Versicherte nutzen ihre Apps über das Internet, nicht über die Infrastruktur der Praxis. | bestätigt | gemSpec_eRp_FdV |
| V-16 | Zentrale Dienste direkt ins lokale Netz | Zentrale Dienste der TI liegen im Zentralen Netz und sind nur über den VPN-Zugangsdienst erreichbar. | bestätigt | Arch, gemSpec_Net |
| V-17 | Konnektor an Konnektor | Eine Einrichtung nutzt ihre Konnektoren unabhängig voneinander. Sie werden nicht miteinander verbunden. | plausibel | gemSpec_Kon |
| V-18 | Kartenterminal an Kartenterminal | Kartenterminals werden nicht hintereinander geschaltet. Jedes spricht direkt mit dem Konnektor. | bestätigt | gemSpec_KT |

### 4.4 Ausschlüsse

| ID | Regel | Status | Quelle |
|---|---|---|---|
| X-1 | Konnektor/Highspeed-Konnektor und TI-Gateway nicht in derselben Topologie. Gilt für die ganze Topologie, nicht nur für die direkte Verbindung | bestätigt (Spec, freigegeben 2026-09-20) | FP Konnektor/TI-Gateway, gemF_TI-Gateway |

## 5. Karten

| ID | Regel | Status | Quelle |
|---|---|---|---|
| K-1 | Karten stecken in Terminals. Ein eHealth-KT nimmt hier je Kartenart eine Karte auf | Vereinfachung (Anzahl der Slots ist herstellerabhängig) | gemSpec_KT |
| K-2 | „Karte stecken“ bietet nur Kartenarten an, die im Terminal noch fehlen | Vereinfachung | gemSpec_KT |
| K-3 | Jede Karte hat ein Ablaufdatum (Zertifikatslaufzeit). Eine abgelaufene Karte zählt als nicht gesteckt | bestätigt | gemSpec_PKI |
| K-4 | HBA und SMC-B müssen per PIN freigeschaltet sein („erhöhter Sicherheitszustand“), sonst schlagen PIN-pflichtige Aktionen fehl | bestätigt | gemILF_PS_AMTS, gemILF_PS |
| K-5 | Die SMC-B ist im Infomodell einem Mandanten zugeordnet und steckt dauerhaft | bestätigt | gemILF_PS |
| K-6 | Über eHealth-CardLink wird nur die eGK genutzt, ohne PIN, mit CAN | bestätigt | gemSpec_eHealth-CardLink |
| K-7 | Die eGK-PIN dient als Einwilligung für eMP/AMTS, sofern die versicherte Person sie nicht abgeschaltet hat | bestätigt | gemILF_PS_AMTS |

## 6. Aktionen und Voraussetzungen

Bausteine der Voraussetzungen:

| Baustein | Bedingung | Quelle |
|---|---|---|
| **Zugang** | Ein Konnektor, HS-Konnektor oder TI-Gateway ist über einen verbundenen Pfad erreichbar (Spec FR-8), nicht nur vorhanden | Arch |
| **TI** | Der Zugang hat einen Pfad zum VPN-Zugangsdienst | Arch |
| **Karte X** | Karte steckt in einem Terminal, das am selben Zugang hängt, ist nicht abgelaufen (K-3) und, bei HBA/SMC-B, freigeschaltet (K-4) | gemSpec_KT, gemILF_PS |
| **Dienst X** | Fachdienst X ist über die TI erreichbar | Arch |
| **Befugnis** | Für die ePA: eGK gesteckt oder PoPP-Token | gemSpec_Aktensystem_ePAfueralle |

Die erste nicht erfüllte Bedingung liefert die Begründung im
ausgegrauten Menüeintrag.

### 6.1 PVS, KIS (und deren PC/Tablet als Arbeitsplatz)

| Aktion | Voraussetzungen | Ablauf | Quelle |
|---|---|---|---|
| eRezept ausstellen | Zugang, TI, HBA (QES), SMC-B, E-Rezept, IDP | `erezept` | gemSpec_FD_eRp, KH (HBA für QES) |
| eAU ausstellen und per KIM senden | Zugang, TI, HBA (QES), KIM-Clientmodul*, KIM | `eau` | PM eAU, gemSpec_CM_KOMLE |
| eAU-Kopie in die ePA hochladen | Zugang, TI, SMC-B, Befugnis, ePA | `epa` | gemILF_PS_ePA, KBV (nur auf Wunsch) |
| Befund in die ePA hochladen | Zugang, TI, SMC-B, Befugnis, ePA | `epa` | gemILF_PS_ePA |
| ePA-Medikationsliste einsehen | Zugang, TI, SMC-B, Befugnis, ePA | `epa` | gemSpec_Aktensystem_ePAfueralle |
| Notfalldatensatz schreiben | Zugang, eGK, HBA (QES) | `notfalldaten` | gemSpec_FM_NFDM, KH |
| Persönliche Erklärungen schreiben | Zugang, eGK, SMC-B oder HBA | `notfalldaten` | KH (Schreiben mit SMC-B) |
| Notfalldaten lesen | Zugang, eGK, HBA oder SMC-B (freigeschaltet) | `notfalldaten` | KH |
| Medikationsplan erstellen/aktualisieren | Zugang, eGK, HBA oder SMC-B (freigeschaltet) | `emp` | gemILF_PS_AMTS, gemSysL_AMTS_A |
| Medikationsplan auslesen | Zugang, eGK, HBA oder SMC-B (freigeschaltet) | `emp` | gemSysL_AMTS_A |
| VSDM-Prüfung anstoßen | Zugang, TI, eGK, SMC-B oder HBA, VSDM | `vsdm` | gemSysL_VSDM, gemILF_PS |
| TIM-Nachricht senden | TI-Messenger-Client, TI-Messenger-FD, Organisation per SMC-B registriert | `tim` | gemSpec_TI-M_Basis, FP TI-Messenger |

\* Modus Einfach: KIM-Clientmodul wird als Teil des Primärsystems
angenommen (Vereinfachung).

**Arbeitsplatz-PC und Visite-Tablet** bieten die Aktionen des
Primärsystems an, an dem sie hängen (Arbeitsplatz im Infomodell,
gemILF_PS). **RIS und LIS** bieten nur „Befund in die ePA hochladen“
und „Arztbrief per KIM senden“ (plausibel, KH).

### 6.2 AVS (Apotheke)

| Aktion | Voraussetzungen | Ablauf | Quelle |
|---|---|---|---|
| eRezept einlösen (eGK einlesen) | Zugang, TI, SMC-B, eGK, E-Rezept, IDP | `erezeptEinloesen` | gemF_eRp_Autorisierung_Apo, FP E-Rezept Apotheken |
| eRezept einlösen (Rezeptcode scannen) | Zugang, TI, SMC-B, E-Rezept, IDP | `erezeptEinloesen` | FP E-Rezept Apotheken |
| Medikationsplan auslesen | Zugang, eGK, SMC-B (freigeschaltet) | `emp` | gemSysL_AMTS_A |
| ePA-Medikationsliste einsehen | Zugang, TI, SMC-B, Befugnis, ePA | `epa` | gemSpec_Aktensystem_ePAfueralle |

### 6.3 Pflege-Software

| Aktion | Voraussetzungen | Ablauf | Quelle |
|---|---|---|---|
| Dokument in die ePA hochladen / einsehen | Zugang, TI, SMC-B, Befugnis, ePA | `epa` | gematik Pflege-FAQ, gemSpec_Aktensystem_ePAfueralle |
| KIM-Nachricht senden | Zugang, TI, KIM | `kim` | gematik Pflege-FAQ, gemSpec_CM_KOMLE |
| TIM-Nachricht senden | wie 6.1 | `tim` | gematik Pflege-FAQ |

### 6.4 Kartenterminals

| Aktion | Voraussetzungen | Ablauf | Quelle |
|---|---|---|---|
| Karte stecken / ziehen | freie Kartenart (K-2) | Dialog | gemSpec_KT |
| eGK einlesen / VSDM-Prüfung | wie VSDM-Prüfung (6.1) | `vsdm` | gemSysL_VSDM |
| Notfalldaten / Medikationsplan schreiben oder lesen | wie 6.1 | `notfalldaten`, `emp` | gemSpec_FM_NFDM, gemILF_PS_AMTS |
| Mobiles KT: eGK offline einlesen | eGK im mobilen KT | `mobkt` | gemSpec_MobKT |
| Mobiles KT: Daten ans Primärsystem übergeben | USB-Verbindung zum Primärsystem | `mobkt` | gemSpec_MobKT |
| CardLink: eGK per Smartphone einlesen (VSDM) | eGK per NFC, CardLink am Zugang, VSDM | `cardlinkVsdm` | gemSpec_eHealth-CardLink |

### 6.5 Versicherte

| Aktion | Voraussetzungen | Ablauf | Quelle |
|---|---|---|---|
| E-Rezept-App: Rezepte abrufen | Internet, sektoraler IDP (GesundheitsID) oder eGK per NFC, E-Rezept | `app` | gemSpec_eRp_FdV, gemSpec_IDP_Sek |
| ePA-App: Akte ansehen, Befugnis verwalten | Internet, sektoraler IDP, ePA | `app` | gemSpec_Aktensystem_ePAfueralle, gemSpec_IDP_Sek |

### 6.6 Alle Geräte

- Details anzeigen (FR-11)
- Ausfall simulieren / wieder in Betrieb nehmen (Mockup, FR-18)
- Einstellungen öffnen, nur Modus Erweitert (FR-17)

## 7. Abläufe

Rollen: P = Primärsystem, CM = KIM-Clientmodul, K = Konnektor/TI-Gateway,
T = Kartenterminal, V = VPN-Zugangsdienst. Erklärtexte je Schritt
stehen im Mockup und werden in den Katalog übernommen.

| Ablauf | Schritte (Protokoll) | Status | Quelle |
|---|---|---|---|
| `erezept` | P→K Verordnung (SOAP/TLS) · K→T Signaturauftrag (SICCT) · T→K HBA signiert, QES (ISO 7816) · K→V (IPsec) · V→IDP Anmeldung mit SMC-B (OAuth 2.0) · V→E-Rezept (FHIR) · E-Rezept→P Rezept-ID | bestätigt | gemSpec_FD_eRp, gemSpec_KT, Arch |
| `vsdm` | P→K ReadVSD (SOAP) · K→T eGK lesen (SICCT) · T→K Kartendaten · K→V · V→VSDM Abgleich, Prüfziffer · K→P Daten und Prüfungsnachweis | bestätigt | gemSysL_VSDM, gemILF_PS |
| `notfalldaten` | P→K Fachmodul NFDM (SOAP/TLS) · K→T Schreib-/Leseauftrag (SICCT) · T→K eGK bestätigt · K→P, **ohne VPN und ohne Fachdienst** | bestätigt | gemSpec_FM_NFDM |
| `emp` | P→K Fachmodul AMTS (ReadMP/WriteMP) · K→T C2C-Authentisierung HBA/SMC-B mit eGK, eGK-PIN · T→K · K→P, **ohne VPN und ohne Fachdienst** | bestätigt | gemSysL_AMTS_A, gemILF_PS_AMTS |
| `eau` | P→CM eAU (SMTP) · CM→K Signatur und Verschlüsselung · K→T HBA signiert (QES) · CM→V→KIM (mTLS) · KIM→Krankenkasse · Krankenkasse→KIM→P Quittung | bestätigt | gemSpec_CM_KOMLE, PM eAU, KIM-DK |
| `kim` | wie `eau` ohne HBA-Signatur, Empfänger aus dem VZD | plausibel | gemSpec_CM_KOMLE, gemSpec_VZD_FHIR_Directory |
| `epa` | P→K · K→V · V→IDP (SMC-B) · Befugnis prüfen (eGK oder PoPP) · V→ePA (VAU, FHIR) · ePA→P | bestätigt | gemILF_PS_ePA, gemSpec_Aktensystem_ePAfueralle |
| `tim` | Client→TI-Messenger-FD (Matrix, Internet) · FD→FD des Empfängers (Föderation über VZD) · Zustellung | plausibel | gemSpec_TI-M_Basis |
| `erezeptEinloesen` | P→K · K→T eGK lesen (entfällt beim Rezeptcode) · K→V · V→IDP (SMC-B) · V→E-Rezept Abruf · E-Rezept→P | bestätigt | gemF_eRp_Autorisierung_Apo |
| `cardlinkVsdm` | eGK→Smartphone (NFC, CAN) · Smartphone→CardLink (Internet) · CardLink→K wie Kartenterminal · K→V→VSDM · K→P | bestätigt | gemSpec_eHealth-CardLink |
| `mobkt` | eGK→Mobiles KT (offline lesen, speichern) · später Mobiles KT→P per USB (CT-API) | bestätigt | gemSpec_MobKT |
| `app` | App→Internet→sektoraler IDP (GesundheitsID) · App→E-Rezept-FD bzw. ePA | bestätigt | gemSpec_eRp_FdV, gemSpec_IDP_Sek |

Rollenbindung: Knoten werden über den tatsächlichen Pfad vom
auslösenden Gerät bestimmt (Spec FR-8), nicht über „erstes passendes
Gerät der Topologie“ wie im Mockup.

## 8. Konfiguration im Modus Erweitert

| Einstellung | Standard | Regel | Status | Quelle |
|---|---|---|---|---|
| IP-Adresse | Router .1, Konnektor .2, sonst ab .10 im Netz 192.168.10.0/24 | Beispielwerte | Vereinfachung | DVO |
| Netzmaske | 255.255.255.0 | keine | Vereinfachung | DVO |
| Betriebsart Konnektor | Parallel, wenn Router vorhanden, sonst Reihe | Reihe: Konnektor zwischen LAN und Router. Parallel: Konnektor als Gerät im LAN, Router führt ins Internet | bestätigt | Betriebsarten, gemSpec_Kon (ANLW_ANBINDUNGS_MODUS) |
| Gateway der Clients | Reihe: Konnektor. Parallel: Router | keine | bestätigt | Betriebsarten, DVO |
| Route in die TI (Parallel) | 100.102.0.0/15 über den Konnektor | für offene Fachdienste und WANDA | bestätigt | gemILF_PS (Abschnitt 3.2.3), gemSpec_Net |
| Bestandsnetze | Routen laut Konnektor | aktive Bestandsnetze aus der Konnektor-Oberfläche | bestätigt | DVO |
| DNS der Clients | Konnektor | TI-Namen löst der Konnektor auf | plausibel | gemILF_PS, gemSpec_Net |
| SIS | aus | Reihe: Internet über SIS möglich. Parallel: SIS optional, Clients alternativ direkt über den Router (ANLW_INTERNET_MODUS) | bestätigt | gemSpec_Kon |
| DHCP | aus | Konnektor kann DHCP-Server sein | plausibel | gemSpec_Kon |
| VLAN | „TI“ | Geräte müssen im selben Segment wie der Konnektor liegen | Vereinfachung | DVO |
| Arbeitsplatz | „AP-1“ | jedem Arbeitsplatz ist im Normalfall ein Kartenterminal zugeordnet. Aufrufe tragen Mandant, Clientsystem, Arbeitsplatz | bestätigt | gemILF_PS |
| Pairing KT | ja | ohne Pairing führt der Konnektor nur eingeschränkte Kommandos aus | bestätigt | gemSpec_KT |
| Zertifikat gSMC-K | gültig bis 31.03.2029 | authentisiert den Konnektor gegenüber VPN-Zugangsdienst, KT und HBA | bestätigt | Arch, gemF_Laufzeitverlängerung_gSMC-K |
| Zeitabweichung | 0 s | Grenzwert NTP_MAX_TIMEDIFFERENCE = 3600 s | bestätigt | gemSpec_Kon |
| Tage ohne Zeitsynchronisation | 0 | Warnung nach 30 Tagen, kritischer Zustand nach 50 Tagen | bestätigt | gemSpec_Kon (NTP_WARN_PERIOD, NTP_GRACE_PERIOD) |
| Kritisches Update eingespielt | ja | fehlt es nach Frist, baut der Konnektor keinen VPN-Tunnel mehr auf | bestätigt | Arch |
| IPsec an der Router-Firewall | erlaubt | UDP 500/4500 für den VPN-Tunnel | plausibel | gemSpec_VPN_ZugD |

Hostnamen der Dienste aus dem Mockup (`*.splitdns.ti-dienste.de` u. a.)
werden **nicht** übernommen: Split-DNS wird laut gematik zurückgebaut
(C_12389). Anzeigenamen kommen ohne konkrete Hostnamen aus. Quelle:
gemILF_PS (Änderung C_12389).

## 9. Prüfregeln für die Sicherheitsprüfung

Schwere: **Fehler**, **Warnung**, **Hinweis**. „E“ = nur im Modus
Erweitert.

**Zustand**

| ID | Regel | Schwere | Status | Quelle |
|---|---|---|---|---|
| P-1 | Gerät ist ausgefallen | Fehler | Vereinfachung | keine (Simulation) |
| P-2 | Verbindung ist unterbrochen | Fehler | Vereinfachung | keine (Simulation) |
| P-3 | Gesteckte Karte ist abgelaufen | Fehler | bestätigt | gemSpec_PKI |
| P-4 | Kein Konnektor und kein TI-Gateway | Warnung | bestätigt | Arch |
| P-5 | Kartenterminal erreicht seinen Konnektor nicht | Warnung | bestätigt | gemSpec_KT |
| P-6 | WLAN im selben Segment wie Kartenterminal oder Konnektor | Warnung | plausibel | DVO |
| P-7 | Gerät ist mit nichts verbunden | Hinweis | Vereinfachung | keine |
| P-31 | Kartenterminal mit mehr als einem Konnektor verbunden | Fehler | bestätigt | gemSpec_KT |
| P-32 | Konnektor und TI-Gateway in derselben Topologie | Fehler | bestätigt | X-1 |

**Adressierung (E)**

| ID | Regel | Schwere | Status | Quelle |
|---|---|---|---|---|
| P-8 | Ungültige IP-Adresse | Fehler | Vereinfachung | keine (Netzwerkgrundlagen) |
| P-9 | IP-Konflikt | Fehler | Vereinfachung | keine |
| P-10 | Ungültige Subnetzmaske | Fehler | Vereinfachung | keine |
| P-11 | Netz- oder Broadcast-Adresse als Geräteadresse | Fehler | Vereinfachung | keine |
| P-12 | Ungültiges Gateway | Fehler | Vereinfachung | keine |
| P-13 | Gateway nicht im eigenen Subnetz | Fehler | Vereinfachung | keine |
| P-14 | Gateway gibt es im Netz nicht | Fehler | Vereinfachung | keine |
| P-15 | Gerät in anderem Subnetz als sein Konnektor | Fehler | plausibel | DVO |

P-8 bis P-14 sind allgemeine Netzwerkregeln ohne TI-Bezug. Sie brauchen
keinen gematik-Beleg.

**Betrieb (E)**

| ID | Regel | Schwere | Status | Quelle |
|---|---|---|---|---|
| P-16 | Kritisches Konnektor-Update nicht eingespielt, deshalb kein VPN-Tunnel | Fehler | bestätigt | Arch |
| P-17 | Zeitabweichung des Konnektors über 3600 s führt zum Fehlerzustand | Fehler | bestätigt | gemSpec_Kon (NTP_MAX_TIMEDIFFERENCE) |
| P-17a | Keine Zeitsynchronisation seit 30 Tagen (Warnung) bzw. 50 Tagen (kritisch) | Warnung / Fehler | bestätigt | gemSpec_Kon |
| P-18 | Zertifikat der gSMC-K abgelaufen | Fehler | bestätigt | Arch, gemF_Laufzeitverlängerung_gSMC-K |
| P-19 | Parallelbetrieb ohne Firewall. Der Konnektor schützt das LAN dann nicht vor dem Internet | Warnung | bestätigt | Betriebsarten |
| P-20 | Parallelbetrieb ohne Router | Fehler | bestätigt | Betriebsarten |
| P-21 | Router-Firewall blockiert IPsec, deshalb kein VPN-Tunnel | Fehler | plausibel | gemSpec_VPN_ZugD |
| P-22 | HBA oder SMC-B nicht freigeschaltet | Fehler | bestätigt | gemILF_PS_AMTS, gemILF_PS |
| P-23 | DHCP aktiv, aber kein DHCP-Server im Segment | Fehler | Vereinfachung | gemSpec_Kon |
| P-24 | Gerät in anderem VLAN als der Konnektor | Fehler | Vereinfachung | DVO |
| P-25 | Reihenbetrieb: Gateway eines Clients ist nicht der Konnektor | Fehler | bestätigt | Betriebsarten |
| P-26 | Parallelbetrieb: Gateway eines Clients ist nicht der Router | Fehler | bestätigt | Betriebsarten |
| P-27 | Parallelbetrieb: Client ohne Route 100.102.0.0/15 über den Konnektor | Fehler | bestätigt | gemILF_PS |
| P-28 | DNS eines Clients ist nicht der Konnektor | Fehler | plausibel | gemILF_PS |
| P-29 | Arbeitsplatz eines Clients keinem Kartenterminal zugeordnet | Fehler | bestätigt | gemILF_PS |
| P-30 | Kartenterminal nicht gepairt, Karten darin sind unsichtbar | Fehler | bestätigt | gemSpec_KT |

**Geändert gegenüber dem Mockup:** P-16 (statt „Firmware älter als 5“),
P-17 (3600 s statt 5 Minuten), P-19 (SIS im Parallelbetrieb ist erlaubt,
die Regel prüft jetzt die fehlende Firewall). Neu: P-17a, P-31, P-32.

## 10. Herausforderungen

Grundlage ist das Preset Arztpraxis. Gelöst ist eine Herausforderung,
wenn ihre Prüfregeln nicht mehr anschlagen.

| Nr. | Titel | Eingebaute Fehler | Verletzte Regeln |
|---|---|---|---|
| 1 | Kein Rezept am Empfang | PVS in falschem Subnetz | P-13, P-15 |
| 2 | Montagmorgen | KT 1 mit doppelter IP, KT 2 mit Broadcast-Adresse | P-9, P-11 |
| 3 | Nach dem Umzug | PVS mit falschem Gateway und /16-Maske, KT 1 nicht gepairt | P-14, P-25, P-30 |
| 4 | Schnelles Internet | Router ergänzt, Konnektor parallel, PVS ohne TI-Route und mit fremdem DNS, Firewall blockiert IPsec | P-27, P-28, P-21 |
| 5 | Totalausfall | wie 4, dazu Zeitabweichung **75 min** (Mockup: 14 min, liegt unter dem Grenzwert), KT 1 nicht gepairt, HBA nicht freigeschaltet, Arbeitsplatz falsch zugeordnet, IP-Konflikt KT 2 | P-17, P-21, P-22, P-27 bis P-30, P-9 |

## 11. Sichtbarkeit je Modus

| Modus | Sichtbar |
|---|---|
| **Einfach** | Komponenten mit Modus E (Abschnitt 1). Verbindungen mit Modus E (4.2), dabei vereinfachte Direktverbindungen (Konnektor direkt zum VPN-Zugangsdienst, VPN-Zugangsdienst direkt zum Fachdienst). Prüfregeln ohne „E“ |
| **Erweitert** | alle Komponenten, Anschlüsse, Einstellungen (Abschnitt 8) und Prüfregeln. Vereinfachte Direktverbindungen bleiben erlaubt, die Sicherheitsprüfung weist aber auf den realen Weg hin (Hinweis) |

Status: offen (Vorschlag), Grundlage FR-13.

## 12. Offene Fragen

**Entschieden bzw. durch Quellen geklärt**

- [x] Verbots- oder Erlaubnisliste: Erlaubnisliste entscheidet (4.0).
- [x] NFDM/eMP laufen über die Fachmodule im Konnektor, ohne VPN und
  Fachdienst (gemSpec_FM_NFDM, gemSysL_AMTS_A). **Spec ist angepasst.**
- [x] Mobiles KT arbeitet offline, Übergabe per USB (gemSpec_MobKT).
- [x] SIS im Parallelbetrieb ist erlaubt (gemSpec_Kon), P-19 ist umgebaut.
- [x] TI-Route 100.102.0.0/15 ist korrekt (gemILF_PS).
- [x] Zeitgrenzwert 3600 s statt 5 Minuten (gemSpec_Kon).
- [x] eMP lesen und schreiben braucht eGK und HBA oder SMC-B
  (gemSysL_AMTS_A). Das AVS braucht für eMP die SMC-B.
- [x] VSDM braucht neben der eGK die SMC-B oder den HBA (gemSysL_VSDM).
- [x] KIM-Clientmodul und Krankenkasse sind im Ablauf `eau` ergänzt.

- [x] **IDP-Weg:** über Konnektor und TI (entschieden 2026-11-03, bis
  ein Beleg etwas anderes zeigt). Quelle für die Rolle des IDP:
  gemSpec_IDP_FD.
- [x] **TI-Messenger-Weg:** Client über das Internet zum
  TI-Messenger-Fachdienst (entschieden 2026-11-03). Quelle:
  gemSpec_TI-M_Basis.
- [x] **Karten:** Zustand des Kartenterminals, keine eigenen Knoten
  (entschieden 2026-11-03, Plan D12 angepasst).
- [x] **PoPP und VSDM 2.0:** in v1 nur als Komponente im Modus
  Erweitert, ohne eigenen Ablauf (entschieden 2026-11-03).
- [x] **Preset Klinikum:** aus dem Mockup übernommen (Abschnitt 13).

**Noch offen**

- [ ] **Weg von CardLink zum Konnektor:** Netzweg in gemSpec_eHealth-CardLink
  Kapitel 6.3 nachlesen.
- [ ] Belege für V-17 (Konnektor an Konnektor) und die Portanzahlen der
  LAN-Geräte (Vereinfachung).
- [ ] Gültigkeit der eAU-Dienstkennungen ab 2026 prüfen (KIM-DK).

## 13. Presets

Jedes Preset ist eine fertig verbundene Topologie nach der
Erlaubnisliste. Karten stecken bereits, damit Aktionen sofort
ausführbar sind. Grundlage ist das Mockup, Abweichungen sind markiert.

| Preset | Name im Mockup | Geräte | Karten | Abweichung vom Mockup |
|---|---|---|---|---|
| Arztpraxis | Arztpraxis Dr. Behrens | 1 PVS, 2 eHealth-KT, 1 Switch, 1 Konnektor, 1 VPN-Zugangsdienst. Dienste: IDP, VSDM, E-Rezept, KIM, TI-Messenger, ePA | KT 1: SMC-B, **HBA**. KT 2: eGK | HBA ergänzt, sonst ist „eRezept ausstellen“ nicht ausführbar (6.1) |
| Apotheke | Apotheke am Markt | 1 AVS, 1 eHealth-KT, 1 Switch, 1 Konnektor, 1 VPN-Zugangsdienst. Dienste: IDP, E-Rezept, **ePA** | KT: SMC-B, eGK | ePA ergänzt für „ePA-Medikationsliste einsehen“ (6.2) |
| Krankenhaus | Kreiskrankenhaus Nord, TI 2.0 | 1 KIS, 2 Arbeitsplatz-PCs, 2 eHealth-KT, 2 Switches, 2 Router, 1 TI-Gateway, 1 VPN-Zugangsdienst. Dienste: IDP, VSDM, E-Rezept, KIM, TI-Messenger, ePA | KT 1: eGK, SMC-B. KT 2: HBA | keine. Zeigt das TI-Gateway statt Konnektor (X-1) |
| Klinikum | Klinikum St. Anna | 1 KIS, 6 Arbeitsplatz-PCs, 1 Visite-Tablet, RIS, LIS, 3 eHealth-KT, 6 Switches, 1 Access Point, 1 Router, 1 Highspeed-Konnektor, 1 VPN-Zugangsdienst. Dienste: IDP, VSDM, E-Rezept, KIM, TI-Messenger, ePA. Zonen: Notaufnahme, Station Innere (WLAN), Radiologie, Labor | KT: eGK, HBA · HBA · eGK, SMC-B | keine |

Quelle: Mockup (`design/mockup/TI Visualizer.dc.html`, `PRESETS`). Belege
für die einzelnen Verbindungen siehe Abschnitt 4.2.
