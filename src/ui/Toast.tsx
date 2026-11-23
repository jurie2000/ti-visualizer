import { AlertTriangle, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/** `error` trägt ein Icon und die Fehlerfarben, die Art steht nie nur in der Farbe. */
type ToastKind = "info" | "error";
const DURATION: Record<ToastKind, number> = { info: 5000, error: 10000 };
type ToastItem = { id: number; text: string; kind: ToastKind };
type ToastApi = { show: (text: string, kind?: ToastKind) => void };

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (text: string, kind: ToastKind = "info") => {
      const id = next.current++;
      setItems((list) => [...list, { id, text, kind }]);
      setTimeout(() => {
        dismiss(id);
      }, DURATION[kind]);
    },
    [dismiss],
  );

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="tiv-toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`tiv-toast tiv-toast--${t.kind}`}>
            {t.kind === "error" && (
              <AlertTriangle size={18} aria-hidden="true" />
            )}
            <span className="tiv-toast__text">{t.text}</span>
            <button
              type="button"
              className="tiv-toast__close"
              aria-label="Meldung ausblenden"
              onClick={() => {
                dismiss(t.id);
              }}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast braucht einen ToastProvider");
  return ctx;
}
