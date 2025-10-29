/**
 * Custom hook for fetching and managing dashboard data.
 */

import { useState, useEffect, useCallback } from "react";
import { dashboardService, programsService } from "@/services";
import { DashboardMetrics, ProgramOverview, AttendanceData, AdherenceData } from "@/types";
import { useToast } from "@/components/Toast";

export function useDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalPrograms: 0,
    activePatients: 0,
    pendingMedications: 0,
    attendancePending: 0,
  });
  const [programData, setProgramData] = useState<ProgramOverview[]>([]);
  const [attendanceProgressData, setAttendanceProgressData] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [adherenceData, setAdherenceData] = useState<AdherenceData[]>([]);
  const [programDurationSummary, setProgramDurationSummary] = useState<Array<{
    programName: string;
    startDate: string | null;
    endDate: string | null;
    expectedEnrollments: number;
    activePatients: number;
    adherencePercent: number;
  }>>([]);
  const [upcomingDispensations, setUpcomingDispensations] = useState<Array<{
    patientId: string;
    patientName: string;
    programId: string;
    programName: string;
    medicationId: string;
    medicationName: string;
    nextDueDate: string;
    status: 'due_today' | 'overdue';
  }>>([]);
  const [loading, setLoading] = useState(true);
  const { notify } = useToast();

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // Load dashboard metrics
      const metricsResponse = await dashboardService.getMetrics();
      if (metricsResponse.data) {
        setMetrics({
          totalPrograms: metricsResponse.data.totalPrograms || 0,
          activePatients: metricsResponse.data.activePatients || 0,
          pendingMedications: metricsResponse.data.pendingMedications || 0,
          attendancePending: metricsResponse.data.overdueSessions || 0,
          overdueSessions: metricsResponse.data.overdueSessions || 0,
        });
      }

      // Load programs overview for chart
      const programsOverviewResponse = await dashboardService.getProgramsOverview();
      if (programsOverviewResponse.data && programsOverviewResponse.data.length > 0) {
        setProgramData(
          programsOverviewResponse.data.map((p: any) => ({
            name: p.name || "",
            patients: p.patients || 0,
          }))
        );
      } else {
        const programsResponse = await programsService.getAll();
        let programsArray: any[] = [];
        if (programsResponse.data) {
          if (Array.isArray(programsResponse.data)) {
            programsArray = programsResponse.data;
          } else if (programsResponse.data.data && Array.isArray(programsResponse.data.data)) {
            programsArray = programsResponse.data.data;
          }
        }
        if (Array.isArray(programsArray) && programsArray.length > 0) {
          const programCounts: Record<string, number> = {};
          programsArray.forEach((program: any) => {
            const type = program.type || "Other";
            programCounts[type] = (programCounts[type] || 0) + (program.enrollments?.length || 0);
          });
          setProgramData(
            Object.entries(programCounts).map(([name, patients]) => ({
              name: name,
              patients: patients as number,
            }))
          );
        }
      }

      // Load attendance and adherence data
      const [attendanceResponse, adherenceResponse] = await Promise.all([
        dashboardService.getAttendanceData(),
        dashboardService.getAdherenceRate(),
      ]);

      if (attendanceResponse.data) {
        const { present, pending, absent } = attendanceResponse.data;
        setAttendanceProgressData([
          { name: "Present", value: present || 0, color: "#16a34a" },
          { name: "Pending", value: pending || 0, color: "#0066cc" },
          { name: "Absent", value: absent || 0, color: "#dc2626" },
        ]);
      }

      if (adherenceResponse.data && adherenceResponse.data.data) {
        setAdherenceData(adherenceResponse.data.data);
      }

      // Load new dashboard widgets data
      const [durationSummaryResponse, upcomingDispensationsResponse] = await Promise.all([
        dashboardService.getProgramDurationSummary(),
        dashboardService.getUpcomingDispensations(),
      ]);

      if (durationSummaryResponse.data) {
        setProgramDurationSummary(durationSummaryResponse.data);
      }

      if (upcomingDispensationsResponse.data) {
        setUpcomingDispensations(upcomingDispensationsResponse.data);
      }
    } catch (error: any) {
      setProgramData([
        { name: "Mental", patients: 5 },
        { name: "Diabetes", patients: 5 },
        { name: "Vaccination", patients: 5 },
        { name: "Other", patients: 5 },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    metrics,
    programData,
    attendanceProgressData,
    adherenceData,
    programDurationSummary,
    upcomingDispensations,
    loading,
    loadDashboardData,
  };
}

