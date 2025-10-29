/**
 * PatientFilters Component
 * Filter controls for patients list
 */

import { FilterSelect } from "@/components/ui/FilterSelect";

interface PatientFiltersProps {
  programFilter: string;
  sortBy: "progress" | "adherence" | "";
  sortOrder: "ASC" | "DESC";
  programs: Array<{ id: string; name: string }>;
  onProgramFilterChange: (val: string) => void;
  onSortByChange: (val: "progress" | "adherence" | "") => void;
  onSortOrderChange: (val: "ASC" | "DESC") => void;
  onClear: () => void;
}

export function PatientFilters({
  programFilter,
  sortBy,
  sortOrder,
  programs,
  onProgramFilterChange,
  onSortByChange,
  onSortOrderChange,
  onClear,
}: PatientFiltersProps) {
  const hasFilters = programFilter || sortBy;

  return (
    <>
      <FilterSelect
        value={programFilter}
        onChange={(val) => {
          const program = programs.find(p => p.name === val || p.id === val);
          onProgramFilterChange(program?.id || "");
        }}
        options={programs.map(p => ({ value: p.id, label: p.name }))}
        placeholder="All Programs"
      />
      <FilterSelect
        value={sortBy}
        onChange={(val) => onSortByChange(val as "progress" | "adherence" | "")}
        options={[
          { value: "", label: "Sort By" },
          { value: "progress", label: "Progress Rate" },
          { value: "adherence", label: "Adherence Rate" },
        ]}
        placeholder="Sort By"
      />
      {sortBy && (
        <FilterSelect
          value={sortOrder}
          onChange={(val) => onSortOrderChange(val as "ASC" | "DESC")}
          options={[
            { value: "DESC", label: "Descending" },
            { value: "ASC", label: "Ascending" },
          ]}
          placeholder="Order"
        />
      )}
      {hasFilters && (
        <button
          onClick={onClear}
          className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-semibold transition-all text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0066cc] focus:border-transparent"
        >
          Clear All
        </button>
      )}
    </>
  );
}

