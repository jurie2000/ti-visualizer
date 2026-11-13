# Prompt für das Mockup (Claude Design)

> **Historisch (Stand 2026-09):** Mit diesem Prompt ist das Mockup in
> `design/mockup/` entstanden. Er beschreibt nicht mehr den aktuellen
> Umfang. Maßgeblich sind das
> [Regelwerk](../docu/001-ti-visualizer-baukasten/regelwerk.md) und die
> [Architektur](../docu/001-ti-visualizer-baukasten/architektur.md).

Gestalte ein hochwertiges, klickbares UI-Mockup für den **TI Visualizer**, einen interaktiven Netzwerk-Baukasten zum Lernen der deutschen Telematikinfrastruktur (Gesundheitswesen). Nutzer bauen wie in Cisco Packet Tracer eine vereinfachte Landschaft aus Geräten, verbinden sie und sehen Abläufe Schritt für Schritt. Sprache der Oberfläche: nur Deutsch. Zielgerät: Desktop-Browser (1440 px), ein Tablet-Layout als Zusatz.

## Grundlayout (Hauptansicht)
- **Kopfleiste:** Projektname, Name der aktuellen Topologie, Buttons „Preset laden“, „Speichern“, „Laden“, „Exportieren/Importieren (JSON)“, Umschalter Hell/Dunkel.
- **Linke Palette:** Geräte gruppiert und einklappbar nach Kategorie, jedes Gerät mit Symbol und Label, per Drag&Drop oder Enter auf die Canvas.
  - Primärsysteme: PVS (Praxis), KIS (Krankenhaus), AVS (Apotheke)
  - Smartcards: eGK, HBA, SMC-B
  - Kartenterminals: eHealth-Kartenterminal, Mobiles Kartenterminal, eHealth-CardLink
  - Netzwerk: Konnektor, Highspeed-Konnektor, TI-Gateway, VPN-Zugangsdienst
  - Fachdienste: IDP, VSDM, E-Rezept, KIM, TI-Messenger, ePA-Aktensystem
- **Mitte: Canvas** mit Gitterhintergrund, Zoom, Minimap, Knoten und Verbindungen.
- **Rechtes Detailpanel** (ein-/ausblendbar): zeigt bei Auswahl eines Geräts oder einer Verbindung Protokoll, Port, TLS-Stufe, Datenformat und eine kurze Erklärung.
- **Untere Leiste: Simulations-Player** (nur aktiv, wenn eine Aktion läuft): Play/Pause, Schritt vor/zurück, Tempo-Regler, Abbrechen, Fortschrittsanzeige „Schritt 3 von 8“ und ein Erklärtext-Bereich für den aktuellen Schritt.

## Bildschirme und Zustände (bitte alle darstellen)
1. **Startansicht:** Leere Canvas mit Auswahl „Leer starten“ oder Preset „Arztpraxis“, „Apotheke“, „Krankenhaus“ (Karten mit Vorschau der Topologie).
2. **Arztpraxis-Preset geladen:** PVS, Konnektor, VPN-Zugangsdienst, 2 Kartenterminals, SMC-B, HBA, eGK, Fachdienste (VSDM, E-Rezept, KIM, IDP, ePA), sauber verbunden.
3. **Verbinden:** Quelle gewählt (hervorgehoben), Ziele in der Umgebung zeigen gültig/ungültig an.
4. **Ungültige Verbindung:** Erklärende Meldung, z. B. „Ein Primärsystem darf nicht direkt mit einem Fachdienst verbunden werden. Die Verbindung muss über Konnektor oder TI-Gateway und den VPN-Zugangsdienst laufen.“ Zweites Beispiel: „Konnektor und TI-Gateway schließen sich in einer Topologie gegenseitig aus.“
5. **Kontextmenü (Rechtsklick auf PVS):** Aktionen wie „eRezept ausstellen“, „eAU ausstellen und per KIM senden“, „In die ePA hochladen“, „VSDM-Prüfung anstoßen“, „TIM-Nachricht senden“. Einige Einträge **ausgegraut** mit Begründung („Kein HBA am Kartenterminal“).
6. **Kontextmenü Kartenterminal:** „Karte stecken“ (öffnet eine Auswahl freier Karten), „VSDM-Prüfung“, „Notfalldaten auf eGK schreiben“, „Medikationsplan schreiben/lesen“.
7. **Simulation läuft:** Ein Datenpaket wandert animiert entlang der Verbindungen (z. B. PVS → Konnektor → VPN → E-Rezept-Fachdienst), aktiver Knoten und aktive Kante hervorgehoben, Protokoll-Label an der Kante, Erklärtext unten. Bei NFDM/eMP läuft die Animation nur bis zur eGK (ohne Konnektor).
8. **Simulation abgebrochen / abgeschlossen:** Klare Rückmeldung mit Zusammenfassung.
9. **Detailpanel** für eine Kante (z. B. Konnektor → VPN-Zugangsdienst) mit Protokolltabelle.
10. **Speichern/Laden-Dialog** mit Liste gespeicherter Topologien.

## Visuelle Sprache
- Moderne, ruhige, professionelle Lernanwendung, klar und übersichtlich, keine Spielzeug-Optik. Inspiriert von Packet Tracer und modernen Diagramm-Tools.
- **Geräte-Symbole:** Eigene, einheitliche SVG-Icon-Familie mit klar unterscheidbaren Silhouetten (Karte, Terminal, Router-ähnliche Box, Server/Dienst, Rechner). Jedes Gerät zeigt Icon, Name und ggf. Variante (PVS/KIS/AVS).
- **Kategorien** erhalten zusätzlich zur Farbe eine eigene **Rahmenform oder Eckenform** (z. B. Karten: abgerundet, Terminals: Rechteck mit Ecke, Fachdienste: Sechseck).
- **Verbindungen:** Kantenstile nach Art: physisch (durchgezogen, dick), NFC (gepunktet), TCP im Netz (durchgezogen, dünn), VPN (gestrichelt), Internet (Strich-Punkt). Kurzes Protokoll-Label auf der Kante.
- Klare Typografie (z. B. Inter), großzügige Abstände, dezente Schatten, abgerundete Ecken.
- Hell- und Dunkelmodus.

## Barrierefreiheit (verbindlich)
- **Rot-Grün-Schwäche:** Zustände wie gültig/ungültig, aktiv/ausgegraut, läuft/fertig dürfen nie allein über Farbe unterschieden werden. Immer zusätzlich Icon (Haken, Kreuz, Warndreieck), Muster oder Linienstil und Text. Farbpalette farbenblind-sicher (z. B. Okabe-Ito), keine Rot/Grün-Kombination als Bedeutungsträger.
- Kontrast mindestens WCAG AA für Text und Symbole.
- **Tastatur:** Sichtbarer, kräftiger Fokusrahmen an allen Elementen. Zeige in einer Ansicht die Tastaturhinweise (Shortcut-Übersicht: Enter fügt Gerät hinzu, Pfeiltasten verschieben, Menütaste/Shift+F10 öffnet das Kontextmenü, Leertaste Play/Pause, Esc bricht ab).
- Erklärtexte der Simulation in einem gut lesbaren Bereich (Live-Region), Mindestschriftgröße 14 px.

## Ergebnis
- Klickbares Mockup der oben genannten Zustände, ein durchgängiges Designsystem (Farben als Tokens, Typografie, Abstände, Icons, Kantenstile, Komponenten wie Knoten, Menü, Panel, Player, Dialog).
- Am Ende eine kurze Übersicht der Design-Tokens (Farbwerte hell und dunkel, Kontrastverhältnisse), damit sie später ins Frontend übernommen werden können.
