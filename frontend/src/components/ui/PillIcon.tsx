import React from "react";

// Flaticon-style pill/capsule icon - clean capsule shape
export function PillIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Capsule shape */}
      <path
        d="M8 3C5.79086 3 4 4.79086 4 7V17C4 19.2091 5.79086 21 8 21H16C18.2091 21 20 19.2091 20 17V7C20 4.79086 18.2091 3 16 3H8Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="currentColor"
        fillOpacity="0.1"
      />
      {/* Divider line */}
      <line
        x1="12"
        y1="3"
        x2="12"
        y2="21"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="2 2"
        opacity="0.5"
      />
    </svg>
  );
}
