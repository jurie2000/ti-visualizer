import { useEffect, useState } from "react";
import { label, OWN_KEYS } from "../app/keys";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import "./shortcuts.css";

const GROUPS: { title: string; rows: [string, string][] }[] = [
  {
    title: "Allgemein",
    rows: [
      [label("S"), "Speichern"],
      ["?", "Diese Übersicht öffnen"],
      ["Esc", "Dialog, Menü oder Verbinden abbrechen"],
    ],
  },
  {
    title: "Bearbeiten",
    rows: [
      [label("C"), "Gerät kopieren"],
      [label("V"), "Kopie einfügen"],
      ["Entf oder Rücktaste", "Gerät oder Verbindung löschen"],
    ],
  },
  {
    title: "Canvas",
    rows: [
      ["Tab", "Zum nächsten Gerät oder zur nächsten Verbindung"],
      ["Enter, dann Pfeiltasten", "Gerät wählen und verschieben"],
      ["V", "Verbinden: Quelle wählen, mit Tab zum Ziel, erneut V"],
      ["Menütaste oder Umschalt+F10", "Kontextmenü mit den Aktionen"],
    ],
  },
  {
    title: "Simulation",
    rows: [
      ["Leertaste", "Wiedergabe oder Pause"],
      ["Pfeil rechts, Pfeil links", "Schritt vor, Schritt zurück"],
      ["Esc", "Simulation abbrechen"],
    ],
  },
];

/** Übersicht aller Tastaturkürzel (FR-22), per Button in der Fußzeile oder mit „?“. */
export function ShortcutsDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target instanceof Element ? e.target : undefined;
      if (e.key !== "?" || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.defaultPrevented || target?.closest(OWN_KEYS)) return;
      e.preventDefault();
      setOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <>
      <Button
        aria-keyshortcuts="?"
        onClick={() => {
          setOpen(true);
        }}
      >
        Tastaturkürzel
      </Button>
      <Dialog
        open={open}
        title="Tastaturkürzel"
        onClose={() => {
          setOpen(false);
        }}
      >
        {GROUPS.map((g) => (
          <section key={g.title}>
            <h3>{g.title}</h3>
            <dl className="tiv-keys">
              {g.rows.map(([keys, what]) => (
                <div key={keys}>
                  <dt>
                    <kbd>{keys}</kbd>
                  </dt>
                  <dd>{what}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </Dialog>
    </>
  );
}
