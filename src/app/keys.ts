export const MAC = /Mac|iPhone|iPad/.test(navigator.userAgent);
/** Anzeige des Kürzels; D10: auf macOS ⌘ statt Strg. */
export const label = (k: string) => (MAC ? `⌘${k}` : `Strg+${k}`);
export const keyshortcuts = (k: string) => (MAC ? `Meta+${k}` : `Control+${k}`);

/** Eingabefelder, Dialoge und Menüs behalten ihre eigenen Tasten. */
export const OWN_KEYS =
  "input, textarea, select, [contenteditable]:not([contenteditable=false]), dialog, [role=dialog], [role=menu]";
