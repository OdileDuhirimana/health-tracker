/**
 * Custom hook for fetching detailed patient information with enrollments and history.
 */

import { useState, useEffect, useCallback } from "react";
import { patientsService, dispensationsService, attendanceService } from "@/services";
import { Attendance, Dispensation, Patient, PatientEnrollment } from "@/types";
import { useToast } from "@/components/Toast";
import { normalizeListResponse } from "@/utils/api";

export function usePatientDetails(patientId: string) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [programs, setPrograms] = useState<PatientEnrollment[]>([]);
  const [medications, setMedications] = useState<Dispensation[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const { notify } = useToast();

  const loadPatientDetails = useCallback(async () => {
    if (!patientId) return;

    setLoading(true);
    try {
      const patientResponse = await patientsService.getById(patientId);
      if (patientResponse.data) {
        setPatient(patientResponse.data);
        setPrograms(patientResponse.data.enrollments || []);

        // Load medication history
        const medsResponse = await dispensationsService.getAll({ patientId });
        if (medsResponse.data) {
          setMedications(medsResponse.data);
        }

        // Load attendance history
        const attResponse = await attendanceService.getAll({});
        if (attResponse.data) {
          const attendanceArray = normalizeListResponse<Attendance>(attResponse.data);
          setAttendance(attendanceArray.filter((a) => a.patientId === patientId));
        }
      }
    } catch {
      setPatient(null);
      setPrograms([]);
      setMedications([]);
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  }, [patientId]); // Removed notify from dependencies

  useEffect(() => {
    loadPatientDetails();
  }, [loadPatientDetails]);

  const markProgramCompleted = useCallback(async (programId: string, completionNotes?: string) => {
    setLoading(true);
    try {
      const response = await patientsService.markProgramCompleted(patientId, programId, completionNotes);
      if (response.data) {
        notify("Program marked as completed successfully", "success");
        await loadPatientDetails();
        return response.data;
      } else {
        notify(response.error || "Failed to mark program as completed", "error");
        throw new Error(response.error || "Failed to mark program as completed");
      }
    } finally {
      setLoading(false);
    }
  }, [patientId, loadPatientDetails, notify]);

  return {
    patient,
    programs,
    medications,
    attendance,
    loading,
    loadPatientDetails,
    markProgramCompleted,
  };
}

