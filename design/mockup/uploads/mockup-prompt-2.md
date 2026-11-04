# Nachtrags-Prompt für das Mockup (Claude Design)

Überarbeite das bestehende Mockup „TI Visualizer“. Layout, Icon-Familie, Kategorieformen, Farbpalette und Kantenstile bleiben erhalten. Ergänze die fehlenden Bildschirme und korrigiere die unten genannten Punkte. Sprache: nur Deutsch.

## A. Fehlende Bildschirme und Zustände

1. **Kontextmenü (Rechtsklick oder Menütaste/Shift+F10 auf einem Gerät).**
   - **PVS:** „eRezept ausstellen“, „eAU ausstellen und per KIM senden“, „eAU-Kopie in die ePA hochladen“, „Befund in die ePA hochladen“, „ePA-Medikationsliste einsehen“, „Medikationsplan erstellen“, „Notfalldaten erfassen“, „VSDM-Prüfung anstoßen“, „TIM-Nachricht senden“.
   - **Kartenterminal:** „Karte stecken“, „eGK einlesen“, „VSDM-Prüfung“, „Notfalldaten auf die eGK schreiben“, „Medikationsplan auf die eGK schreiben“, „Medikationsplan auslesen“.
   - **AVS:** „eRezept einlösen (eGK einlesen)“, „eRezept einlösen (Rezeptcode scannen)“, „Medikationsplan auslesen“.
   - Nicht ausführbare Einträge stehen sichtbar, aber **ausgegraut**, mit einer kurzen Begründung darunter, z. B. „Kein HBA gesteckt“. Ausgegraut bedeutet zusätzlich ein Schloss-Icon und Text, nicht nur blasse Farbe. Zeige das Menü offen in beiden Varianten (mit Maus, mit Tastaturfokus auf einem Eintrag).
   - Konnektor, VPN und Fachdienste haben kein Aktionsmenü, nur „Details anzeigen“.

2. **Aktion „Karte stecken“ am Kartenterminal.** Ein kleiner Dialog listet die freien Smartcards der Canvas (eGK, HBA, SMC-B). Nach Auswahl entsteht eine Verbindung zwischen Karte und Terminal. Smartcards sind **eigene Knoten auf der Canvas** (keine Chips im Terminal) und werden aus der Palette gezogen wie alle Geräte. Ersetze die bisherige Chip-Darstellung im Detailpanel und die Hinweistexte in der Palette entsprechend.

3. **Simulations-Player (untere Leiste, nur aktiv wenn eine Aktion läuft).**
   - Steuerung: Play/Pause, Schritt zurück, Schritt vor, Tempo-Regler (langsam bis normal), „Abbrechen“.
   - Fortschritt „Schritt 3 von 8“ mit Fortschrittsleiste.
   - Erklärtextbereich für den aktuellen Schritt (Beispiel „eRezept ausstellen“: PVS → Kartenterminal (HBA signiert) → Konnektor → VPN-Zugangsdienst → E-Rezept-Fachdienst), mit Protokoll (z. B. „TLS 1.2 · SOAP“) und kurzer Erklärung.
   - Auf der Canvas: aktiver Knoten und aktive Kante hervorgehoben, ein Datenpaket wandert entlang der Kante. Nicht beteiligte Geräte sind abgedunkelt.
   - Zeige drei Zustände: mitten in einer Aktion, abgeschlossen (Zusammenfassung mit Haken-Icon), abgebrochen (Hinweis mit Kreuz-Icon).
   - Zeige zusätzlich eine **kartenbasierte Aktion (Notfalldaten schreiben)**: Der Ablauf geht nur vom PVS über das Kartenterminal zur eGK. Konnektor, VPN und Fachdienste bleiben unbeteiligt (abgedunkelt) mit dem Hinweis „Kein zentraler Fachdienst beteiligt“.

4. **Startansicht:** „Leer starten“ und die Preset-Karten „Arztpraxis“, „Apotheke“, „Krankenhaus“ mit Miniaturvorschau der Topologie. Der Button „Preset laden“ in der Kopfleiste öffnet dasselbe.

5. **Speichern-/Laden-Dialog:** Liste gespeicherter Topologien mit Name und Datum, Felder zum Speichern unter einem Namen, „JSON exportieren“ und „JSON importieren“. Hinweis, dass Topologien nur lokal im Browser liegen.

6. **Dunkelmodus:** Funktionierender Umschalter, alle Bildschirme in Dunkel. Farbwerte der Kategorien und Kantenstile bleiben unterscheidbar, Kontrast weiter mindestens WCAG AA.

7. **Tastatur-Übersicht:** Overlay (per „?“ oder Button) mit allen Kürzeln: Enter fügt ein Gerät hinzu, Pfeiltasten verschieben, Menütaste/Shift+F10 öffnet das Kontextmenü, Leertaste Play/Pause, Esc bricht ab.

8. **Konnektor-Sperre:** Zeige die Meldung, wenn zu einer Topologie mit Konnektor ein TI-Gateway hinzugefügt oder verbunden wird: „Konnektor und TI-Gateway schließen sich in einer Topologie gegenseitig aus. Entferne zuerst den Konnektor.“ mit Warn-Icon.

## B. Korrekturen

1. **Ein Anschluss pro Gerät statt vier Ports.** Kanten dürfen dennoch an der sinnvollsten Seite ansetzen. Die Kante bleibt ungerichtet.
2. **Kantenart bei Karten:** Karte gesteckt im Kartenterminal ist **physisch** (durchgezogen, dick), nicht NFC. NFC (gepunktet) nur bei eHealth-CardLink mit eGK. Ändere Legende und Detailpanel entsprechend.
3. **Verbinden mit Rückmeldung ohne Farbabhängigkeit:** Beim Ziehen einer Verbindung zeigen mögliche Ziele ein **Haken-Icon** mit Text „Gültig“, ungültige ein **Kreuz-Icon** mit Text „Nicht möglich“ (nicht nur Ringfarbe und Transparenz). Beim Loslassen auf ein ungültiges Ziel erscheint die Erklärung als Meldung.
4. **Mindestschriftgröße 14 px** überall, auch bei Badges und Labels.
5. **Fokus:** Alle interaktiven Elemente (Palette, Knoten, Kanten, Menüeinträge, Player) haben einen kräftigen, gut sichtbaren Fokusrahmen im Hell- und Dunkelmodus.
6. **Krankenhaus- und Apotheken-Preset:** Zeige beide zusätzlich zum bestehenden Arztpraxis-Preset (Apotheke: AVS, 1 Kartenterminal, Konnektor; Krankenhaus: 2 KIS, Highspeed-Konnektor, 2 Kartenterminals, TIM).

## C. Ergebnis

- Alle Bildschirme aus A und B klickbar, zusätzlich eine Übersicht der **Design-Tokens** (Farben hell/dunkel, Kontrastverhältnisse, Typografie, Abstände, Kantenstile) und eine Komponentenübersicht (Knoten, Kante, Kontextmenü, Panel, Player, Dialog, Toast).
- Kurze Liste, was sich gegenüber der ersten Fassung geändert hat.
