import clsx from "clsx";
import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

export function Card({ children, className, hover = false, padding = "md" }: CardProps) {
  const paddingStyles = {
    none: "",
    sm: "p-3",
    md: "p-5",
    lg: "p-6",
  };
  
  return (
    <div
      className={clsx(
        "rounded-xl border border-gray-200 bg-white shadow-sm",
        hover && "card-shadow-hover cursor-pointer",
        paddingStyles[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function CardHeader({ title, description, icon, action }: CardHeaderProps) {
  return (
    <div className="px-5 py-4 border-b border-gray-200 flex items-start gap-3 bg-gradient-to-r from-gray-50 to-white">
      {icon && (
        <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-[#0066cc] shadow-sm flex-shrink-0">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-bold text-gray-900 text-base leading-tight">{title}</div>
        {description && (
          <div className="text-sm text-gray-600 mt-1 leading-relaxed">{description}</div>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
}

export function CardBody({ children, className, padding = "md" }: CardBodyProps) {
  const paddingStyles = {
    none: "",
    sm: "p-3",
    md: "p-5",
    lg: "p-6",
  };
  
  return (
    <div className={clsx(paddingStyles[padding], className)}>
      {children}
    </div>
  );
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div className={clsx("px-5 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl", className)}>
      {children}
    </div>
  );
}


