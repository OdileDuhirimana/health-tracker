/**
 * Custom hook for fetching and managing activity logs.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { dashboardService } from "@/services";
import { ActivityLogEntry, PaginatedResponse } from "@/types";
import { normalizeListResponse, extractPagination } from "@/utils/api";

export type Activity = ActivityLogEntry;

interface ActivityFilters {
  type?: string;
  userId?: string;
  date?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/** Fills in the display `timestamp` field from `createdAt` when needed. */
function withDisplayTimestamp(entry: ActivityLogEntry): Activity {
  return {
    ...entry,
    timestamp: entry.createdAt || entry.timestamp || new Date(),
  };
}

export function useActivityLog(filtersOrLimit?: ActivityFilters | number) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Convert parameter to filters object. Memoized on the underlying
  // primitives (rather than on `filtersOrLimit` itself) so the resulting
  // object has a stable identity across renders unless a value actually
  // changes — this lets effects/callbacks below safely depend on `filters`
  // without re-running on every render.
  const isNumberParam = typeof filtersOrLimit === "number";
  const limitParam = isNumberParam ? filtersOrLimit : filtersOrLimit?.limit ?? 10;
  const pageParam = isNumberParam ? undefined : filtersOrLimit?.page;
  const typeParam = isNumberParam ? undefined : filtersOrLimit?.type;
  const userIdParam = isNumberParam ? undefined : filtersOrLimit?.userId;
  const dateParam = isNumberParam ? undefined : filtersOrLimit?.date;
  const searchParam = isNumberParam ? undefined : filtersOrLimit?.search;

  const filters: ActivityFilters = useMemo(
    () => ({
      limit: limitParam,
      page: pageParam,
      type: typeParam,
      userId: userIdParam,
      date: dateParam,
      search: searchParam,
    }),
    [limitParam, pageParam, typeParam, userIdParam, dateParam, searchParam]
  );

  const loadActivities = useCallback(async () => {
    setLoading(true);
    try {
      const response = await dashboardService.getRecentActivity(filters);
      if (response.data) {
        const raw: PaginatedResponse<ActivityLogEntry> | ActivityLogEntry[] = response.data;
        setActivities(normalizeListResponse(raw).map(withDisplayTimestamp));
        setPagination(extractPagination(raw));
      } else {
        setActivities([]);
        setPagination(null);
      }
    } catch {
      setActivities([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    let isMounted = true;
    // Guard against a slow/hanging request leaving the UI stuck in a
    // loading state indefinitely.
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
        setActivities([]);
      }
    }, 10000);

    loadActivities().finally(() => {
      clearTimeout(timeoutId);
    });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [loadActivities]);

  return {
    activities,
    pagination,
    loading,
    loadActivities,
  };
}
