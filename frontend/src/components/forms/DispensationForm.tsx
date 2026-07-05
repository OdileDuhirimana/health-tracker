/** Form component for dispensing medications to patients. */
"use client";

import { useState, useEffect } from "react";
import { FormField, FormInput, FormTextarea, FormActions } from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { useAuth } from "@/contexts/AuthContext";
import { patientsApi, programsApi, medicationsApi } from "@/lib/api";
import { Medication, Patient, Program } from "@/types";
import { normalizeListResponse } from "@/utils/api";

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
  programs?: Array<{ id: string; name: string; assignedStaff?: Program["assignedStaff"]; medications?: Program["medications"] }>;
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
  const [programs, setPrograms] = useState<Array<{ id: string; name: string; assignedStaff?: Program["assignedStaff"]; medications?: Program["medications"] }>>(initialPrograms);
  const [allMedications, setAllMedications] = useState<Array<{ id: string; name: string; dosage: string; frequency: string }>>(initialMedications);
  const [availableMedications, setAvailableMedications] = useState<Array<{ id: string; name: string; dosage: string; frequency: string }>>([]);
  const [availablePatients, setAvailablePatients] = useState<Array<{ id: string; name: string }>>([]);
  // The backend only ever returns a human-readable message string for
  // duplicate-dispensation conflicts (see dispensations.service.ts) — there
  // is no structured payload with separate lastDispensedAt/frequency/
  // hoursAgo fields, so we only track the message here.
  const [duplicateError, setDuplicateError] = useState<{ message: string } | null>(null);

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
        const patientsData = normalizeListResponse<Patient>(response.data);
        setPatients(patientsData.map((p) => ({
          id: p.id,
          name: p.fullName || p.name,
        })));
      }
    } catch {
      // Error handled silently
    }
  };

  const loadPrograms = async () => {
    try {
      const response = await programsApi.getAll();
      if (response.data) {
        const programsData = normalizeListResponse<Program>(response.data);
        setPrograms(programsData.map((p) => ({ id: p.id, name: p.name, assignedStaff: p.assignedStaff, medications: p.medications })));
      }
    } catch {
      // Error handled silently
    }
  };

  const loadMedications = async () => {
    try {
      const response = await medicationsApi.getAll();
      if (response.data) {
        const medicationsData = normalizeListResponse<Medication>(response.data);
        const meds = medicationsData.map((m) => ({
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
    } catch {
      // Error handled silently
    }
  };

  // Filter medications and patients when program is selected
  const filterMedicationsByProgram = (
    programId: string,
    meds: Array<{ id: string; name: string; dosage: string; frequency: string }>,
    progs: Array<{ id: string; medications?: Program["medications"] }>
  ) => {
    const program = progs.find(p => p.id === programId);
    if (program && program.medications) {
      const programMedIds = program.medications.map((m) => m.id);
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
    ? programs.filter((p) =>
        p.assignedStaff?.some(
          (staff) => staff.id === user.id || staff.userId === user.id
        )
      )
    : programs;

  const loadPatientsForProgram = async (programId: string) => {
    try {
      const response = await patientsApi.getAll({ programId });
      if (response.data) {
        const patientsArray = normalizeListResponse<Patient>(response.data);
        setAvailablePatients(patientsArray.map((p) => ({
          id: p.id || p.patientId || "",
          name: p.fullName || p.name,
        })));
      }
    } catch {
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
    } catch (error) {
      // Check if it's a duplicate error
      const message = error instanceof Error ? error.message : "";
      if (message && (message.toLowerCase().includes('duplicate') || message.toLowerCase().includes('already dispensed'))) {
        setDuplicateError({ message });
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

