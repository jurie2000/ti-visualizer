import { useEffect, useState } from "react";
import { Button } from "../ui/Button";

type Theme = "system" | "light" | "dark";

const OPTIONS: { value: Theme; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Hell" },
  { value: "dark", label: "Dunkel" },
];

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
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
