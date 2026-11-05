import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastItem = { id: number; text: string };
type ToastApi = { show: (text: string) => void };

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(0);

  const show = useCallback((text: string) => {
    const id = next.current++;
    setItems((list) => [...list, { id, text }]);
    setTimeout(() => {
      setItems((list) => list.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="tiv-toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <p key={t.id} className="tiv-toast">
            {t.text}
          </p>
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
