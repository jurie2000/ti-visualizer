import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles/tokens.css", "utf8");

function vars(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    out[m[1] as string] = (m[2] as string).trim();
  }
  return out;
}

function blockAfter(selector: string): string {
  const start = css.indexOf(selector);
  if (start < 0) throw new Error(`Selektor fehlt: ${selector}`);
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}" && --depth === 0) return css.slice(open + 1, i);
  }
  throw new Error("Block nicht geschlossen");
}

const light = vars(blockAfter(":root {"));
const darkOverrides = vars(blockAfter(':root[data-theme="dark"]'));
const darkMedia = vars(blockAfter(":root:not([data-theme="));
const dark = { ...light, ...darkOverrides };

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const BG = ["--color-bg", "--color-surface"];
// Bedienelemente außerhalb der Fläche (T-710)
const PANEL = "--color-neutral-100";
const cats = [
  "primary",
  "card",
  "terminal",
  "lan",
  "network",
  "service",
  "central",
  "insured",
].map((c) => `--tiv-cat-${c}`);
const edges = ["phys", "nfc", "tcp", "vpn", "wlan", "inet"].map(
  (e) => `--tiv-edge-${e}`,
);

/** [Vordergrund, Hintergrund, Mindestkontrast] */
const pairs: [string, string, number][] = [
  // Text (AA normal: 4,5:1)
  ...BG.flatMap((bg): [string, string, number][] => [
    ["--color-text", bg, 4.5],
    ["--color-text-muted", bg, 4.5],
    ["--color-accent", bg, 4.5],
  ]),
  ["--color-text", PANEL, 4.5],
  ["--color-text-muted", PANEL, 4.5],
  ["--color-accent", PANEL, 4.5],
  ["--tiv-focus", PANEL, 3],
  ["--color-bg", "--color-accent", 4.5], // Primärknopf
  ["--color-accent-800", "--color-accent-100", 4.5],
  ["--color-accent-2-800", "--color-accent-2-100", 4.5],
  ["--color-neutral-800", "--color-neutral-100", 4.5],
  ["--tiv-card-fg", "--color-neutral-100", 4.5], // Kartenmarke (T-718)
  ["--tiv-card-fg", "--color-bg", 4.5],
  ["--tiv-error-fg", "--tiv-error-bg", 4.5],
  ["--tiv-ok-fg", "--tiv-ok-bg", 4.5],
  ["--tiv-warn-fg", "--tiv-warn-bg", 4.5],
  // Nicht-Text: Fokus, Kategorien, Kanten, Statusränder (AA: 3:1)
  ...BG.flatMap((bg): [string, string, number][] => [
    ["--tiv-focus", bg, 3],
    ...cats.map((c): [string, string, number] => [c, bg, 3]),
    ...edges.map((e): [string, string, number] => [e, bg, 3]),
  ]),
];

describe.each([
  ["hell", light],
  ["dunkel", dark],
])("Kontrast %s (WCAG AA)", (_name, theme) => {
  it.each(pairs)("%s auf %s mindestens %s:1", (fg, bg, min) => {
    const f = theme[fg];
    const b = theme[bg];
    expect(f, fg).toMatch(/^#[0-9a-f]{6}$/);
    expect(b, bg).toMatch(/^#[0-9a-f]{6}$/);
    expect(contrast(f as string, b as string)).toBeGreaterThanOrEqual(min);
  });
});

describe("Dunkelmodus", () => {
  it("prefers-color-scheme-Block entspricht data-theme=dark", () => {
    expect(darkMedia).toEqual(darkOverrides);
  });

  it("jede Kategorie hat eine Form", () => {
    for (const c of cats) expect(light[`${c}-shape`], c).toBeTruthy();
  });
});
