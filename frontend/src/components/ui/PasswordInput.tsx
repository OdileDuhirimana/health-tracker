"use client";

import { useState } from "react";
import { EyeIcon, EyeSlashIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  error?: boolean;
}

export function PasswordInput({ icon, error, className, ...props }: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  const displayIcon = icon !== undefined ? icon : <LockClosedIcon className="h-5 w-5 text-gray-400" />;

  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
        {displayIcon}
      </div>
      <input
        {...props}
        data-testid={props['data-testid'] || "password-input"}
        type={showPassword ? "text" : "password"}
        className={clsx(
          "w-full pl-10 pr-12 py-3 rounded-lg border bg-white text-gray-900 placeholder-gray-400",
          "focus:outline-none focus:ring-2 focus:border-transparent transition-all",
          error
            ? "border-red-300 focus:ring-red-500"
            : "border-gray-300 focus:ring-[#0066cc]",
          className
        )}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#0066cc] rounded p-1 transition-colors"
        aria-label={showPassword ? "Hide password" : "Show password"}
      >
        {showPassword ? (
          <EyeSlashIcon className="h-5 w-5" />
        ) : (
          <EyeIcon className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}

