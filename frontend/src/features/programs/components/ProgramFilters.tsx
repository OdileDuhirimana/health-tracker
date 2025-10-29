/**
 * ProgramFilters Component
 * Filter controls for programs list
 */

import { FilterSelect } from "@/components/ui/FilterSelect";

interface ProgramFiltersProps {
  typeFilter: string;
  statusFilter: string;
  query: string;
  onTypeFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onQueryChange: (value: string) => void;
  onClear: () => void;
}

export function ProgramFilters({
  typeFilter,
  statusFilter,
  query,
  onTypeFilterChange,
  onStatusFilterChange,
  onQueryChange,
  onClear,
}: ProgramFiltersProps) {
  const hasFilters = typeFilter || statusFilter || query;

  return (
    <>
      <FilterSelect
        value={typeFilter}
        onChange={onTypeFilterChange}
        options={[
          { value: "Mental Health", label: "Mental Health" },
          { value: "Vaccination", label: "Vaccination" },
          { value: "Diabetes", label: "Diabetes" },
        ]}
        placeholder="All Types"
      />
      <FilterSelect
        value={statusFilter}
        onChange={onStatusFilterChange}
        options={[
          { value: "Active", label: "Active" },
          { value: "Inactive", label: "Inactive" },
        ]}
        placeholder="All Status"
      />
      {hasFilters && (
        <button
          onClick={onClear}
          className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-semibold transition-all text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0066cc] focus:border-transparent"
        >
          Clear
        </button>
      )}
    </>
  );
}

