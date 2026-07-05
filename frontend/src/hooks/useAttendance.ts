/** Custom hook for managing attendance data and operations. */

import { useState, useEffect, useCallback } from "react";
import { attendanceService, programsService, patientsService } from "@/services";
import { Attendance, AttendanceStatus, Patient, Program } from "@/types";
import { useToast } from "@/components/Toast";
import { normalizeListResponse } from "@/utils/api";

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
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
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
  const [programs, setPrograms] = useState<Array<{ id: string; name: string; assignedStaff?: Program["assignedStaff"] }>>([]);
  const [patients, setPatients] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const { notify } = useToast();

  const loadPrograms = useCallback(async () => {
    try {
      const response = await programsService.getAll();
      if (response.data) {
        const programsArray = normalizeListResponse<Program>(response.data);
        // Include assignedStaff for filtering
        setPrograms(programsArray.map((p) => ({
          id: p.id,
          name: p.name,
          assignedStaff: p.assignedStaff || [],
        })));
      }
    } catch {
      // Error handled silently
    }
  }, []);

  const loadPatients = useCallback(async () => {
    try {
      const response = await patientsService.getAll();
      if (response.data) {
        const patientsArray = normalizeListResponse<Patient>(response.data);
        setPatients(patientsArray.map((p) => ({
          id: p.id || p.patientId || "",
          name: p.fullName || p.name,
        })));
      }
    } catch {
      // Error handled silently
    }
  }, []);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await attendanceService.getAll();
      const attendanceArray = normalizeListResponse<Attendance>(response.data);

      if (attendanceArray.length > 0) {
        const grouped = attendanceArray.reduce<Record<string, AttendanceSession>>((acc, att) => {
          const date = att.attendanceDate || new Date().toISOString().split("T")[0];
          const key = `${att.program?.id || att.programId}_${date}`;
          if (!acc[key]) {
            acc[key] = {
              id: key,
              program: att.program?.name || "Unknown Program",
              date: date,
              attended: 0,
              total: 0,
              patients: [],
            };
          }
          acc[key].total++;
          if (att.status === "Present" || att.status === "Late") {
            acc[key].attended++;
          }
          acc[key].patients.push({
            id: att.patient?.id || att.patientId,
            name: att.patient?.fullName || att.patient?.name || "Unknown Patient",
            checkIn: att.checkInTime ? new Date(att.checkInTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : null,
            status: att.status,
          });
          return acc;
        }, {});
        setSessions(Object.values(grouped));
      }
    } catch {
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
          programRates: (stats.programRates || []).map((pr) => ({
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
    } catch {
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
        const records = normalizeListResponse<Attendance>(response.data);
        setAttendanceRecords(records);
        setPagination(
          Array.isArray(response.data) ? null : response.data.pagination || null
        );
        return records;
      } else {
        setAttendanceRecords([]);
        setPagination(null);
        return [];
      }
    } catch {
      notify("Failed to load attendance records", "error");
      setAttendanceRecords([]);
      setPagination(null);
      return [];
    } finally {
      setLoadingRecords(false);
    }
  }, [notify]);

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
  }, [filters, loadAttendanceRecords, loadSessions, loadStatistics, notify]);

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
  }, [filters, loadAttendanceRecords, loadSessions, loadStatistics, notify]);

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
  }, [filters, loadAttendanceRecords, loadSessions, loadStatistics, notify]);

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

