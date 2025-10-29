/** Custom hook for managing attendance data and operations. */

import { useState, useEffect, useCallback } from "react";
import { attendanceService, programsService, patientsService } from "@/services";
import { Attendance, Program, AttendanceStatus } from "@/types";
import { useToast } from "@/components/Toast";

interface AttendanceSession {
  id: string;
  program: string;
  date: string;
  attended: number;
  total: number;
  patients: Array<{
    id: string;
    name: string;
    checkIn: string | null;
    status: string;
  }>;
}

interface AttendanceStatistics {
  overallRate: number;
  programRates: Array<{ name: string; rate: number }>;
}

interface AttendanceFilters {
  programId?: string;
  date?: string;
  status?: AttendanceStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export function useAttendance(filters?: AttendanceFilters) {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null>(null);
  const [statistics, setStatistics] = useState<AttendanceStatistics>({
    overallRate: 0,
    programRates: [],
  });
  const [programs, setPrograms] = useState<Array<{ id: string; name: string; assignedStaff?: any[] }>>([]);
  const [patients, setPatients] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const { notify } = useToast();

  const loadPrograms = useCallback(async () => {
    try {
      const response = await programsService.getAll();
      if (response.data) {
        const programsArray = Array.isArray(response.data)
          ? response.data
          : response.data.data || [];
        // Include assignedStaff for filtering
        setPrograms(programsArray.map((p: any) => ({ 
          id: p.id, 
          name: p.name,
          assignedStaff: p.assignedStaff || [],
        })));
      }
    } catch (error) {
      // Error handled silently
    }
  }, []);

  const loadPatients = useCallback(async () => {
    try {
      const response = await patientsService.getAll();
      if (response.data) {
        const patientsArray = Array.isArray(response.data)
          ? response.data
          : response.data.data || [];
        setPatients(patientsArray.map((p: any) => ({ 
          id: p.id || p.patientId, 
          name: p.fullName || p.name 
        })));
      }
    } catch (error) {
      // Error handled silently
    }
  }, []);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await attendanceService.getAll();
      const attendanceArray = Array.isArray(response.data) ? response.data : [];
      
      if (attendanceArray.length > 0) {
        const grouped = attendanceArray.reduce((acc: any, att: any) => {
          const date = att.attendanceDate || att.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0];
          const key = `${att.program?.id || att.programId}_${date}`;
          if (!acc[key]) {
            acc[key] = {
              id: key,
              program: att.program?.name || 'Unknown Program',
              date: date,
              attended: 0,
              total: 0,
              patients: [],
            };
          }
          acc[key].total++;
          if (att.status === 'Present' || att.status === 'Late') {
            acc[key].attended++;
          }
          acc[key].patients.push({
            id: att.patient?.id || att.patientId,
            name: att.patient?.fullName || att.patient?.name || 'Unknown Patient',
            checkIn: att.checkInTime ? new Date(att.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : null,
            status: att.status,
          });
        }, {});
        setSessions(Object.values(grouped));
      }
    } catch (error) {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStatistics = useCallback(async () => {
    try {
      const response = await attendanceService.getStatistics();
      if (response.data) {
        const stats = response.data;
        setStatistics({
          overallRate: Math.round(stats.attendanceRate || 0),
          programRates: (stats.programRates || []).map((pr: any) => ({
            name: pr.programName,
            rate: Math.round(pr.rate || 0),
          })),
        });
      } else {
        // Fallback to empty statistics
        setStatistics({
          overallRate: 0,
          programRates: [],
        });
      }
    } catch (error) {
      setStatistics({
        overallRate: 0,
        programRates: [],
      });
    }
  }, []);

  const loadAttendanceRecords = useCallback(async (filters?: AttendanceFilters) => {
    setLoadingRecords(true);
    try {
      const response = await attendanceService.getAll(filters);
      if (response.data) {
        // Handle paginated response: { data: [...], pagination: {...} }
        if (response.data.data && Array.isArray(response.data.data)) {
          setAttendanceRecords(response.data.data);
          setPagination(response.data.pagination || null);
        } else if (Array.isArray(response.data)) {
          // Legacy: direct array response
          setAttendanceRecords(response.data);
          setPagination(null);
        } else {
          setAttendanceRecords([]);
          setPagination(null);
        }
        return response.data.data || response.data || [];
      } else {
        setAttendanceRecords([]);
        setPagination(null);
        return [];
      }
    } catch (error) {
      notify("Failed to load attendance records", "error");
      setAttendanceRecords([]);
      setPagination(null);
      return [];
    } finally {
      setLoadingRecords(false);
    }
  }, []); // Removed notify

  const updateAttendance = useCallback(async (id: string, data: { status?: AttendanceStatus; notes?: string }) => {
    setLoading(true);
    try {
      const response = await attendanceService.update(id, data);
      if (response.data) {
        notify("Attendance record updated successfully", "success");
        // Reload records if filters are provided
        if (filters) {
          await loadAttendanceRecords(filters);
        }
        await loadSessions();
        await loadStatistics();
        return response.data;
      } else {
        notify(response.error || "Failed to update attendance", "error");
        throw new Error(response.error || "Failed to update attendance");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update attendance";
      notify(errorMessage, "error");
      throw error;
    } finally {
      setLoading(false);
    }
  }, [filters, loadAttendanceRecords, loadSessions, loadStatistics]); // Removed notify

  const deleteAttendance = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const response = await attendanceService.delete(id);
      if (!response.error) {
        notify("Attendance record deleted successfully", "success");
        // Reload records if filters are provided
        if (filters) {
          await loadAttendanceRecords(filters);
        }
        await loadSessions();
        await loadStatistics();
      } else {
        notify(response.error || "Failed to delete attendance", "error");
        throw new Error(response.error || "Failed to delete attendance");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete attendance";
      notify(errorMessage, "error");
      throw error;
    } finally {
      setLoading(false);
    }
  }, [filters, loadAttendanceRecords, loadSessions, loadStatistics]); // Removed notify

  const markAttendance = useCallback(async (data: {
    programId: string;
    attendanceDate: string;
    attendance: Array<{
      patientId: string;
      status: "Present" | "Absent" | "Late" | "Excused" | "Canceled";
      checkInTime?: string;
    }>;
  }) => {
    setLoading(true);
    try {
      const response = await attendanceService.markBulk(data);
      if (response.data) {
        notify("Attendance saved successfully", "success");
        // Reload records if filters are provided
        if (filters) {
          await loadAttendanceRecords(filters);
        }
        await loadSessions();
        await loadStatistics();
        return response.data;
      } else {
        notify(response.error || "Failed to save attendance", "error");
        throw new Error(response.error || "Failed to save attendance");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save attendance";
      notify(errorMessage, "error");
      throw error;
    } finally {
      setLoading(false);
    }
  }, [filters, loadAttendanceRecords, loadSessions, loadStatistics]); // Removed notify

  // Load attendance records when filters change or on initial mount
  useEffect(() => {
    loadAttendanceRecords(filters || {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters?.programId, filters?.date, filters?.status, filters?.search, filters?.page]);

  return {
    sessions,
    attendanceRecords,
    pagination,
    statistics,
    programs,
    patients,
    loading,
    loadingRecords,
    loadPrograms,
    loadPatients,
    loadSessions,
    loadStatistics,
    loadAttendanceRecords,
    markAttendance,
    updateAttendance,
    deleteAttendance,
  };
}

