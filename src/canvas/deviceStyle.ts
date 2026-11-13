import {
  Calculator,
  Cloud,
  CreditCard,
  DoorOpen,
  FlaskConical,
  FolderOpen,
  Globe,
  KeyRound,
  Layers,
  Mail,
  MessageSquare,
  Monitor,
  Network,
  Nfc,
  Pill,
  Router,
  ScanLine,
  Server,
  ShieldCheck,
  Tablet,
  Wifi,
  type LucideIcon,
} from "lucide-react";

/** Größe eines Geräteknotens in Flusskoordinaten (auch Anfangswert vor dem Messen). */
export const NODE_SIZE = { width: 148, height: 64 } as const;

/** Katalog-Icon-ID (`deviceTypes[].icon`) auf das Symbol. */
export const ICONS: Record<string, LucideIcon> = {
  screen: Monitor,
  cloud: Cloud,
  server: Server,
  scan: ScanLine,
  flask: FlaskConical,
  tablet: Tablet,
  mail: Mail,
  chat: MessageSquare,
  card: CreditCard,
  key: KeyRound,
  term: Calculator,
  nfc: Nfc,
  sw: Network,
  wrouter: Router,
  router: Router,
  wifi: Wifi,
  shield: ShieldCheck,
  gate: DoorOpen,
  globe: Globe,
  layers: Layers,
  folder: FolderOpen,
  pill: Pill,
};

export const FALLBACK_ICON: LucideIcon = Server;

/** Kategorie-ID im Katalog auf den Token-Namen in `tokens.css` (`--tiv-cat-…`). */
const CAT_TOKEN: Record<string, string> = {
  zentral: "central",
  versicherte: "insured",
};

export const categoryColor = (id: string) =>
  `var(--tiv-cat-${CAT_TOKEN[id] ?? id})`;

/** MIME-Typ, mit dem die Palette den Gerätetyp beim Ziehen an die Canvas übergibt. */
export const DRAG_TYPE = "application/x-tiv-device";
