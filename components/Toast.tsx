"use client";
import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => string;
  removeToast: (id: string) => void;
  success: (title: string, message?: string, duration?: number) => string;
  error: (title: string, message?: string, duration?: number) => string;
  info: (title: string, message?: string, duration?: number) => string;
  warning: (title: string, message?: string, duration?: number) => string;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).substr(2, 9);
      const newToast = { ...toast, id };

      setToasts((prev) => [...prev, newToast]);

      // Auto-remove dopo la durata specificata
      const duration = toast.duration ?? (toast.type === "error" ? 6000 : toast.type === "success" ? 4000 : 5000);
      setTimeout(() => {
        removeToast(id);
      }, duration);

      return id;
    },
    [removeToast]
  );

  const success = useCallback(
    (title: string, message?: string, duration?: number) => {
      return addToast({ type: "success", title, message, duration });
    },
    [addToast]
  );

  const error = useCallback(
    (title: string, message?: string, duration?: number) => {
      return addToast({ type: "error", title, message, duration });
    },
    [addToast]
  );

  const info = useCallback(
    (title: string, message?: string, duration?: number) => {
      return addToast({ type: "info", title, message, duration });
    },
    [addToast]
  );

  const warning = useCallback(
    (title: string, message?: string, duration?: number) => {
      return addToast({ type: "warning", title, message, duration });
    },
    [addToast]
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        addToast,
        removeToast,
        success,
        error,
        info,
        warning,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: Toast[];
  onRemove: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-md pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  // Schemi colore coerenti al design del sito
  const colorSchemes = {
    success: {
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      border: "border-emerald-200 dark:border-emerald-800/50",
      text: "text-emerald-900 dark:text-emerald-200",
      icon: "text-emerald-600 dark:text-emerald-400",
      progress: "bg-emerald-500",
    },
    error: {
      bg: "bg-red-50 dark:bg-red-950/30",
      border: "border-red-200 dark:border-red-800/50",
      text: "text-red-900 dark:text-red-200",
      icon: "text-red-600 dark:text-red-400",
      progress: "bg-red-500",
    },
    warning: {
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-200 dark:border-amber-800/50",
      text: "text-amber-900 dark:text-amber-200",
      icon: "text-amber-600 dark:text-amber-400",
      progress: "bg-amber-500",
    },
    info: {
      bg: "bg-blue-50 dark:bg-blue-950/30",
      border: "border-blue-200 dark:border-blue-800/50",
      text: "text-blue-900 dark:text-blue-200",
      icon: "text-blue-600 dark:text-blue-400",
      progress: "bg-blue-500",
    },
  };

  const Icon = icons[toast.type];
  const scheme = colorSchemes[toast.type];

  return (
    <div
      className={`
        relative overflow-hidden
        ${scheme.bg}
        ${scheme.border}
        ${scheme.text}
        border rounded-lg p-4 shadow-lg backdrop-blur-sm 
        hover:shadow-xl transition-all duration-200
        toast-enter
      `}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <Icon className={`h-5 w-5 ${scheme.icon} flex-shrink-0 mt-0.5`} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm leading-snug">{toast.title}</h4>
          {toast.message && (
            <p className="text-sm opacity-75 mt-1 leading-snug">{toast.message}</p>
          )}

          {/* Action button */}
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className={`
                text-sm font-medium mt-2 block
                underline hover:no-underline
                opacity-80 hover:opacity-100 transition-opacity
              `}
            >
              {toast.action.label}
            </button>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={() => onRemove(toast.id)}
          className={`
            opacity-50 hover:opacity-100
            flex-shrink-0 p-0.5 hover:bg-black/5 dark:hover:bg-white/5
            rounded transition-all
          `}
          aria-label="Chiudi notifica"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress bar - animazione di countdown */}
      <div
        className={`
          absolute bottom-0 left-0 h-1 ${scheme.progress}
          rounded-b-md transition-none
        `}
        style={{
          width: "100%",
          animation: `shrinkWidth ${toast.duration ?? 4000}ms linear forwards`,
        }}
      />

      <style>{`
        @keyframes shrinkWidth {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
