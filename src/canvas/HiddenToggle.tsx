import { useState } from "react";

/**
 * Knopf, der ausgeblendete Geräte ein- und ausklappt (Regelwerk 11). Gemeinsam
 * für Sammelkante (`GroupEdge`) und den Hinweis am Gerät (`DeviceNode`).
 */
export function HiddenToggle({
  label,
  description,
  hidden,
}: {
  label: string;
  description: string;
  hidden: string[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="tiv-edge-label__btn nodrag nopan"
        aria-label={description}
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
        }}
      >
        {label}
      </button>
      {open && (
        <ul
          className="tiv-edge-label__hidden"
          aria-label="Ausgeblendete Geräte"
        >
          {hidden.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      )}
    </>
  );
}
