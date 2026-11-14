# Quellen 001: TI Visualizer

**Stand:** 2026-11-03
**Bezug:** [regelwerk.md](./regelwerk.md)

Fachliche Quellen sind ausschließlich offizielle Veröffentlichungen der
gematik (gematik.de, fachportal.gematik.de, gemspec.gematik.de). Links
auf `…/latest/` zeigen immer auf die aktuell freigegebene Fassung.

> **Hinweis zu Versionen:** Die Versionsangaben stammen aus der Recherche
> und sind nicht einzeln gegen das Dokument geprüft. Vor dem Zitieren in
> der Bachelorarbeit Version und Datum auf gemspec.gematik.de bestätigen.

Spalte **Bezug**: Komponente, Anwendung oder Regel-ID im Regelwerk.

## 1. Übergreifend und Architektur

| Quelle | Inhalt | Bezug |
|---|---|---|
| [gematik-Fachportal](https://fachportal.gematik.de/) | Einstieg zu allen Anwendungen, Komponenten und Spezifikationen | allgemein |
| [Komponenten & Dienste](https://fachportal.gematik.de/hersteller-anbieter/komponenten-dienste) | Übersicht der zugelassenen Komponenten und Dienste | Komponentenkatalog |
| [Liste der Anwendungen](https://fachportal.gematik.de/anwendungen) | Übersicht der Fachanwendungen | Operationskatalog |
| [Architektur der TI-Plattform (gemKPT_Arch_TIP)](https://gemspec.gematik.de/downloads/gemKPT/gemKPT_Arch_TIP/gemKPT_Arch_TIP_V2.10.0.html) | Gesamtarchitektur: Konnektor, VPN-Zugangsdienst, zentrales Netz, Identitäten (gSMC-K) | Abschnitte 1, 4 |
| [Anschluss medizinischer Einrichtungen an die TI (gemInfo_Anschluss_TI_DVO, V2.4.0)](https://fachportal.gematik.de/fileadmin/Fachportal/DVO/gemInfo_Anschluss_TI_DVO_V2.4.0.pdf) | Installation in der Einrichtung: Netzaufbau, Konnektor, Kartenterminals | Abschnitte 2, 8 |
| [Infoblatt Betriebsarten des Konnektors](https://fachportal.gematik.de/fileadmin/Fachportal/Leistungserbringer/gematik_Infoblatt_Betriebsarten_des_Konnektors_web_20220615.pdf) | Reihen- und Parallelbetrieb, Schutzwirkung, Firewall | 8, P-19, P-20, P-25 bis P-27 |
| [Anschluss von Krankenhäusern an die TI (gemInfo_Anschluss_KH_TI, V1.4.2)](https://fachportal.gematik.de/fileadmin/Fachportal/Krankenhaeuser/gemInfo_Anschluss_KH_TI_V1.4.2.pdf) | Krankenhaus-Anbindung, Subsysteme, Zwei-Schlüssel-Prinzip, HBA für QES, SMC-B für NFDM | KIS, RIS, LIS, Aktionen 6.1 |
| [Konzept TI-Föderation](https://gemspec.gematik.de/docs/gemKPT/gemKPT_TI-Foderation/latest/) | Föderierte Identitäten in der TI 2.0 | IDP, GesundheitsID |
| [Zero-Trust-Architektur (gemKPT_Zero_Trust)](https://gemspec.gematik.de/docs/TI2.0/gemKPT_Zero_Trust/gemKPT_Zero_Trust_V1.0.0/) | Feinkonzept Zero Trust für die TI | TI-Gateway, TI 2.0 |
| [Spezifikation ZETA (Entwurf V1.2.0_CC)](https://gemspec.gematik.de/downloads/prereleases/Draft_ZETA_25_3/gemSpec_ZETA_V1.2.0_CC.pdf) | Zero Trust Access, Einordnung in die TI 2.0 (öffentlicher Entwurf) | TI 2.0 |
| [Whitepaper „Arena für digitale Medizin“ (TI 2.0)](https://www.gematik.de/media/gematik/Medien/Telematikinfrastruktur/Dokumente/gematik_Whitepaper_Arena_digitale_Medizin_TI_2.0_Web.pdf) | Zielbild TI 2.0, Hintergrund für TI-Gateway und Zero Trust | TI-Gateway |
| [Glossar der TI](https://fachportal.gematik.de/glossar) | Begriffsdefinitionen (PDF: [gemGlossar V5.2.0](https://fachportal.gematik.de/fileadmin/Fachportal/Glossar/gemGlossar_V5.2.0.pdf)) | Begriffe in Spec und App |
| [Spezifikationsübersicht](https://gemspec.gematik.de/docs/gemSpec/) | Verzeichnis aller Spezifikationen | allgemein |

## 2. Zugang zur TI und Netz

| Quelle | Inhalt | Bezug |
|---|---|---|
| [Fachportal: Konnektor / TI-Gateway](https://fachportal.gematik.de/hersteller-anbieter/komponenten-dienste/konnektor) | Konnektor, Highspeed-Konnektor, TI-Gateway | `kon`, `hskon`, `gateway`, X-1 |
| [Spezifikation Konnektor (gemSpec_Kon)](https://gemspec.gematik.de/docs/gemSpec/gemSpec_Kon/latest/) | Konnektor inkl. Anbindungsmodus (InReihe/Parallel), SIS, Infomodell, Kartenterminal-Verwaltung | `kon`, 8, P-17 bis P-20, P-29, P-30 |
| [Feature TI-Gateway (gemF_TI-Gateway)](https://gemspec.gematik.de/docs/gemF/gemF_TI-Gateway/gemF_TI-Gateway_V1.7.0/index.html) | Zugangsmodul, virtuelle HSK-Instanz je Nutzer, Zugang nur über VPN | `gateway` |
| [Feature Highspeed-Konnektor (gemF_Highspeed-Konnektor)](https://gemspec.gematik.de/docs/gemF/gemF_Highspeed-Konnektor/gemF_Highspeed-Konnektor_V1.2.0/) | Highspeed-Konnektor, Integration ins TI-Gateway | `hskon` |
| [Produkttypsteckbrief Highspeed-Konnektor](https://gemspec.gematik.de/docs/gemProdT/gemProdT_Kon_Highspeed/latest/) | verbindliche Dokumente und Versionen des HSK | `hskon` |
| [Produkttypsteckbrief Konnektor](https://gemspec.gematik.de/docs/gemProdT/gemProdT_Kon_PTV6/latest/index.html) | verbindliche Dokumente des Konnektors inkl. Fachmodule NFDM/AMTS | `kon` |
| [Übergreifende Spezifikation Netzwerk (gemSpec_Net)](https://gemspec.gematik.de/docs/gemSpec/gemSpec_Net/latest/) | Netz der TI, Adressräume, Namensdienst (DNS), Zeitdienst (NTP) | zentrale Dienste, P-17, P-27, P-28 |
| [Systemprozesse der dezentralen TI](https://gemspec.gematik.de/downloads/gemSpec/gemSpec_Systemprozesse_dezTI/gemSpec_Systemprozesse_dezTI_V1.0.0.html) | Prozesse in der Einrichtung (Konnektor, Terminals) | 8 |
| [Spezifikation VPN-Zugangsdienst (gemSpec_VPN_ZugD)](https://gemspec.gematik.de/docs/gemSpec/gemSpec_VPN_ZugD/latest/index.html) | VPN-Zugangsdienst, Routen zu TI-Diensten und Bestandsnetzen | `vpn`, V-12, P-21 |
| [Laufzeitverlängerung gSMC-K (gemF, Entwurf)](https://fachportal.gematik.de/fileadmin/Fachportal/Downloadcenter/Vorabveroeffentlichungen/VorabV_Konn_Maintenance_21.3/gemF_Laufzeitverlaengerung_gSMC-K_V1.0.0_CC.pdf) | Ablauf der gSMC-K-Zertifikate im Konnektor | P-18 |

## 3. Kartenterminals und Smartcards

| Quelle | Inhalt | Bezug |
|---|---|---|
| [Spezifikation eHealth-Kartenterminal (gemSpec_KT)](https://gemspec.gematik.de/docs/gemSpec/gemSpec_KT/latest/) | SICCT, Pairing mit dem Konnektor, nur ein Konnektor gleichzeitig | `kt`, K-1, P-30 |
| [Spezifikation Mobiles Kartenterminal (gemSpec_MobKT)](https://gemspec.gematik.de/docs/gemSpec/gemSpec_MobKT/latest/) | offline nutzbar (z. B. Hausbesuch), Datenübergabe ans Primärsystem per CT-API | `mkt` |
| [Fachportal: eHealth-CardLink](https://fachportal.gematik.de/hersteller-anbieter/komponenten-dienste/ehealth-cardlink) | CardLink als Dienst im Internet, E-Rezept-Einlösung in der Fernversorgung mit VSDM-Prüfungsnachweis | `cardlink` |
| [Spezifikation eHealth-CardLink](https://gemspec.gematik.de/docs/gemSpec/gemSpec_eHealth-CardLink/latest/) | eGK per Smartphone/NFC, Pairing wie KT, keine PIN-Prüfung über CardLink | `cardlink`, K-6 |
| [Implementierungsleitfaden eHealth-CardLink](https://gemspec.gematik.de/docs/gemILF/gemILF_eHealth-CardLink/gemILF_eHealth-CardLink_V1.1.1/) | Einbindung ins Primärsystem | `cardlink` |
| [Objektsystem eGK G2.1](https://gemspec.gematik.de/downloads/gemSpec/gemSpec_eGK_ObjSys_G2_1/gemSpec_eGK_ObjSys_G2_1_V4.5.0.pdf) | Aufbau der eGK, Datenbereiche | `egk` |
| [Objektsystem HBA](https://gemspec.gematik.de/docs/gemSpec/gemSpec_HBA_ObjSys/latest/) | Aufbau des HBA, Signatur | `hba` |
| [Objektsystem SMC-B G2.1](https://gemspec.gematik.de/downloads/gemSpec/gemSpec_SMC-B_ObjSys_G2_1/gemSpec_SMC-B_ObjSys_G2_1_V5.2.0.pdf) | Aufbau der SMC-B | `smcb` |

## 4. Primärsysteme

| Quelle | Inhalt | Bezug |
|---|---|---|
| [Implementierungsleitfaden Primärsysteme (gemILF_PS)](https://gemspec.gematik.de/docs/gemILF/gemILF_PS/latest/) | Infomodell: Mandant, Clientsystem, Arbeitsplatz, Kartenterminal, Aufrufkontext | Primärsysteme, P-29 |
| [Implementierungsleitfaden PS NFDM](https://gemspec.gematik.de/docs/gemILF/gemILF_PS_NFDM/latest/) | Notfalldaten aus Sicht des Primärsystems | NFDM-Aktionen |
| [Implementierungsleitfaden PS AMTS/eMP](https://gemspec.gematik.de/downloads/gemILF/gemILF_PS_AMTS/gemILF_PS_AMTS_V1.6.0.html) | Medikationsplan aus Sicht des Primärsystems | eMP-Aktionen |
| [Implementierungsleitfaden PS AMTS V1.7.0 (PDF)](https://fachportal.gematik.de/fileadmin/Fachportal/Downloadcenter/Implementierungsleitfaeden/gemILF_PS_AMTS_V1.7.0.pdf) | HBA oder SMC-B im „erhöhten Sicherheitszustand“, eGK-PIN als Einwilligung | K-4, K-7, eMP |
| [Änderung C_12389: Rückbau Split-DNS](https://gemspec.gematik.de/downloads/prereleases/Draft_ILF_PS_25_1/C_12389_Anlage_V1.0.0.html) | Split-DNS wird zurückgebaut | Abschnitt 8 |
| [Implementierungsleitfaden PS ePA](https://gemspec.gematik.de/docs/gemILF/gemILF_PS_ePA/latest/) | ePA aus Sicht des Primärsystems | ePA-Aktionen, Ablauf `epa` |
| [Implementierungsleitfaden PS E-Rezept (gemILF_PS_eRp)](https://gemspec.gematik.de/docs/gemILF/gemILF_PS_eRp/latest/) | Konnektor routet zu IDP und E-Rezept-Fachdienst, das Primärsystem spricht selbst mit dem Fachdienst | Abschnitt 3, Ablauf `erezept` |

## 5. Fachanwendungen und Fachdienste

| Quelle | Inhalt | Bezug |
|---|---|---|
| [Fachportal: VSDM](https://fachportal.gematik.de/anwendungen/versichertenstammdaten-management) | Versichertenstammdatenmanagement | `vsdm`, Ablauf `vsdm` |
| [Systemlösung VSDM (gemSysL_VSDM V1.5.0)](https://www.ina.gematik.de/fileadmin/user_upload/gemSysL_VSDM_V1.5.0.pdf) | ReadVSD, Prüfungsnachweis, SMC-B/HBA als Eingabe | Ablauf `vsdm` |
| [Spezifikation VSDM 2.0](https://gemspec.gematik.de/docs/gemSpec/gemSpec_VSDM_2/latest/) | VSDM 2.0, Abruf nur mit PoPP-Token, über Zero Trust | `vsdm`, PoPP |
| [Spezifikation PoPP-Service](https://gemspec.gematik.de/docs/gemSpec/gemSpec_PoPP_Service/latest/) | Nachweis des Behandlungskontexts, löst VSDM-Prüfungsnachweis ab | PoPP (neu) |
| [gematik News: Spezifikation PoPP-Dienst](https://www.gematik.de/newsroom/news-detail/gruenes-licht-fuer-spezifikation-des-popp-dienstes) | Einordnung PoPP | PoPP (neu) |
| [Infoveranstaltung VSDM 2.0, ZETA, PoPP (16.09.2025)](https://fachportal.gematik.de/fachportal-import/files/2025_09_16_VSDM_ZETA_PoPP_Primaersystem_Infoveranstaltung.pdf) | Zusammenspiel VSDM 2.0, Zero Trust, PoPP aus Primärsystemsicht | VSDM, PoPP |
| [Fachportal: NFDM](https://fachportal.gematik.de/anwendungen/notfalldaten-management) | Notfalldatenmanagement | NFDM-Aktionen |
| [Fachmodul NFDM (gemSpec_FM_NFDM)](https://gemspec.gematik.de/downloads/gemSpec/gemSpec_FM_NFDM/gemSpec_FM_NFDM_V1.6.0.html) | Fachmodul NFDM ist Teil des Konnektors | Ablauf `notfalldaten`, Regelwerk 12 |
| [Fachportal: eMP](https://fachportal.gematik.de/anwendungen/elektronischer-medikationsplan) | Elektronischer Medikationsplan | eMP-Aktionen |
| [gematik-Präsentation eMP und NFDM für PVS-Hersteller (2020)](https://fachportal.gematik.de/fileadmin/user_upload/fachportal/files/Veranstaltungen/Industrieforum_PVS-Hersteller_19.02.2020/20200219_Infoveranstaltung_Primaersystemhersteller_NFDM_eMP.pdf) | Architektur NFDM/eMP, Rolle des Konnektors | Regelwerk 12 |
| [Systemlösung AMTS (gemSysL_AMTS_A V1.3.0)](https://gemspec.gematik.de/docs/gemSysL/gemSysL_AMTS_A/gemSysL_AMTS_A_V1.3.0/) | ReadMP/WriteMP mit C2C-Authentisierung HBA/SMC-B | Ablauf `emp` |
| [Spezifikation E-Rezept-Fachdienst (gemSpec_FD_eRp)](https://gemspec.gematik.de/docs/gemSpec/gemSpec_FD_eRp/latest/index.html) | E-Rezept-Fachdienst, Anbindung an den IDP | `erp`, Ablauf `erezept` |
| [E-Rezept-Frontend des Versicherten](https://gemspec.gematik.de/docs/gemSpec/gemSpec_eRp_FdV/latest/index.html) | E-Rezept-App | Versicherten-Apps (neu) |
| [gematik: ePA für alle in Praxen (Folien)](https://www.gematik.de/media/gematik/Medien/Veranstaltungen/Folien/gematik_digital_epa-fuer-alle-Praxen.pdf) | Befugnis nach VSDM-Prüfung: 90 Tage | Baustein Befugnis |
| [gematik: ePA für alle, Leitfaden Apotheken](https://www.gematik.de/media/gematik/Medien/ePA_fuer_alle/04_Apotheken/gematik_ePAfuerAlle_Apotheken_Leitfaden_Logo.pdf) | Befugnis in der Apotheke: 3 Tage | Baustein Befugnis, 6.3 |
| [gematik: E-Rezept in Apotheken](https://www.gematik.de/anwendungen/e-rezept/apotheken) | Einlösen per eGK oder Rezeptcode | AVS-Aktionen |
| [Feature E-Rezept Autorisierung Apotheken (gemF_eRp_Autorisierung_Apo V1.1.1)](https://fachportal.gematik.de/fileadmin/Fachportal/Downloadcenter/Releases/Release_einzelner_Produkttypen_Anwendungstypen/gemF_eRp_Autorisierung_Apo_V1.1.1.pdf) | Abruf von E-Rezepten in der Apotheke per eGK | Ablauf `erezeptEinloesen` |
| [Spezifikation Aktensystem ePA für alle](https://gemspec.gematik.de/docs/gemSpec/gemSpec_Aktensystem_ePAfueralle/latest/) | ePA-Aktensystem, Befugnis per eGK oder PoPP | `epa`, Ablauf `epa` |
| [Release ePA für alle](https://gemspec.gematik.de/releases/ePA_fuer_alle/) | Dokumentensatz ePA für alle | `epa` |
| [gematik: KIM](https://www.gematik.de/anwendungen/kim/faq) | KIM für Einrichtungen, FAQ | `kim` |
| [Spezifikation KOM-LE-Clientmodul (gemSpec_CM_KOMLE)](https://gemspec.gematik.de/docs/gemSpec/gemSpec_CM_KOMLE/latest/index.html) | KIM-Clientmodul: Signieren, Verschlüsseln, Zugang zum Fachdienst | KIM-Clientmodul (neu) |
| [Spezifikation KOM-LE-Fachdienst (gemSpec_FD_KOMLE)](https://gemspec.gematik.de/docs/gemSpec/gemSpec_FD_KOMLE/latest/) | KIM-Fachdienst | `kim` |
| [Fachverfahren und Dienstkennungen KIM](https://fachportal.gematik.de/test-und-serviceprodukte/fachverfahren-und-dienstkennungen-kim) | eAU-Dienstkennungen, Empfänger Krankenkasse | Ablauf `eau`, Krankenkasse (neu) |
| [gematik-Pressemitteilung eAU](https://www.gematik.de/newsroom/news-detail/pressemitteilung-krankmeldung-an-krankenkasse-jetzt-digital) | eAU per KIM an die Krankenkasse, Adresse über IK | Ablauf `eau` |
| [gematik: TI-Messenger](https://www.gematik.de/anwendungen/ti-messenger) | TI-Messenger im Überblick | `tim` |
| [Fachportal: TI-Messenger](https://fachportal.gematik.de/anwendungen/ti-messenger) | Registrierung von Organisationen per SMC-B | TIM-Aktion |
| [gematik: Pflege-FAQ](https://www.gematik.de/pflege/faq) | TI-Anbindung und Anwendungen in der Pflege | `pflege` |
| [Spezifikation TI-Messenger Basis (gemSpec_TI-M_Basis)](https://gemspec.gematik.de/docs/gemSpec/gemSpec_TI-M_Basis/latest/) | Matrix-Protokoll, Föderation über den VZD | `tim`, Ablauf `tim` |

## 6. Identität, Verzeichnis und PKI

| Quelle | Inhalt | Bezug |
|---|---|---|
| [Spezifikation IDP für Fachdienste (gemSpec_IDP_FD)](https://gemspec.gematik.de/downloads/gemSpec/gemSpec_IDP_FD/gemSpec_IDP_FD_V2.1.0.pdf) | Fachdienst als Relying Party, ACCESS_TOKEN | `idp`, Abläufe `erezept` und `epa` |
| [Produkttypsteckbrief IDP-Dienst](https://gemspec.gematik.de/docs/gemProdT/gemProdT_IDP-Dienst/latest/index.html) | verbindliche Dokumente des zentralen IDP | `idp` |
| [Spezifikation Sektoraler IDP (gemSpec_IDP_Sek)](https://gemspec.gematik.de/docs/gemSpec/gemSpec_IDP_Sek/latest/) | GesundheitsID der Versicherten | GesundheitsID (neu) |
| [Fachportal: Verzeichnisdienst](https://fachportal.gematik.de/telematikinfrastruktur/komponenten-dienste/verzeichnisdienst) | Verzeichnisdienst im Überblick | VZD (neu) |
| [Spezifikation Verzeichnisdienst (gemSpec_VZD)](https://gemspec.gematik.de/docs/gemSpec/gemSpec_VZD/latest/index.html) | VZD, benötigt DNS, NTP, OCSP | VZD (neu) |
| [Spezifikation VZD-FHIR-Directory](https://gemspec.gematik.de/docs/gemSpec/gemSpec_VZD_FHIR_Directory/gemSpec_VZD_FHIR_Directory_V1.4.0/) | Adressbuch für KIM und TI-Messenger | VZD (neu) |
| [Spezifikation TSL-Dienst (gemSpec_TSL)](https://gemspec.gematik.de/docs/gemSpec/gemSpec_TSL/latest/index.html) | Vertrauensliste, OCSP-Responder | TSL/OCSP (neu), P-18 |
| [Spezifikation PKI (gemSpec_PKI)](https://gemspec.gematik.de/docs/gemSpec/gemSpec_PKI/latest/) | Zertifikatsprofile der TI | P-3, P-18 |

## 7. Weitere Quellen (nicht gematik)

| Quelle | Inhalt | Bezug |
|---|---|---|
| [KBV: Welche Dokumente stellen Praxen in die ePA ein?](https://www.kbv.de/praxis/tools-und-services/praxisnachrichten/2025/07-31/neue-serie-alles-nur-eine-frage-welche-dokumente-stellen-praxen-in-die-epa-ein) | eAU-Kopie in der ePA nur auf Wunsch. KBV ist Körperschaft des öffentlichen Rechts, kein Drittanbieter. Bei Gelegenheit durch eine gematik-Quelle ersetzen | ePA-Aktionen |

| [CGM MANAGED TI: Leistungsbeschreibung](https://www.cgm.com/_Resources/Persistent/dffee881638621deba286b19c37401f6f035b5e1/CGM%20MANAGED%20TI%20Leistungsbeschreibung.pdf) | Anbindung von Primärsystemen (vor Ort und in der Cloud) an die TI über ein Rechenzentrum. Anbieterunterlage, keine gematik-Quelle | SaaS, Schlüssel `CGM_ManagedTI` |
| [Concat TIaaS: Leistungsbeschreibung](https://www.concat.de/wp-content/uploads/2023/11/Concat_TIaaS_Leistungsbeschreibung_202311.pdf) | TI als Dienst im Rechenzentrum, Verbindung geht vom Endgerät aus. Anbieterunterlage, keine gematik-Quelle | SaaS, Schlüssel `Concat_TIaaS` |

## 8. Technik und Projekt (nicht fachlich)

| Quelle | Inhalt |
|---|---|
| [GitHub Blog: Spec-Driven Development mit Spec-Kit](https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/) | Vorgehensmodell des Projekts |
| [React Flow](https://reactflow.dev/) | Canvas-Framework |
| [GitHub-Datenschutzerklärung](https://docs.github.com/de/site-policy/privacy-policies/github-general-privacy-statement) | Hosting über GitHub Pages (Impressum) |

## 9. Erkenntnisse für das Regelwerk

Aus der Recherche. Eingearbeitet ins [Regelwerk](./regelwerk.md) am 2026-11-03 (Abschnitt 12 dort):

| Erkenntnis | Quelle | Auswirkung |
|---|---|---|
| Die Fachmodule NFDM und AMTS (eMP) sind fester Teil des Konnektors | gemSpec_FM_NFDM, Produkttypsteckbrief Konnektor | Mockup ist richtig: NFDM/eMP laufen über den Konnektor, aber ohne VPN und Fachdienst. Spec korrigieren |
| Der Konnektor verwaltet die Kartenterminals. Die gSMC-K authentisiert ihn gegenüber VPN-Zugangsdienst, Kartenterminal und HBA | gemKPT_Arch_TIP | stützt P-18 (Zertifikat gSMC-K) |
| Ein eHealth-KT braucht ein Pairing mit dem Konnektor und hält höchstens zu **einem** Konnektor gleichzeitig eine Verbindung | gemSpec_KT | stützt P-30 und die neue Regel G-4 (KT nur an einem Konnektor) |
| Ein Arbeitsplatz hat normalerweise genau ein Kartenterminal. Aufrufe tragen Mandant, Clientsystem und Arbeitsplatz | gemILF_PS | stützt P-29 (Infomodell) |
| Der Konnektor kennt zwei Anbindungsmodi: in Reihe vor dem Internet-Router oder parallel als Gerät im Netz. Im Parallelbetrieb schützt er nicht vor Angriffen aus dem Internet | gemSpec_Kon, Infoblatt Betriebsarten | stützt Abschnitt 8 und P-25 bis P-27 |
| SIS ist im Parallelbetrieb optional statt ausgeschlossen | gemSpec_Kon (Auszug) | P-19 umgebaut: prüft jetzt die fehlende Firewall |
| Der VPN-Zugangsdienst baut einen Tunnel ins TI-Netz und einen getrennten für SIS auf. Ohne kritisches Update baut der Konnektor keinen Tunnel mehr auf | gemKPT_Arch_TIP | stützt P-16 (kritisches Update) |
| Das mobile Kartenterminal arbeitet offline und übergibt Daten später ans Primärsystem | gemSpec_MobKT | mobiles KT offline, Übergabe per USB (Regelwerk 12) |
| eHealth-CardLink erlaubt keine PIN-Prüfung | gemSpec_eHealth-CardLink | neue Regel: kein HBA/SMC-B über CardLink, keine PIN-pflichtigen Aktionen |
| VSDM 2.0 und künftig ePA/E-Rezept nutzen PoPP-Token statt VSDM-Prüfungsnachweis | gemSpec_VSDM_2, PoPP | PoPP als Komponente aufnehmen |
| Der Fachdienst gibt die Anmeldung an den IDP ab (Relying Party) | gemSpec_FD_eRp | IDP über die TI (entschieden 2026-11-03) |
| Die Route 100.102.0.0/15 für offene Fachdienste und WANDA ist im Primärsystem einzurichten (gemILF_PS, Abschnitt 3.2.3) | gemILF_PS, gemSpec_Net | bestätigt P-27 |
| eAU geht per KIM an die Krankenkasse, deren Adresse über das Institutionskennzeichen gefunden wird | Pressemitteilung eAU, Dienstkennungen KIM | Krankenkasse als Gegenstelle, VZD im Ablauf `eau` |
| TI-Messenger nutzt Matrix, die Föderation läuft über den VZD | gemSpec_TI-M_Basis | VZD im Ablauf `tim` |
