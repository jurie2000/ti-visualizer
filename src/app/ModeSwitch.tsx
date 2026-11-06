import { useSettings, type Mode } from "../store";
import { Button } from "../ui/Button";

const OPTIONS: { value: Mode; label: string }[] = [
  { value: "simple", label: "Einfach" },
  { value: "advanced", label: "Erweitert" },
];

/** Wechselt die Darstellung (Regelwerk 11). Der Modus gehört zu den Einstellungen, nicht zur Topologie. */
export function ModeSwitch() {
  const mode = useSettings((s) => s.mode);
  const set = useSettings((s) => s.set);
  return (
    <div role="group" aria-label="Modus" className="tiv-theme">
      {OPTIONS.map((o) => (
        <Button
          key={o.value}
          aria-pressed={mode === o.value}
          onClick={() => {
            set({ mode: o.value });
          }}
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}
