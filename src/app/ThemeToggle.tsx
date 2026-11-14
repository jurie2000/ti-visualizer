import { useEffect, useState } from "react";
import type { Theme } from "../store";
import { Button } from "../ui/Button";

const OPTIONS: { value: Theme; label: string }[] = [
  { value: "light", label: "Hell" },
  { value: "dark", label: "Dunkel" },
];

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

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
            setTheme(o.value);
          }}
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}
