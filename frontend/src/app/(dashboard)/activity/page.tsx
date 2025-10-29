"use client";

/**
 * Activity Logs Page
 * Full page view of all activity logs with filtering
 * Refactored for modularity and maintainability
 */

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { UserPlusIcon, CheckCircleIcon, ClipboardDocumentCheckIcon } from "@heroicons/react/24/outline";
import { PillIcon } from "@/components/ui/PillIcon";
import { PageHeader, SearchBar } from "@/components/ui/PageHeader";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Card } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import EmptyState from "@/components/EmptyState";
import { useActivityLog } from "@/hooks/useActivityLog";
import { useDebounce } from "@/hooks/useDebounce";
import { LiaPillsSolid } from "react-icons/lia";
import { RxActivityLog } from "react-icons/rx";

export default function ActivityLogsPage() {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Build filters object
  const filters = {
    type: typeFilter !== "all" ? typeFilter : undefined,
    userId: userFilter !== "all" ? userFilter : undefined,
    date: dateFilter || undefined,
    search: debouncedSearch || undefined,
    page: currentPage,
    limit: itemsPerPage,
  };

  const { activities, pagination, loading } = useActivityLog(filters);

  // Reset to page 1 when filters change (except page itself)
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, userFilter, dateFilter, debouncedSearch]);

  const getActivityIcon = (type: string) => {
    const iconBoxClasses = "h-10 w-10 rounded-lg border border-gray-200 bg-blue-50 flex items-center justify-center flex-shrink-0";
    const typeLower = type?.toLowerCase() || "";
    
    if (typeLower.includes("enrollment") || typeLower.includes("user")) {
      return <div className={iconBoxClasses}><UserPlusIcon className="h-5 w-5 text-[#0066cc]" /></div>;
    } else if (typeLower.includes("medication")) {
      return <div className={iconBoxClasses}><LiaPillsSolid className="h-5 w-5 text-[#0066cc]" /></div>;
    } else if (typeLower.includes("attendance")) {
      return <div className={iconBoxClasses}><CheckCircleIcon className="h-5 w-5 text-[#0066cc]" /></div>;
    } else if (typeLower.includes("program")) {
      return <div className={iconBoxClasses}><ClipboardDocumentCheckIcon className="h-5 w-5 text-[#0066cc]" /></div>;
    }
    return <div className={iconBoxClasses}><ClipboardDocumentCheckIcon className="h-5 w-5 text-[#0066cc]" /></div>;
  };

  const uniqueUsers = Array.from(new Set(activities.map((a) => a.user).filter(Boolean)));

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
    setTypeFilter("all");
    setUserFilter("all");
    setDateFilter("");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const hasFilters = typeFilter !== "all" || userFilter !== "all" || dateFilter || searchQuery;

  const activityTypes = [
    { value: "all", label: "All Types" },
    { value: "enrollment", label: "Enrollment" },
    { value: "medication", label: "Medication" },
    { value: "attendance", label: "Attendance" },
    { value: "program", label: "Program" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity Logs"
        description="Monitor all system activities and track user actions across the platform"
      />

      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search activities by description, user, or type..."
        filters={
          <>
            <FilterSelect
              value={typeFilter}
              onChange={setTypeFilter}
              options={activityTypes.filter(t => t.value !== "all")}
              placeholder="All Types"
            />
            {uniqueUsers.length > 0 && (
              <FilterSelect
                value={userFilter}
                onChange={setUserFilter}
                options={uniqueUsers.filter((u): u is string => !!u).map((u) => ({ value: u, label: u }))}
                placeholder="All Users"
              />
            )}
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm min-w-[150px] shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0066cc] focus:border-transparent transition-all"
            />
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-semibold transition-all text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0066cc] focus:border-transparent"
              >
                Clear
              </button>
            )}
          </>
        }
      />

      <Card padding="md">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0066cc] mx-auto"></div>
            <p className="text-sm text-gray-500 mt-4">Loading activities...</p>
          </div>
        ) : activities.length === 0 ? (
          <EmptyState
            icon={<RxActivityLog className="h-16 w-16 text-gray-400" />}
            title="No activities found"
            description={hasFilters ? "No activities match your current filters. Try adjusting your search criteria." : "No activity logs available yet."}
          />
        ) : (
          <>
            <div className="space-y-0 divide-y divide-gray-200">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
                  <div className="mt-0.5">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-700 leading-relaxed">{activity.description}</div>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
                      {activity.user && (
                        <>
                          <span>{activity.user}</span>
                          <span>•</span>
                        </>
                      )}
                      <span>{format(new Date(activity.timestamp), "dd-MM-yyyy hh:mm a")}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {pagination && pagination.totalPages > 1 && (
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                totalItems={pagination.total}
                itemsPerPage={pagination.limit}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </Card>
    </div>
  );
}
