/** Form component for creating and editing medications. */
"use client";

import { useState, useEffect } from "react";
import { FormField, FormInput, FormSelect, FormActions } from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { programsApi } from "@/lib/api";

interface MedicationFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { 
    name: string; 
    dosage: string; 
    frequency: string; 
    programType: string;
    assignedProgramIds?: string[];
    status?: "Active" | "Inactive";
  }) => Promise<void>;
  programs?: Array<{ id: string; name: string; type: string }>;
  loading?: boolean;
  initialValues?: {
    name?: string;
    dosage?: string;
    frequency?: string;
    programType?: string;
    assignedProgramIds?: string[];
    status?: "Active" | "Inactive";
  };
}

export function MedicationForm({ open, onClose, onSubmit, programs: initialPrograms = [], loading = false, initialValues }: MedicationFormProps) {
  const [selectedProgramType, setSelectedProgramType] = useState(initialValues?.programType || "");
  const [allPrograms, setAllPrograms] = useState<Array<{ id: string; name: string; type: string }>>(initialPrograms);

  // Update programs when initialPrograms changes
  useEffect(() => {
    if (initialPrograms && initialPrograms.length > 0) {
      setAllPrograms(initialPrograms);
    }
  }, [initialPrograms]);

  // Update selectedProgramType when initialValues changes
  useEffect(() => {
    if (initialValues?.programType && open) {
      setSelectedProgramType(initialValues.programType);
    } else if (open && !initialValues) {
      setSelectedProgramType("");
    }
  }, [initialValues?.programType, open]);

  // Load programs from backend when modal opens if not provided
  useEffect(() => {
    if (open && allPrograms.length === 0) {
      loadPrograms();
    }
  }, [open]);

  // Filter programs based on selected program type
  const programs = selectedProgramType
    ? allPrograms.filter(p => p.type === selectedProgramType)
    : allPrograms;

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
        // Transform to the format needed by the form
        const formattedPrograms = programsData.map((p: any) => ({
          id: p.id,
          name: p.name,
          type: p.type,
        }));
        setAllPrograms(formattedPrograms);
      }
    } catch (error) {
      // Keep empty array on error
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const assignedProgramIds = Array.from(formData.getAll("assignedProgramIds")).map(String);
    
    await onSubmit({
      name: formData.get("name")?.toString() || "",
      dosage: formData.get("dosage")?.toString() || "",
      frequency: formData.get("frequency")?.toString() || "",
      programType: formData.get("programType")?.toString() || "",
      assignedProgramIds: assignedProgramIds.length > 0 ? assignedProgramIds : undefined,
      status: formData.get("status")?.toString() as "Active" | "Inactive" | undefined || initialValues?.status || "Active",
    });
  };

  const programTypeOptions = [
    { value: "Mental Health", label: "Mental Health" },
    { value: "Vaccination", label: "Vaccination" },
    { value: "Diabetes", label: "Diabetes" },
    { value: "Other", label: "Other" },
  ];

  return (
    <Modal open={open} onClose={onClose} title={initialValues ? "Edit Medication" : "Add Medication"} size="md">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormField label="Medication Name" required error={undefined}>
          <FormInput
            name="name"
            autoFocus
            placeholder="e.g., Sertraline"
            defaultValue={initialValues?.name}
            required
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Dosage" required error={undefined}>
            <FormInput
              name="dosage"
              placeholder="e.g., 50mg"
              defaultValue={initialValues?.dosage}
              required
            />
          </FormField>
          <FormField label="Frequency" required error={undefined}>
            <FormSelect
              name="frequency"
              defaultValue={initialValues?.frequency || "Daily"}
              required
            >
              <option>Daily</option>
              <option>Twice Daily</option>
              <option>Weekly</option>
              <option>Monthly</option>
            </FormSelect>
          </FormField>
        </div>

        <FormField label="Program Type" required hint="(This helps categorize medications and filter available programs)" error={undefined}>
          <SearchableSelect
            name="programType"
            options={programTypeOptions}
            placeholder="Select program type..."
            value={selectedProgramType}
            onChange={(value) => {
              setSelectedProgramType(value);
            }}
            required
          />
        </FormField>

        {selectedProgramType && programs.length === 0 && allPrograms.length > 0 && (
          <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
            No programs found for the selected program type "{selectedProgramType}". You can still create the medication and assign it to programs later.
          </div>
        )}

        {programs.length > 0 && (
          <FormField label="Assign to Specific Programs" hint="(optional)" error={undefined}>
            <div className="space-y-2 max-h-40 overflow-auto border border-gray-200 rounded-lg p-3">
              {programs.map((program) => (
                <label key={program.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors">
                  <input
                    type="checkbox"
                    name="assignedProgramIds"
                    value={program.id}
                    defaultChecked={initialValues?.assignedProgramIds?.includes(program.id)}
                    className="text-[#0066cc] rounded border-gray-300 focus:ring-[#0066cc]"
                  />
                  <span className="flex-1">
                    <span className="font-medium">{program.name}</span>
                    <span className="text-gray-500 text-xs ml-2">({program.type})</span>
                  </span>
                </label>
              ))}
            </div>
          </FormField>
        )}

        {initialValues && (
          <FormField label="Status" required error={undefined}>
            <FormSelect name="status" defaultValue={initialValues?.status || "Active"} required>
              <option>Active</option>
              <option>Inactive</option>
            </FormSelect>
          </FormField>
        )}

        <FormActions
          submitLabel={initialValues ? "Save Changes" : "Create Medication"}
          loading={loading}
          showCancel={false}
        />
      </form>
    </Modal>
  );
}

