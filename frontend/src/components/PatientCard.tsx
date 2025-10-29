"use client";

import Badge from "@/components/Badge";
import { UserIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";

interface PatientCardProps {
  id: string;
  name: string;
  programs: string[];
  onView: () => void;
  status?: "active" | "inactive";
}

export function PatientCard({ id, name, programs, onView, status = "active" }: PatientCardProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={clsx(
        "rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-lg transition-all duration-200",
        "group cursor-pointer card-shadow-hover"
      )}
      onClick={onView}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onView();
        }
      }}
      aria-label={`View details for ${name}`}
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="h-12 w-12 rounded-full bg-[#0066cc] flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md group-hover:shadow-lg transition-shadow">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-base text-gray-900 group-hover:text-[#0066cc] transition-colors mb-0.5 truncate">
            {name}
          </h3>
          <div className="text-xs text-gray-500 font-mono">ID: {id}</div>
          {status && (
            <div className="mt-1">
              <Badge variant={status === "active" ? "success" : "neutral"}>
                {status === "active" ? "Active" : "Inactive"}
              </Badge>
            </div>
          )}
        </div>
      </div>
      
      {programs.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
            Programs ({programs.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {programs.slice(0, 3).map((p) => (
              <Badge key={p} variant="neutral" size="small">
                {p}
              </Badge>
            ))}
            {programs.length > 3 && (
              <Badge variant="neutral" size="small">
                +{programs.length - 3} more
              </Badge>
            )}
          </div>
      </div>
      )}
      
      <button
        onClick={(e) => {
          e.stopPropagation();
          onView();
        }}
        className="w-full px-4 py-2.5 text-sm font-semibold rounded-lg border-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all group-hover:border-blue-300 group-hover:text-[#0066cc]"
      >
        View Details
      </button>
    </div>
  );
}

