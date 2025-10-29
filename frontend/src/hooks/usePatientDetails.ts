/**
 * Custom hook for fetching detailed patient information with enrollments and history.
 */

import { useState, useEffect, useCallback } from "react";
import { patientsService, dispensationsService, attendanceService } from "@/services";
import { Patient } from "@/types";
import { useToast } from "@/components/Toast";

export function usePatientDetails(patientId: string) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [programs, setPrograms] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
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
          const attendanceArray = Array.isArray(attResponse.data) 
            ? attResponse.data 
            : attResponse.data.data || [];
          setAttendance(attendanceArray.filter((a: any) => a.patientId === patientId));
        }
      }
    } catch (error: any) {
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
  }, [patientId, loadPatientDetails]); // Removed notify from dependencies

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

