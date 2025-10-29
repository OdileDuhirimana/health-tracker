/**
 * Custom hook for fetching and managing activity logs.
 */

import { useState, useEffect, useCallback } from "react";
import { dashboardService } from "@/services";
import { useToast } from "@/components/Toast";

export interface Activity {
  id: string;
  type: string;
  description: string;
  user?: string;
  userEmail?: string;
  timestamp: Date | string;
  createdAt?: string;
  metadata?: Record<string, any>;
}

interface ActivityFilters {
  type?: string;
  userId?: string;
  date?: string;
  search?: string;
  page?: number;
  limit?: number;
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
  const { notify } = useToast();

  // Convert parameter to filters object
  const filters: ActivityFilters = typeof filtersOrLimit === 'number' 
    ? { limit: filtersOrLimit }
    : (filtersOrLimit || { limit: 10 });

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;
    
    const loadActivities = async () => {
      setLoading(true);
      
      timeoutId = setTimeout(() => {
        if (isMounted) {
          setLoading(false);
          setActivities([]);
        }
      }, 10000); // 10 second timeout
      
      try {
        const response = await dashboardService.getRecentActivity(filters);
        
        clearTimeout(timeoutId); // Clear timeout on success
        
        if (!isMounted) return; // Prevent state update if unmounted
        
        if (response.data) {
          // Handle paginated response: { data: [...], pagination: {...} }
          if (response.data.data && Array.isArray(response.data.data)) {
            const activitiesArray = response.data.data;
            
            setActivities(
              activitiesArray.map((a: any) => ({
                ...a,
                timestamp: a.createdAt || a.timestamp || new Date(),
              }))
            );
            setPagination(response.data.pagination || null);
          } else if (Array.isArray(response.data)) {
            // Legacy: direct array response
            setActivities(
              response.data.map((a: any) => ({
                ...a,
                timestamp: a.createdAt || a.timestamp || new Date(),
              }))
            );
            setPagination(null);
          } else {
            setActivities([]);
            setPagination(null);
          }
        } else if (response.error) {
          setActivities([]);
          setPagination(null);
        } else {
          // No data and no error - set empty
          setActivities([]);
          setPagination(null);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        if (isMounted) {
          setActivities([]);
          setPagination(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadActivities();
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [filters?.limit, filters?.page, filters?.type, filters?.userId, filters?.date, filters?.search]); // Depend on filter primitives

  const loadActivities = useCallback(async () => {
    setLoading(true);
    try {
      const response = await dashboardService.getRecentActivity(filters);
      if (response.data) {
        if (response.data.data && Array.isArray(response.data.data)) {
          setActivities(
            response.data.data.map((a: any) => ({
              ...a,
              timestamp: a.createdAt || a.timestamp || new Date(),
            }))
          );
          setPagination(response.data.pagination || null);
        } else if (Array.isArray(response.data)) {
          setActivities(
            response.data.map((a: any) => ({
              ...a,
              timestamp: a.createdAt || a.timestamp || new Date(),
            }))
          );
          setPagination(null);
        } else {
          setActivities([]);
          setPagination(null);
        }
      }
    } catch (error) {
      setActivities([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  return {
    activities,
    pagination,
    loading,
    loadActivities,
  };
}

