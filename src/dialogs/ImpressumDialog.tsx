import { Dialog } from "../ui/Dialog";

// Platzhalter, bis der Katalog die echte Version liefert.
const KATALOG_VERSION = "0.0.0 (Platzhalter)";

type Props = { open: boolean; onClose: () => void };

export function ImpressumDialog({ open, onClose }: Props) {
  return (
    <Dialog open={open} title="Impressum und Datenschutz" onClose={onClose}>
      <h3>Verantwortlich</h3>
      <p>
        Justin Riedel, E-Mail:{" "}
        <a href="mailto:contact.jriedel@gmail.com">contact.jriedel@gmail.com</a>
      </p>
      <p>
        Der TI Visualizer entsteht im Rahmen einer Bachelorarbeit an der FH
        Dortmund (Praktische Informatik, 2026). Es ist ein privates,
        nicht-kommerzielles Lernprojekt und kein offizielles Angebot der gematik
        GmbH. Die Darstellung ist vereinfacht und ersetzt nicht die
        Spezifikationen der gematik.
      </p>
      <p>Katalogversion: {KATALOG_VERSION}</p>
      <h3>Datenschutz</h3>
      <p>
        Die App sendet keine Daten an einen Server. Es gibt keine Cookies, kein
        Tracking und keine Inhalte von Drittanbietern. Gespeicherte Topologien
        liegen in Dateien, die Sie selbst speichern. Der Browser kann zusätzlich
        den letzten Arbeitsstand lokal als Autosave halten, der das Gerät nicht
        verlässt. Die Seite wird über GitHub Pages ausgeliefert, dabei
        verarbeitet GitHub technisch notwendige Daten (zum Beispiel die
        IP-Adresse).
      </p>
      <p>
        Der vollständige Text steht in der Datei IMPRESSUM.md im Repository.
      </p>
    </Dialog>
  );
}
