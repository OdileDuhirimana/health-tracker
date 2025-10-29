/**
 * usePatientEnrollment Hook
 * Custom hook for patient enrollment operations
 */

import { useState, useCallback } from "react";
import { patientsService, programsService } from "@/services";
import { PatientFormData } from "@/types";
import { useToast } from "@/components/Toast";

export function usePatientEnrollment() {
  const [loading, setLoading] = useState(false);
  const { notify } = useToast();

  const enrollPatient = useCallback(async (data: PatientFormData, loadPatients?: () => Promise<void>) => {
    setLoading(true);
    try {
      // Create patient first
      const response = await patientsService.create({
        fullName: data.name,
        dateOfBirth: data.dob,
        gender: data.gender,
        contactNumber: data.contact,
        email: data.email,
        address: data.address,
        emergencyContact: data.emergencyContact,
        medicalNotes: data.medicalNotes,
      });

      if (response.data) {
        // Enroll in program if provided
        if (data.programId) {
          const enrollResponse = await patientsService.enroll(response.data.id, data.programId, {
            enrollmentDate: data.enrollmentDate,
            assignedStaffId: data.assignedStaffId,
          });
          if (enrollResponse.error) {
            notify(enrollResponse.error, "error");
          }
        }
        notify("Patient enrolled successfully", "success");
        if (loadPatients) {
          await loadPatients();
        }
        return response.data;
      } else {
        notify(response.error || "Failed to enroll patient", "error");
        throw new Error(response.error || "Failed to enroll patient");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred while enrolling patient";
      notify(errorMessage, "error");
      throw error;
    } finally {
      setLoading(false);
    }
  }, [notify]);

  const quickEnrollPatient = useCallback(async (
    patientId: string,
    programId: string,
    enrollmentDate?: string,
    assignedStaffId?: string
  ) => {
    setLoading(true);
    try {
      const enrollResponse = await patientsService.enroll(patientId, programId, {
        enrollmentDate,
        assignedStaffId,
      });
      
      if (enrollResponse.error) {
        notify(enrollResponse.error, "error");
        throw new Error(enrollResponse.error);
      }
      
      notify("Patient enrolled in program successfully", "success");
      return enrollResponse.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred while enrolling patient";
      notify(errorMessage, "error");
      throw error;
    } finally {
      setLoading(false);
    }
  }, [notify]);

  return {
    enrollPatient,
    quickEnrollPatient,
    loading,
  };
}

