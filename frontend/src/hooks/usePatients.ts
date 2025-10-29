/** Custom hook for managing patient data and operations with caching. */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { patientsService } from "@/services";
import { Patient, PatientFilters } from "@/types";
import { useToast } from "@/components/Toast";

export function usePatients(filters?: PatientFilters) {
  const { notify } = useToast();
  const queryClient = useQueryClient();

  const {
    data: patientsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["patients", filters],
    queryFn: async () => {
      const response = await patientsService.getAll(filters);
      if (response.error) {
        throw new Error(response.error);
      }
      let patientsArray: Patient[] = [];
      let paginationData = null;
      if (response.data?.data && Array.isArray(response.data.data)) {
        patientsArray = response.data.data;
        paginationData = response.data.pagination;
      } else if (Array.isArray(response.data)) {
        // Legacy: direct array response
        patientsArray = response.data;
      }
      // Map backend data to frontend format
      return { 
        patients: patientsArray.map((p: any) => ({
        id: p.id || p.patientId,
        patientId: p.patientId || p.id,
        fullName: p.fullName || p.name,
        name: p.fullName || p.name,
        dateOfBirth: p.dateOfBirth,
        gender: p.gender,
        contactNumber: p.contactNumber,
        email: p.email,
        address: p.address,
        emergencyContact: p.emergencyContact,
        medicalNotes: p.medicalNotes,
        status: (p.status?.toLowerCase() === 'active' ? 'active' : 'inactive') as "active" | "inactive",
        programs: p.enrollments?.map((e: any) => e.program?.name || e.program?.type || "").filter(Boolean) || [],
        enrollments: p.enrollments || [],
        progress: p.progress,
      })),
        pagination: paginationData,
      };
    },
  });

  const patients = patientsData?.patients || [];
  const pagination = patientsData?.pagination || null;

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: Partial<Patient>) => {
      const response = await patientsService.create(data);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      notify("Patient created successfully", "success");
    },
    onError: (error: Error) => {
      notify(error.message || "Failed to create patient", "error");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Patient>;
    }) => {
      const response = await patientsService.update(id, data);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      notify("Patient updated successfully", "success");
    },
    onError: (error: Error) => {
      notify(error.message || "Failed to update patient", "error");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await patientsService.delete(id);
      if (response.error) {
        throw new Error(response.error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      notify("Patient deleted successfully", "success");
    },
    onError: (error: Error) => {
      notify(error.message || "Failed to delete patient", "error");
    },
  });

  return {
    patients,
    pagination,
    loading: isLoading,
    error: error?.message || null,
    loadPatients: async () => {
      await refetch().catch(() => {
        // Error handled by query
      });
    },
    createPatient: createMutation.mutateAsync,
    updatePatient: (id: string, data: Partial<Patient>) =>
      updateMutation.mutateAsync({ id, data }),
    deletePatient: deleteMutation.mutateAsync,
  };
}
