import clsx from "clsx";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";
  
  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-5 py-3 text-base",
  };
  
  const variantStyles = {
    primary: "bg-[#0066cc] text-white hover:bg-[#0052a3] active:bg-[#003d7a] shadow-md hover:shadow-lg focus:ring-[#0066cc]",
    outline: "border-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100 shadow-sm hover:shadow-md focus:ring-[#0066cc]",
    ghost: "text-gray-700 hover:bg-gray-100 active:bg-gray-200 focus:ring-[#0066cc]",
    danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-md hover:shadow-lg focus:ring-red-500",
    success: "bg-green-600 text-white hover:bg-green-700 active:bg-green-800 shadow-md hover:shadow-lg focus:ring-green-500",
  } as const;
  
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={clsx(
        baseStyles,
        sizeStyles[size],
        variantStyles[variant],
        isLoading && "cursor-wait",
        className
      )}
      aria-busy={isLoading}
    >
      {isLoading ? (
        <>
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
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
          <span className="sr-only">Loading...</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
}


