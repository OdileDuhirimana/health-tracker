/**
 * Custom hook for managing dispensation data and operations with caching.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dispensationsService, patientsService, programsService, medicationsService } from "@/services";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/contexts/AuthContext";

interface DispensationRecord {
  id: string;
  patientId: string;
  programId: string;
  medicationId: string;
  patientName: string;
  program: string;
  medication: string;
  dosage: string;
  schedule: string;
  lastDispensed: string;
  nextDue: string;
  status: "Dispensed" | "Pending" | "Overdue";
  recentlyDispensed: boolean;
}

export function useDispensations() {
  const { notify } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Query for patients
  const {
    data: patientsData,
    isLoading: patientsLoading,
  } = useQuery({
    queryKey: ["patients", "for-dispensations"],
    queryFn: async () => {
      const response = await patientsService.getAll();
      if (response.error) {
        throw new Error(response.error);
      }
      const patientsArray = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];
      return patientsArray.map((p: any) => ({
        id: p.id || p.patientId,
        name: p.fullName || p.name,
      }));
    },
  });

  // Query for programs
  const {
    data: programsData,
    isLoading: programsLoading,
  } = useQuery({
    queryKey: ["programs", "for-dispensations", user?.id, user?.role],
    queryFn: async () => {
      const response = await programsService.getAll();
      if (response.error) {
        throw new Error(response.error);
      }
      const programsArray = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];
      return programsArray.map((p: any) => ({
        id: p.id,
        name: p.name,
        medications: p.medications || [],
        assignedStaff: p.assignedStaff || [],
      }));
    },
  });

  // Query for medications
  const {
    data: medicationsData,
    isLoading: medicationsLoading,
  } = useQuery({
    queryKey: ["medications", "for-dispensations", user?.id, user?.role],
    queryFn: async () => {
      const response = await medicationsService.getAll();
      if (response.error) {
        throw new Error(response.error);
      }
      // Handle paginated response: { data: [...], pagination: {...} }
      // or direct array
      let medicationsArray: any[] = [];
      if (Array.isArray(response.data)) {
        medicationsArray = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        medicationsArray = response.data.data;
      } else if (response.data && typeof response.data === 'object' && !response.data.data) {
        // If response.data is an object but not paginated, might be a single item
        medicationsArray = [response.data];
      }
      return medicationsArray.map((m: any) => ({
        id: m.id,
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        programType: m.programType,
        programs: m.programs || [],
      }));
    },
  });

  // Query for dispensations
  const {
    data: dispensationsData,
    isLoading: dispensationsLoading,
    refetch: refetchDispensations,
  } = useQuery({
    queryKey: ["dispensations", user?.id, user?.role],
    queryFn: async () => {
      const response = await dispensationsService.getAll();
      if (response.error) {
        throw new Error(response.error);
      }
      const dispensationsArray = Array.isArray(response.data) ? response.data : [];
      
      if (dispensationsArray.length > 0) {
        return dispensationsArray.map((disp: any) => {
          const dispensedDate = disp.dispensedAt ? new Date(disp.dispensedAt) : new Date();
          const isToday = dispensedDate.toDateString() === new Date().toDateString();
          const isYesterday = dispensedDate.toDateString() === new Date(Date.now() - 86400000).toDateString();
          
          let lastDispensed = "";
          if (isToday) {
            lastDispensed = `Today, ${dispensedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
          } else if (isYesterday) {
            lastDispensed = `Yesterday, ${dispensedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
          } else {
            lastDispensed = dispensedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
          }

          const nextDueDate = new Date(dispensedDate);
          const frequency = disp.medication?.frequency || 'Daily';
          if (frequency === 'Daily' || frequency === 'DAILY') {
            nextDueDate.setDate(nextDueDate.getDate() + 1);
          } else if (frequency === 'Twice Daily' || frequency === 'TWICE_DAILY') {
            nextDueDate.setHours(nextDueDate.getHours() + 12);
          } else if (frequency === 'Weekly' || frequency === 'WEEKLY') {
            nextDueDate.setDate(nextDueDate.getDate() + 7);
          } else if (frequency === 'Monthly' || frequency === 'MONTHLY') {
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);
          }
          
          const nextIsToday = nextDueDate.toDateString() === new Date().toDateString();
          const nextDue = nextIsToday 
            ? `Today, ${nextDueDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
            : nextDueDate.toDateString() === new Date(Date.now() + 86400000).toDateString()
            ? `Tomorrow, ${nextDueDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
            : nextDueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

          const schedule = `${frequency}`;

          const now = new Date();
          const hoursSinceDispensed = (now.getTime() - dispensedDate.getTime()) / (1000 * 60 * 60);
          let status: "Dispensed" | "Pending" | "Overdue" = "Dispensed";
          if (nextDueDate < now) {
            status = "Overdue";
          } else if (hoursSinceDispensed < 24) {
            status = "Pending";
          }

          return {
            id: disp.id,
            patientId: disp.patientId,
            programId: disp.programId,
            medicationId: disp.medicationId,
            patientName: disp.patient?.fullName || disp.patient?.name || "Unknown Patient",
            program: disp.program?.name || "Unknown Program",
            medication: disp.medication?.name || "Unknown Medication",
            dosage: disp.medication?.dosage || "—",
            schedule: schedule,
            lastDispensed: lastDispensed,
            nextDue: nextDue,
            status: status,
            recentlyDispensed: hoursSinceDispensed < 2,
          };
        });
      }
      return [];
    },
  });

  // Query for tracking table - map shortened keys back to full keys
  const {
    data: trackingTableData,
    isLoading: trackingLoading,
  } = useQuery({
    queryKey: ["dispensations", "tracking-table", user?.id, user?.role],
    queryFn: async () => {
      const response = await dispensationsService.getTrackingTable();
      if (response.error) {
        throw new Error(response.error);
      }
      // Handle paginated or array response
      let dataArray: any[] = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          dataArray = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          dataArray = response.data.data;
        }
      }
      // Map shortened keys back to full keys for frontend compatibility
      return {
        data: dataArray.map((item: any) => ({
          patientId: item.pId || item.patientId,
          patientName: item.pName || item.patientName,
          medicationId: item.mId || item.medicationId,
          medicationName: item.mName || item.medicationName,
          dosage: item.d || item.dosage,
          frequency: item.f || item.frequency,
          programId: item.prId || item.programId,
          programName: item.prName || item.programName,
          lastCollected: item.lc || item.lastCollected,
          nextDue: item.nd || item.nextDue,
          adherenceRate: item.ar || item.adherenceRate,
        })),
        pagination: response.data?.pagination,
      };
    },
  });

  // Query for overdue count
  const {
    data: overdueCountData,
    isLoading: overdueLoading,
  } = useQuery({
    queryKey: ["dispensations", "overdue-count", user?.id, user?.role],
    queryFn: async () => {
      const response = await dispensationsService.getOverdueCount();
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data?.count || 0;
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: {
      patientId: string;
      programId: string;
      medicationId: string;
      dispensedAt: string;
      notes?: string;
    }) => {
      const response = await dispensationsService.create(data);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispensations"] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      notify("Medication recorded successfully", "success");
    },
    onError: (error: Error) => {
      // Check for duplicate error message
      const errorMsg = error.message.toLowerCase();
      if (errorMsg.includes('duplicate') || errorMsg.includes('already dispensed')) {
        notify(error.message || "This medication was already dispensed. Duplicate prevented.", "error");
      } else {
        notify(error.message || "Failed to record medication", "error");
      }
    },
  });

  return {
    dispensations: dispensationsData || [],
    patients: patientsData || [],
    programs: programsData || [],
    medications: medicationsData || [],
    trackingTable: trackingTableData?.data || [],
    overdueCount: overdueCountData || 0,
    loading: dispensationsLoading || patientsLoading || programsLoading || medicationsLoading || trackingLoading || overdueLoading,
    loadPatients: () => queryClient.invalidateQueries({ queryKey: ["patients", "for-dispensations"] }),
    loadPrograms: () => queryClient.invalidateQueries({ queryKey: ["programs", "for-dispensations"] }),
    loadMedications: () => queryClient.invalidateQueries({ queryKey: ["medications", "for-dispensations"] }),
    loadDispensations: async () => {
      await refetchDispensations().catch(() => {
        // Error handled by query
      });
    },
    loadOverdueCount: () => queryClient.invalidateQueries({ queryKey: ["dispensations", "overdue-count"] }),
    recordDispensation: createMutation.mutateAsync,
  };
}
