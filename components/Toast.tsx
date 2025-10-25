"use client";
import { createContext, useContext, useState, useCallback } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

interface Toast {
  id: string;
  type: "success" | "error" | "info" | "warning";
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
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
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
      const duration = toast.duration ?? (toast.type === "error" ? 7000 : 4000);
      setTimeout(() => {
        removeToast(id);
      }, duration);
    },
    [removeToast]
  );

  const success = useCallback(
    (title: string, message?: string) => {
      addToast({ type: "success", title, message });
    },
    [addToast]
  );

  const error = useCallback(
    (title: string, message?: string) => {
      addToast({ type: "error", title, message });
    },
    [addToast]
  );

  const info = useCallback(
    (title: string, message?: string) => {
      addToast({ type: "info", title, message });
    },
    [addToast]
  );

  const warning = useCallback(
    (title: string, message?: string) => {
      addToast({ type: "warning", title, message });
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
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: string) => void;
}) {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const colors = {
    success:
      "bg-green-50 border-green-200 text-green-800 [.dark_&]:bg-green-900/20 [.dark_&]:border-green-800 [.dark_&]:text-green-300",
    error:
      "bg-red-50 border-red-200 text-red-800 [.dark_&]:bg-red-900/20 [.dark_&]:border-red-800 [.dark_&]:text-red-300",
    warning:
      "bg-yellow-50 border-yellow-200 text-yellow-800 [.dark_&]:bg-yellow-900/20 [.dark_&]:border-yellow-800 [.dark_&]:text-yellow-300",
    info: "bg-blue-50 border-blue-200 text-blue-800 [.dark_&]:bg-blue-900/20 [.dark_&]:border-blue-800 [.dark_&]:text-blue-300",
  };

  const iconColors = {
    success: "text-green-500 [.dark_&]:text-green-400",
    error: "text-red-500 [.dark_&]:text-red-400",
    warning: "text-yellow-500 [.dark_&]:text-yellow-400",
    info: "text-blue-500 [.dark_&]:text-blue-400",
  };

  const Icon = icons[toast.type];

  return (
    <div
      className={`
        ${colors[toast.type]}
        border rounded-lg p-4 shadow-lg backdrop-blur-sm 
        animate-in slide-in-from-right-full duration-300
        hover:shadow-xl transition-all
      `}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <Icon
          className={`h-5 w-5 ${iconColors[toast.type]} flex-shrink-0 mt-0.5`}
        />

        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm">{toast.title}</h4>
          {toast.message && (
            <p className="text-sm opacity-80 mt-1">{toast.message}</p>
          )}

          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="text-sm font-medium underline hover:no-underline mt-2 block"
            >
              {toast.action.label}
            </button>
          )}
        </div>

        <button
          onClick={() => onRemove(toast.id)}
          className="opacity-60 hover:opacity-100 transition-opacity flex-shrink-0"
          aria-label="Chiudi notifica"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
