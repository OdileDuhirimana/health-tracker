/**
 * Patients Service
 * Handles all patient-related API calls
 */

import { apiRequest, buildQueryString } from "./api-client";
import { Patient, PatientFilters, PatientEnrollment } from "@/types";
import { PaginatedResponse } from "@/types";

export const patientsService = {
  /**
   * Get all patients with optional filters
   */
  getAll: (filters?: PatientFilters) => {
    const queryString = filters ? buildQueryString(filters) : "";
    const endpoint = queryString ? `/patients?${queryString}` : "/patients";
    return apiRequest<PaginatedResponse<Patient>>(endpoint);
  },
  
  /**
   * Get patient by ID
   */
  getById: (id: string) => apiRequest<Patient>(`/patients/${id}`),
  
  /**
   * Create new patient
   */
  create: (data: Partial<Patient>) =>
    apiRequest<Patient>("/patients", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  
  /**
   * Update patient
   */
  update: (id: string, data: Partial<Patient>) =>
    apiRequest<Patient>(`/patients/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  
  /**
   * Delete patient
   */
  delete: (id: string) =>
    apiRequest(`/patients/${id}`, {
      method: "DELETE",
    }),
  
  /**
   * Enroll patient in a program
   */
  enroll: (patientId: string, programId: string, data?: any) =>
    apiRequest<PatientEnrollment>(`/patients/${patientId}/enroll`, {
      method: "POST",
      body: JSON.stringify({ patientId, programId, ...data }),
    }),
  
  /**
   * Mark program as completed for a patient
   */
  markProgramCompleted: (patientId: string, programId: string, completionNotes?: string) =>
    apiRequest(`/patients/${patientId}/programs/${programId}/complete`, {
      method: "PATCH",
      body: JSON.stringify({ completionNotes }),
    }),
};

