/** Form component for dispensing medications to patients. */
"use client";

import { useState, useEffect } from "react";
import { FormField, FormInput, FormTextarea, FormActions } from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { useAuth } from "@/contexts/AuthContext";
import { patientsApi, programsApi, medicationsApi } from "@/lib/api";

interface DispensationFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    patientId: string;
    programId: string;
    medicationId: string;
    dispensedAt: string;
    notes?: string;
  }) => Promise<void>;
  patients?: Array<{ id: string; name: string }>;
  programs?: Array<{ id: string; name: string }>;
  medications?: Array<{ id: string; name: string; dosage: string; frequency: string }>;
  quickDispenseData?: { patientId?: string; programId?: string; medicationId?: string };
  loading?: boolean;
}

export function DispensationForm({
  open,
  onClose,
  onSubmit,
  patients: initialPatients = [],
  programs: initialPrograms = [],
  medications: initialMedications = [],
  quickDispenseData,
  loading = false,
}: DispensationFormProps) {
  const { user } = useAuth();
  const [selectedPatientId, setSelectedPatientId] = useState(quickDispenseData?.patientId || "");
  const [selectedProgramId, setSelectedProgramId] = useState(quickDispenseData?.programId || "");
  const [selectedMedicationId, setSelectedMedicationId] = useState(quickDispenseData?.medicationId || "");
  const [patients, setPatients] = useState<Array<{ id: string; name: string }>>(initialPatients);
  const [programs, setPrograms] = useState<Array<{ id: string; name: string; medications?: any[] }>>(initialPrograms);
  const [allMedications, setAllMedications] = useState<Array<{ id: string; name: string; dosage: string; frequency: string }>>(initialMedications);
  const [availableMedications, setAvailableMedications] = useState<Array<{ id: string; name: string; dosage: string; frequency: string }>>([]);
  const [availablePatients, setAvailablePatients] = useState<Array<{ id: string; name: string }>>([]);
  const [duplicateError, setDuplicateError] = useState<{message: string; lastDispensedAt?: string; frequency?: string; hoursAgo?: number} | null>(null);

  // Load data from backend when modal opens if not provided
  useEffect(() => {
    if (open) {
      if (patients.length === 0) loadPatients();
      if (programs.length === 0) loadPrograms();
      if (allMedications.length === 0) loadMedications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const loadPatients = async () => {
    try {
      const response = await patientsApi.getAll();
      if (response.data) {
        let patientsData: any[] = [];
        if (Array.isArray(response.data)) {
          patientsData = response.data;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          patientsData = response.data.data;
        }
        setPatients(patientsData.map((p: any) => ({
          id: p.id,
          name: p.fullName || p.name,
        })));
      }
    } catch (error) {
      // Error handled silently
    }
  };

  const loadPrograms = async () => {
    try {
      const response = await programsApi.getAll();
      if (response.data) {
        let programsData: any[] = [];
        if (Array.isArray(response.data)) {
          programsData = response.data;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          programsData = response.data.data;
        }
        setPrograms(programsData.map((p: any) => ({ id: p.id, name: p.name })));
      }
    } catch (error) {
      // Error handled silently
    }
  };

  const loadMedications = async () => {
    try {
      const response = await medicationsApi.getAll();
      if (response.data) {
        let medicationsData: any[] = [];
        if (Array.isArray(response.data)) {
          medicationsData = response.data;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          medicationsData = response.data.data;
        }
        const meds = medicationsData.map((m: any) => ({
          id: m.id,
          name: m.name,
          dosage: m.dosage || "",
          frequency: m.frequency || "",
        }));
        setAllMedications(meds);
        // Filter medications based on selected program
        if (selectedProgramId) {
          filterMedicationsByProgram(selectedProgramId, meds, programs);
        } else {
          setAvailableMedications(meds);
        }
      }
    } catch (error) {
      // Error handled silently
    }
  };

  // Filter medications and patients when program is selected
  const filterMedicationsByProgram = (programId: string, meds: any[], progs: any[]) => {
    const program = progs.find(p => p.id === programId);
    if (program && program.medications) {
      const programMedIds = program.medications.map((m: any) => typeof m === 'string' ? m : m.id);
      setAvailableMedications(meds.filter(m => programMedIds.includes(m.id)));
    } else {
      setAvailableMedications(meds);
    }
  };

  // Filter patients when program is selected
  useEffect(() => {
    if (selectedProgramId) {
      loadPatientsForProgram(selectedProgramId);
      if (allMedications.length > 0 && programs.length > 0) {
        filterMedicationsByProgram(selectedProgramId, allMedications, programs);
      }
    } else {
      setAvailablePatients(patients);
      setAvailableMedications(allMedications);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProgramId, allMedications.length, programs.length]);

  // For Healthcare Staff, filter programs
  const availablePrograms = user?.role === "Healthcare Staff"
    ? programs.filter((p: any) => 
        p.assignedStaff?.some((staff: any) => 
          (staff.id === user.id || staff.userId === user.id) || 
          (typeof staff === 'string' && staff === user.id)
        )
      )
    : programs;

  const loadPatientsForProgram = async (programId: string) => {
    try {
      const response = await patientsApi.getAll({ programId });
      if (response.data) {
        const patientsArray = Array.isArray(response.data)
          ? response.data
          : response.data.data || [];
        setAvailablePatients(patientsArray.map((p: any) => ({
          id: p.id || p.patientId,
          name: p.fullName || p.name,
        })));
      }
    } catch (error) {
      setAvailablePatients([]);
    }
  };

  useEffect(() => {
    if (quickDispenseData) {
      setSelectedPatientId(quickDispenseData.patientId || "");
      setSelectedProgramId(quickDispenseData.programId || "");
      setSelectedMedicationId(quickDispenseData.medicationId || "");
    }
  }, [quickDispenseData]);

  useEffect(() => {
    if (!open) {
      setSelectedPatientId("");
      setSelectedProgramId("");
      setSelectedMedicationId("");
      setDuplicateError(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDuplicateError(null); // Clear previous errors
    const formData = new FormData(e.currentTarget);

    try {
      await onSubmit({
        patientId: selectedPatientId || formData.get("patientId")?.toString() || "",
        programId: selectedProgramId || formData.get("programId")?.toString() || "",
        medicationId: selectedMedicationId || formData.get("medicationId")?.toString() || "",
        dispensedAt: formData.get("dispensedAt")?.toString() || new Date().toISOString(),
        notes: formData.get("notes")?.toString(),
      });
    } catch (error: any) {
      // Check if it's a duplicate error
      if (error?.message && (error.message.includes('duplicate') || error.message.includes('already dispensed'))) {
        setDuplicateError({
          message: error.message,
          lastDispensedAt: error.lastDispensedAt,
          frequency: error.frequency,
          hoursAgo: error.hoursAgo
        });
      }
      throw error; // Re-throw to let the hook handle toast notification
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={quickDispenseData ? "Quick Dispense" : "Record Dispensation"}
      size="md"
    >
      <form className="space-y-3" onSubmit={handleSubmit}>
        {duplicateError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-800 mb-1">Duplicate Dispensation Prevented</h3>
                <p className="text-sm text-red-700 mb-2">{duplicateError.message}</p>
                {duplicateError.lastDispensedAt && (
                  <div className="text-xs text-red-600 space-y-1">
                    <p><span className="font-medium">Last dispensed:</span> {new Date(duplicateError.lastDispensedAt).toLocaleString()}</p>
                    {duplicateError.hoursAgo && (
                      <p><span className="font-medium">Time ago:</span> {duplicateError.hoursAgo} hours ago</p>
                    )}
                    {duplicateError.frequency && (
                      <p><span className="font-medium">Frequency:</span> {duplicateError.frequency}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        <FormField label="Program" required error={undefined} hint="Select program first">
          <SearchableSelect
            name="programId"
            value={selectedProgramId}
            onChange={(value) => {
              setSelectedProgramId(value);
              setSelectedPatientId(""); // Reset patient when program changes
              setSelectedMedicationId(""); // Reset medication when program changes
            }}
            disabled={!!quickDispenseData}
            required
            placeholder="Type to search program..."
            options={availablePrograms.map((p) => ({
              value: p.id,
              label: p.name,
            }))}
          />
        </FormField>

        <FormField label="Patient" required error={undefined} hint={selectedProgramId ? "Patients enrolled in selected program" : "Select program first"}>
          <SearchableSelect
            name="patientId"
            value={selectedPatientId}
            onChange={(value) => setSelectedPatientId(value)}
            disabled={!!quickDispenseData || !selectedProgramId}
            required
            placeholder={selectedProgramId ? "Type to search patient..." : "Select program first"}
            options={selectedProgramId ? availablePatients.map((p) => ({
              value: p.id,
              label: `${p.name} (${p.id})`,
            })) : []}
          />
        </FormField>

        <FormField label="Medication" required error={undefined} hint={selectedProgramId ? "Medications assigned to selected program" : "Select program first"}>
          <SearchableSelect
            name="medicationId"
            value={selectedMedicationId}
            onChange={(value) => setSelectedMedicationId(value)}
            disabled={!!quickDispenseData || !selectedProgramId}
            required
            placeholder={selectedProgramId ? "Type to search medication..." : "Select program first"}
            options={selectedProgramId ? availableMedications.map((m) => ({
              value: m.id,
              label: `${m.name} ${m.dosage} (${m.frequency})`,
            })) : []}
          />
        </FormField>

        <FormField label="Dispensed Date & Time" required error={undefined}>
          <FormInput
            name="dispensedAt"
            type="datetime-local"
            defaultValue={new Date().toISOString().slice(0, 16)}
            required
          />
        </FormField>

        <FormField label="Notes" hint="(optional)" error={undefined}>
          <FormTextarea
            name="notes"
            rows={2}
            placeholder="Optional notes..."
          />
        </FormField>

        <FormActions
          submitLabel="Confirm"
          loading={loading}
          showCancel={false}
        />
      </form>
    </Modal>
  );
}

