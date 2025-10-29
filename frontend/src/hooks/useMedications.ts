/** Custom hook for managing medication data and operations. */

import { useState, useEffect, useCallback } from "react";
import { medicationsService } from "@/services";
import { Medication } from "@/types";
import { useToast } from "@/components/Toast";

export function useMedications(search?: string, filters?: { page?: number; limit?: number }) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { notify } = useToast();

  const loadMedications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await medicationsService.getAll(search, filters);
      if (response.data) {
        let medicationsArray: Medication[] = [];
        if (Array.isArray(response.data)) {
          medicationsArray = response.data;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          medicationsArray = response.data.data;
        }
        setMedications(medicationsArray);
      } else if (response.error) {
        setError(response.error);
        notify(response.error, "error");
        setMedications([]);
      } else {
        setMedications([]);
      }
    } catch (error) {
      const errorMessage = "Failed to load medications";
      setError(errorMessage);
      notify(errorMessage, "error");
      setMedications([]);
    } finally {
      setLoading(false);
    }
  }, [search, filters, notify]);

  useEffect(() => {
    loadMedications();
  }, [loadMedications]);

  const createMedication = useCallback(async (data: Partial<Medication>) => {
    setLoading(true);
    try {
      const response = await medicationsService.create({
        name: data.name!,
        dosage: data.dosage!,
        frequency: data.frequency!,
        programType: data.programType!,
        programIds: [],
      });
      if (response.data) {
        notify("Medication created successfully", "success");
        await loadMedications();
        return response.data;
      } else {
        notify(response.error || "Failed to create medication", "error");
        throw new Error(response.error || "Failed to create medication");
      }
    } finally {
      setLoading(false);
    }
  }, [loadMedications, notify]);

  const updateMedication = useCallback(async (id: string, data: Partial<Medication>) => {
    setLoading(true);
    try {
      const response = await medicationsService.update(id, data);
      if (response.data) {
        notify("Medication updated successfully", "success");
        await loadMedications();
        return response.data;
      } else {
        notify(response.error || "Failed to update medication", "error");
        throw new Error(response.error || "Failed to update medication");
      }
    } finally {
      setLoading(false);
    }
  }, [loadMedications, notify]);

  const deleteMedication = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const response = await medicationsService.delete(id);
      if (!response.error) {
        notify("Medication deleted successfully", "success");
        await loadMedications();
      } else {
        notify(response.error || "Failed to delete medication", "error");
        throw new Error(response.error || "Failed to delete medication");
      }
    } finally {
      setLoading(false);
    }
  }, [loadMedications, notify]);

  return {
    medications,
    loading,
    error,
    loadMedications,
    createMedication,
    updateMedication,
    deleteMedication,
  };
}

