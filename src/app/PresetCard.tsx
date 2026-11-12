import type { Topology } from "../schema";

const W = 160;
const H = 100;
const PAD = 8;

/** Schlanke Vorschau: Geräte als Punkte, Verbindungen als Linien, ohne zweite React-Flow-Instanz. */
function Sketch({ topology }: { topology: Topology }) {
  const xs = topology.nodes.map((n) => n.position.x);
  const ys = topology.nodes.map((n) => n.position.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const scale = Math.min(
    (W - 2 * PAD) / (Math.max(...xs) - minX || 1),
    (H - 2 * PAD) / (Math.max(...ys) - minY || 1),
  );
  const at = new Map(
    topology.nodes.map((n) => [
      n.id,
      {
        x: PAD + (n.position.x - minX) * scale,
        y: PAD + (n.position.y - minY) * scale,
      },
    ]),
  );
  return (
    <svg
      className="tiv-preset__sketch"
      viewBox={`0 0 ${String(W)} ${String(H)}`}
      aria-hidden="true"
    >
      {topology.edges.map((e) => {
        const a = at.get(e.ends[0].node);
        const b = at.get(e.ends[1].node);
        return a && b ? (
          <line key={e.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
        ) : null;
      })}
      {[...at].map(([id, p]) => (
        <circle key={id} cx={p.x} cy={p.y} r={4} />
      ))}
    </svg>
  );
}

export function PresetCard({
  topology,
  title = topology.name,
  onOpen,
}: {
  topology: Topology;
  title?: string;
  onOpen: () => void;
}) {
  return (
    <li>
      <button type="button" className="tiv-preset" onClick={onOpen}>
        <span className="tiv-preset__preview">
          {topology.nodes.length > 0 ? (
            <Sketch topology={topology} />
          ) : (
            <svg
              className="tiv-preset__plus"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.75"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          )}
        </span>
        <span className="tiv-preset__title">{title}</span>
        <span>{topology.description}</span>
      </button>
    </li>
  );
}
