/** Custom hook for managing program data and operations with caching. */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { programsService } from "@/services";
import { Program, ProgramFilters } from "@/types";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/contexts/AuthContext";

export function usePrograms(filters?: ProgramFilters) {
  const { notify } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: programsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["programs", filters, user?.id, user?.role],
    queryFn: async () => {
      const response = await programsService.getAll(filters);
      if (response.error) {
        throw new Error(response.error);
      }
      let programsArray: Program[] = [];
      let paginationData = null;
      if (response.data?.data && Array.isArray(response.data.data)) {
        programsArray = response.data.data;
        paginationData = response.data.pagination;
      } else if (Array.isArray(response.data)) {
        // Legacy: direct array response
        programsArray = response.data;
      }
      return { programs: programsArray, pagination: paginationData };
    },
  });

  // Separate assigned programs for Healthcare Staff
  const programs = programsData?.programs || [];
  const pagination = programsData?.pagination || null;
  const assignedPrograms =
    user?.role === "Healthcare Staff" && user?.id
      ? programs.filter((p: any) =>
          p.assignedStaff?.some(
            (staff: any) => staff.id === user.id || staff.userId === user.id
          )
        )
      : [];
  const allPrograms =
    user?.role === "Healthcare Staff"
      ? programs.filter(
          (p: any) =>
            !p.assignedStaff?.some(
              (staff: any) => staff.id === user.id || staff.userId === user.id
            )
        )
      : programs;

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      type: string;
      description?: string;
      sessionFreq?: string;
      medicationIds?: string[];
      staffIds?: string[];
      components?: Array<{
        type: 'session' | 'consultation' | 'group_discussion';
        name: string;
        description?: string;
      }>;
    }) => {
      const response = await programsService.create(data);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      notify("Program created successfully", "success");
    },
    onError: (error: Error) => {
      notify(error.message || "Failed to create program", "error");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Program> & {
        medicationIds?: string[];
        staffIds?: string[];
        components?: Array<{
          type: 'session' | 'consultation' | 'group_discussion';
          name: string;
          description?: string;
        }>;
        sessionFreq?: string;
      };
    }) => {
      const response = await programsService.update(id, data);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      notify("Program updated successfully", "success");
    },
    onError: (error: Error) => {
      notify(error.message || "Failed to update program", "error");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await programsService.delete(id);
      if (response.error) {
        throw new Error(response.error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      notify("Program deleted successfully", "success");
    },
    onError: (error: Error) => {
      notify(error.message || "Failed to delete program", "error");
    },
  });

  return {
    programs: allPrograms,
    assignedPrograms,
    pagination,
    loading: isLoading,
    error: error?.message || null,
    loadPrograms: async () => {
      await refetch().catch(() => {
        // Error handled by query
      });
    },
    createProgram: createMutation.mutateAsync,
    updateProgram: (id: string, data: Partial<Program>) =>
      updateMutation.mutateAsync({ id, data }),
    deleteProgram: deleteMutation.mutateAsync,
  };
}
