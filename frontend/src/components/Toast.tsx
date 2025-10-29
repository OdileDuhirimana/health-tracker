"use client";

import { createContext, useCallback, useContext, useMemo, useState, useEffect } from "react";
import clsx from "clsx";
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";

type Toast = { 
  id: string; 
  title: string; 
  variant?: "success" | "error" | "info" | "warning";
  duration?: number;
};

const ToastContext = createContext<{
  notify: (title: string, variant?: Toast["variant"], duration?: number) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const notify = useCallback((title: string, variant: Toast["variant"] = "info", duration = 4000) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, title, variant, duration }]);
  }, []);
  
  const removeToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);
  
  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div 
        className="fixed bottom-4 right-4 left-4 sm:left-auto space-y-3 z-50 pointer-events-none flex flex-col items-end"
        role="region"
        aria-live="polite"
        aria-label="Notifications"
      >
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onRemove={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove();
    }, toast.duration || 4000);
    
    return () => clearTimeout(timer);
  }, [toast.duration, onRemove]);
  
  const icons = {
    success: CheckCircleIcon,
    error: XCircleIcon,
    info: InformationCircleIcon,
    warning: InformationCircleIcon,
  };
  
  const Icon = icons[toast.variant || "info"];
  
  const styles = {
    success: "bg-green-50 text-green-800 border-green-200 shadow-green-100",
    error: "bg-red-50 text-red-800 border-red-200 shadow-red-100",
    info: "bg-blue-50 text-blue-800 border-blue-200 shadow-blue-100",
    warning: "bg-amber-50 text-amber-800 border-amber-200 shadow-amber-100",
  };
  
  return (
    <div
      data-testid={`toast-${toast.variant || "info"}`}
      className={clsx(
        "rounded-lg px-4 py-3 shadow-lg border text-sm font-medium max-w-sm w-full pointer-events-auto toast-enter flex items-start gap-3",
        styles[toast.variant || "info"]
      )}
      role="alert"
    >
      <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="leading-relaxed">{toast.title}</p>
      </div>
      <button
        onClick={onRemove}
        className="flex-shrink-0 p-1 rounded hover:bg-black/5 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current"
        aria-label="Close notification"
      >
        <XMarkIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}


