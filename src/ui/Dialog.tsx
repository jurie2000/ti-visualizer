import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Button } from "./Button";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

/** Modaler Dialog auf Basis des nativen <dialog> (Fokusfalle, Esc, Rückgabe des Fokus). */
export function Dialog({ open, title, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) {
      opener.current = document.activeElement;
      dlg.showModal();
      return;
    }
    if (!open) {
      if (dlg.open) dlg.close();
      // Fokus zurück zum Auslöser (nativ und im Test).
      const el = opener.current;
      if (el instanceof HTMLElement) el.focus();
      opener.current = null;
    }
  }, [open]);

  const onKeyDown = (e: KeyboardEvent<HTMLDialogElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <dialog
      ref={ref}
      className="tiv-dialog"
      aria-labelledby={titleId}
      onKeyDown={onKeyDown}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <header className="tiv-dialog__head">
        <h2 id={titleId}>{title}</h2>
        <Button aria-label="Dialog schließen" onClick={onClose}>
          ×
        </Button>
      </header>
      <div className="tiv-dialog__body">{open ? children : null}</div>
    </dialog>
  );
}
