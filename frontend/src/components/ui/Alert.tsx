"use client";

import clsx from "clsx";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface AlertProps {
  variant?: "info" | "success" | "warning" | "error";
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  onClose?: () => void;
  className?: string;
}

export function Alert({ variant = "info", title, description, action, onClose, className }: AlertProps) {
  const styles = {
    info: "bg-blue-50 text-blue-800 border-blue-200",
    success: "bg-green-50 text-green-800 border-green-200",
    warning: "bg-amber-50 text-amber-800 border-amber-200",
    error: "bg-red-50 text-red-800 border-red-200",
  };

  return (
    <div className={clsx(
      "rounded-lg border p-4 text-sm font-medium",
      styles[variant],
      className
    )}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-semibold">{title}</div>
          {description && <div className="mt-1 text-sm opacity-90">{description}</div>}
          {action && (
            <button
              onClick={action.onClick}
              className="mt-2 underline hover:no-underline font-semibold"
            >
              {action.label}
            </button>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 rounded hover:bg-black/5 transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}


