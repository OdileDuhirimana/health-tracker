/** Reusable table component with optional striped rows. */
import clsx from "clsx";
import React from "react";

interface TableProps {
  children: React.ReactNode;
  className?: string;
  striped?: boolean;
}

export function Table({ children, className, striped = false }: TableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className={clsx("min-w-full divide-y divide-gray-200", className)}>
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-gradient-to-b from-gray-50 to-gray-100 text-left">
      {children}
    </thead>
  );
}

export function TBody({ children, striped }: { children: React.ReactNode; striped?: boolean }) {
  return (
    <tbody className={clsx("divide-y divide-gray-200 bg-white", striped && "[&>tr:nth-child(even)]:bg-gray-50")}>
      {children}
    </tbody>
  );
}

interface THProps {
  children: React.ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
}

export function TH({ children, className, align = "left" }: THProps) {
  const alignStyles = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  };
  
  return (
    <th
      className={clsx(
        "px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-700 whitespace-nowrap",
        alignStyles[align],
        className
      )}
    >
      {children}
    </th>
  );
}

interface TDProps {
  children: React.ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
  noWrap?: boolean;
}

export function TD({ children, className, align = "left", noWrap = true }: TDProps) {
  const alignStyles = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  };
  
  return (
    <td
      className={clsx(
        "px-5 py-3.5 align-top text-sm text-gray-700",
        alignStyles[align],
        noWrap && "whitespace-nowrap",
        !noWrap && "whitespace-normal",
        className
      )}
    >
      {children}
    </td>
  );
}

export function TR({ 
  children, 
  className, 
  hover = true,
  onClick,
}: { 
  children: React.ReactNode; 
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}) {
  return (
    <tr
      className={clsx(
        "transition-colors",
        hover && "hover:bg-blue-50/50",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}


