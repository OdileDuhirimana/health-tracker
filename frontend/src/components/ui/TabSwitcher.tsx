"use client";

import clsx from "clsx";

interface Tab {
  id: string;
  label: string;
}

interface TabSwitcherProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
  variant?: "buttons" | "underline";
}

export function TabSwitcher({ tabs, activeTab, onChange, className, variant = "buttons" }: TabSwitcherProps) {
  if (variant === "underline") {
    return (
      <nav className={clsx("flex gap-4", className)}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={clsx(
              "px-4 py-2 text-sm font-semibold border-b-2 transition-colors",
              activeTab === tab.id
                ? "border-[#0066cc] text-[#0066cc]"
                : "border-transparent text-gray-600 hover:text-gray-900"
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    );
  }

  return (
    <div className={clsx("flex items-center gap-2", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={clsx(
            "px-4 py-2 rounded-lg border font-semibold transition-all",
            activeTab === tab.id
              ? "bg-[#0066cc] text-white border-[#0066cc] shadow-md"
              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

