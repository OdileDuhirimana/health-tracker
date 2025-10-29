/**
 * Custom hook for generating and exporting reports.
 */

import { useState, useEffect, useCallback } from "react";
import { reportsService, dashboardService } from "@/services";
import { useToast } from "@/components/Toast";
import { downloadCSV, exportPatientProgress } from "@/utils/csv";

export function useReports() {
  const [statistics, setStatistics] = useState({
    totalPatients: 0,
    activePrograms: 0,
    sessionsCompleted: 0,
    averageAttendance: 0,
  });
  const [loading, setLoading] = useState(false);
  const { notify } = useToast();

  const loadStatistics = useCallback(async () => {
    try {
      const [metricsResponse, attendanceResponse] = await Promise.all([
        dashboardService.getMetrics(),
        dashboardService.getAttendanceData(),
      ]);

      if (metricsResponse.data) {
        const data = metricsResponse.data;
        setStatistics((prev) => ({
          ...prev,
          totalPatients: data.activePatients || 0,
          activePrograms: data.totalPrograms || 0,
        }));
      }

      if (attendanceResponse.data) {
        const { present, absent } = attendanceResponse.data;
        const total = present + absent;
        const avgAttendance = total > 0 ? Math.round((present / total) * 100) : 0;
        setStatistics((prev) => ({
          ...prev,
          sessionsCompleted: present || 0,
          averageAttendance: avgAttendance,
        }));
      }
    } catch (error) {
      // Error handled silently
    }
  }, []);

  const generatePatientReport = useCallback(async (filters?: {
    programId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    setLoading(true);
    try {
      const response = await reportsService.getPatientReport(filters);
      if (response.data) {
        exportPatientProgress(response.data);
        notify("Patient report exported", "success");
      } else {
        notify(response.error || "Failed to generate report", "error");
      }
    } catch (error) {
      notify("Failed to generate patient report", "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  const generateProgramReport = useCallback(async (filters?: {
    startDate?: string;
    endDate?: string;
  }) => {
    setLoading(true);
    try {
      const response = await reportsService.getProgramReport(filters);
      if (response.data) {
        downloadCSV(`program-report-${new Date().toISOString().split("T")[0]}.csv`, response.data);
        notify("Program report exported", "success");
      } else {
        notify(response.error || "Failed to generate report", "error");
      }
    } catch (error) {
      notify("Failed to generate program report", "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  const generateMedicationReport = useCallback(async () => {
    setLoading(true);
    try {
      const response = await reportsService.getMedicationReport();
      if (response.data) {
        downloadCSV(`medication-report-${new Date().toISOString().split("T")[0]}.csv`, response.data);
        notify("Medication report exported", "success");
      } else {
        notify(response.error || "Failed to generate report", "error");
      }
    } catch (error) {
      notify("Failed to generate medication report", "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  const generateAttendanceReport = useCallback(async (filters?: {
    programId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    setLoading(true);
    try {
      const response = await reportsService.getAttendanceReport(filters);
      if (response.data) {
        downloadCSV(`attendance-report-${new Date().toISOString().split("T")[0]}.csv`, response.data);
        notify("Attendance report exported", "success");
      } else {
        notify(response.error || "Failed to generate report", "error");
      }
    } catch (error) {
      notify("Failed to generate attendance report", "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  const generateUserReport = useCallback(async () => {
    setLoading(true);
    try {
      const response = await reportsService.getUserReport();
      if (response.data) {
        downloadCSV(`user-report-${new Date().toISOString().split("T")[0]}.csv`, response.data);
        notify("User report exported", "success");
      } else {
        notify(response.error || "Failed to generate report", "error");
      }
    } catch (error) {
      notify("Failed to generate user report", "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  return {
    statistics,
    loading,
    loadStatistics,
    generatePatientReport,
    generateProgramReport,
    generateMedicationReport,
    generateAttendanceReport,
    generateUserReport,
  };
}

