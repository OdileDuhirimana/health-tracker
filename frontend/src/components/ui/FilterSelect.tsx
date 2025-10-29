"use client";

import { FormSelect } from "./FormField";

interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  className?: string;
}

export function FilterSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = "",
}: FilterSelectProps) {
  // Filter out empty value options since we add placeholder separately
  const filteredOptions = options.filter(opt => opt.value !== "");
  
  return (
    <FormSelect
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${className} min-w-[140px] px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0066cc] focus:border-transparent transition-all shadow-sm`}
    >
      <option value="">{placeholder}</option>
      {filteredOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </FormSelect>
  );
}

