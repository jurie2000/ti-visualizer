import { useEffect } from "react";
import { useSettings, type Theme } from "../store";
import { Button } from "../ui/Button";

const OPTIONS: { value: Theme; label: string }[] = [
  { value: "light", label: "Hell" },
  { value: "dark", label: "Dunkel" },
];

export function ThemeToggle() {
  const theme = useSettings((s) => s.theme);
  const set = useSettings((s) => s.set);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <div role="group" aria-label="Farbschema" className="tiv-theme">
      {OPTIONS.map((o) => (
        <Button
          key={o.value}
          aria-pressed={theme === o.value}
          onClick={() => {
            set({ theme: o.value });
          }}
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}
