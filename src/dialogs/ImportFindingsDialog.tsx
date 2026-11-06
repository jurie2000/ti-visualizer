import { useOpen } from "../store";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";

/** Importbefunde nach dem Öffnen: nichts verschwindet stillschweigend (plan.md). */
export function ImportFindingsDialog() {
  const findings = useOpen((s) => s.findings);
  const close = () => {
    useOpen.setState({ findings: undefined });
  };
  return (
    <Dialog open={findings !== undefined} title="Importbefunde" onClose={close}>
      <p>Beim Öffnen von {findings?.fileName} ist Folgendes aufgefallen:</p>
      <ul>
        {findings?.list.map((f, i) => (
          <li key={i}>
            {f.severity}: {f.message}
          </li>
        ))}
      </ul>
      <Button variant="primary" onClick={close}>
        Verstanden
      </Button>
    </Dialog>
  );
}
