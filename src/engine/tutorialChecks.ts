import type { Topology } from "../schema";

/** Bereich, in den die Geräte der Apotheke gehören (Schritte des Teils „apotheke“). */
export const APOTHEKEN_ZONE = "Apotheke am Markt";

export interface TutorialCtx {
  topology: Topology;
  /** Geräte, deren Mitte im Bereich der Apotheke liegt (FR-15). */
  apo: ReadonlySet<string>;
  /** Aktionen, die im Player bis zum Ende ohne Problem durchliefen. */
  played: ReadonlySet<string>;
}

type Where = (id: string) => boolean;
type End = [type: string, where: Where];

/**
 * Erledigt-Prüfung je Schritt (FR-20). Schritte ohne Eintrag haben keine
 * Aufgabe und zählen als erledigt. Sie ist ein Hinweis, nie eine Sperre.
 */
export function stepDone(stepId: string, ctx: TutorialCtx): boolean {
  const { topology: t, apo, played } = ctx;
  const typeOf = new Map(t.nodes.map((n) => [n.id, n.type]));
  const praxis: Where = (id) => !apo.has(id);
  const inApo: Where = (id) => apo.has(id);
  const any: Where = () => true;
  const devices = (type: string, where: Where) =>
    t.nodes.filter((n) => n.type === type && where(n.id));
  const fits = ([type, where]: End, id: string) =>
    typeOf.get(id) === type && where(id);
  const linked = (a: End, b: End) =>
    t.edges.some(
      ({ ends: [x, y] }) =>
        (fits(a, x.node) && fits(b, y.node)) ||
        (fits(a, y.node) && fits(b, x.node)),
    );
  const withCards = (where: Where, kinds: string[]) =>
    devices("kt", where).some((n) =>
      kinds.every((k) => n.cards?.some((c) => c.kind === k)),
    );

  switch (stepId) {
    case "primaersystem":
      return devices("pvs", praxis).length > 0;
    case "kartenterminal":
      return devices("kt", praxis).length > 0;
    case "karten-stecken":
      return withCards(praxis, ["smcb", "hba", "egk"]);
    case "praxisnetz":
      return (
        linked(["pvs", praxis], ["switch", praxis]) &&
        linked(["kt", praxis], ["switch", praxis])
      );
    case "konnektor":
      return linked(["switch", praxis], ["kon", praxis]);
    case "weg-in-die-ti":
      return linked(["kon", praxis], ["vpn", any]);
    case "fachdienste":
      return ["idp", "erp", "vsdm"].every((s) =>
        linked(["vpn", any], [s, any]),
      );
    case "erstes-erezept":
      return played.has("erezept-ausstellen");
    case "apotheke-nebenan":
      return devices("avs", inApo).length > 0;
    case "apotheken-terminal":
      return withCards(inApo, ["smcb", "egk"]);
    case "apotheken-netz":
      return (
        linked(["avs", inApo], ["switch", inApo]) &&
        linked(["kt", inApo], ["switch", inApo])
      );
    case "apotheken-konnektor":
      return (
        linked(["switch", inApo], ["kon", inApo]) &&
        linked(["kon", inApo], ["vpn", any]) &&
        // Mit zwei Konnektoren gehört ein Terminal nur über `pairedWith` zu einem (Regelwerk 6.0)
        devices("kt", inApo).some((n) => {
          const kon = n.config?.pairedWith;
          return kon !== undefined && typeOf.get(kon) === "kon" && inApo(kon);
        }) &&
        // Reihenbetrieb: Gateway des Clients ist der Zugang (P-25)
        devices("avs", inApo).some((a) =>
          devices("kon", inApo).some(
            (k) =>
              a.config?.gateway !== undefined &&
              a.config.gateway === k.config?.ip,
          ),
        )
      );
    case "rezept-einloesen":
      return played.has("erezept-einloesen-egk");
    default:
      return true;
  }
}
