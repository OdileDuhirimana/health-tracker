"use client";

import { ReactNode } from "react";
import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}

export function FormField({ label, required, error, hint, children, className }: FormFieldProps) {
  const labelId = `field-${label.toLowerCase().replace(/\s+/g, "-")}`;
  
  return (
    <div className={clsx("space-y-2", className)}>
      <label
        htmlFor={labelId}
        className={clsx(
          "block text-sm font-semibold text-gray-700",
          error && "text-red-700"
        )}
      >
        {label}
        {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
      </label>
      <div className="relative">
      {children}
        {error && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <ExclamationCircleIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
          </div>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-600 font-medium flex items-center gap-1" role="alert">
          <ExclamationCircleIcon className="h-3 w-3 flex-shrink-0" />
          <span>{error}</span>
        </p>
      )}
      {hint && !error && (
        <p className="text-xs text-gray-500 leading-relaxed">{hint}</p>
      )}
    </div>
  );
}

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function FormInput({ error, className = "", ...props }: FormInputProps) {
  return (
    <input
      {...props}
      className={clsx(
        "w-full px-3 py-2.5 rounded-lg border bg-white text-gray-900 placeholder-gray-400",
        "focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all",
        "disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed",
        error
          ? "border-red-300 focus:border-red-500 focus:ring-red-500"
          : "border-gray-300 focus:border-blue-500 focus:ring-[#0066cc]",
        className
      )}
      aria-invalid={error ? "true" : "false"}
    />
  );
}

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export function FormSelect({ error, className = "", children, ...props }: FormSelectProps) {
  return (
    <select
      {...props}
      className={clsx(
        "w-full px-3 py-2.5 pr-10 rounded-lg border bg-white text-gray-900",
        "focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all",
        "appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:1em_1em]",
        "disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed",
        "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3E%3Cpath stroke=%27%236b7280%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%272%27 d=%27M6 8l4 4 4-4%27/%3E%3C/svg%3E')]",
        error
          ? "border-red-300 focus:border-red-500 focus:ring-red-500"
          : "border-gray-300 focus:border-blue-500 focus:ring-[#0066cc]",
        className
      )}
      aria-invalid={error ? "true" : "false"}
    >
      {children}
    </select>
  );
}

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export function FormTextarea({ error, className = "", ...props }: FormTextareaProps) {
  return (
    <textarea
      {...props}
      className={clsx(
        "w-full px-3 py-2.5 rounded-lg border bg-white text-gray-900 placeholder-gray-400",
        "focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all resize-y",
        "disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed",
        error
          ? "border-red-300 focus:border-red-500 focus:ring-red-500"
          : "border-gray-300 focus:border-blue-500 focus:ring-[#0066cc]",
        className
      )}
      aria-invalid={error ? "true" : "false"}
    />
  );
}

interface FormActionsProps {
  onCancel?: () => void;
  onSubmit?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  showCancel?: boolean; // New prop to control cancel button visibility
}

interface FormActionsPropsExtended extends FormActionsProps {
  'data-testid'?: string;
}

export function FormActions({
  onCancel,
  onSubmit,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  loading = false,
  disabled = false,
  className,
  showCancel = true, // Default to true for backward compatibility
  ...props
}: FormActionsPropsExtended) {
  return (
    <div className={clsx("flex justify-end gap-3 pt-4 border-t border-gray-200", className)}>
      {showCancel && onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 rounded-lg border-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {cancelLabel}
        </button>
      )}
      <button
        {...(props['data-testid'] ? { 'data-testid': props['data-testid'] } : { 'data-testid': 'form-submit-button' })}
        type="submit"
        onClick={onSubmit}
        className="px-4 py-2.5 rounded-lg bg-[#0066cc] text-white font-semibold hover:bg-[#0052a3] active:bg-[#003d7a] shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        disabled={loading || disabled}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {submitLabel}
      </button>
    </div>
  );
}

