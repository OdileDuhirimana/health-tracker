/** Form component for creating and editing program information. */
"use client";

import { useState, useEffect } from "react";
import { FormField, FormInput, FormTextarea, FormSelect, FormActions } from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { medicationsApi, usersApi } from "@/lib/api";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface ProgramComponent {
  type: 'session' | 'consultation' | 'group_discussion';
  name: string;
  description?: string;
}

interface ProgramFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  medications?: Array<{ id: string; name: string; dosage: string; frequency: string; programType?: string; programs?: any[] }>;
  loading?: boolean;
  initialValues?: {
    name?: string;
    type?: string;
    description?: string;
    sessionFreq?: string;
    duration?: number;
    durationUnit?: string;
    medications?: string[];
    components?: ProgramComponent[];
    staffIds?: string[];
  };
}

export function ProgramForm({ open, onClose, onSubmit, medications: initialMedications = [], loading = false, initialValues }: ProgramFormProps) {
  const [selectedProgramType, setSelectedProgramType] = useState(initialValues?.type || "");
  const [medications, setMedications] = useState(initialMedications);
  const [allStaff, setAllStaff] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [selectedMedicationIds, setSelectedMedicationIds] = useState<string[]>(initialValues?.medications || []);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>(initialValues?.staffIds || []);
  const [components, setComponents] = useState<ProgramComponent[]>(initialValues?.components || []);
  const [duration, setDuration] = useState<number>(initialValues?.duration || 12);
  const [durationUnit, setDurationUnit] = useState<string>(initialValues?.durationUnit || 'weeks');

  // Update state when initialValues changes
  useEffect(() => {
    if (initialValues && open) {
      setSelectedProgramType(initialValues.type || "");
      setSelectedMedicationIds(initialValues.medications || []);
      setSelectedStaffIds(initialValues.staffIds || []);
      setComponents(initialValues.components || []);
      setDuration(initialValues.duration || 12);
      setDurationUnit(initialValues.durationUnit || 'weeks');
    } else if (open && !initialValues) {
      // Reset for new program
      setSelectedProgramType("");
      setSelectedMedicationIds([]);
      setSelectedStaffIds([]);
      setComponents([]);
      setDuration(12);
      setDurationUnit('weeks');
    }
  }, [initialValues, open]);

  useEffect(() => {
    if (open) {
      if (medications.length === 0) {
      loadMedications();
      }
      loadStaff();
    }
  }, [open]);

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
        setMedications(medicationsData);
      }
    } catch (error) {
      setMedications([]);
    }
  };

  const loadStaff = async () => {
    try {
      const response = await usersApi.getAll();
      if (response.data) {
        const staffData = Array.isArray(response.data) 
          ? response.data 
          : ((response.data as any)?.data || []);
        // Filter only Healthcare Staff
        const healthcareStaff = staffData.filter((u: any) => u.role === "Healthcare Staff");
        setAllStaff(healthcareStaff.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
        })));
      }
    } catch (error) {
      setAllStaff([]);
    }
  };

  const getFilteredMedications = (programType: string) => {
    if (!programType) return medications;
    return medications.filter((m) => !m.programType || m.programType === programType || m.programs?.some((p: any) => p.type === programType));
  };

  const addComponent = () => {
    setComponents([...components, { type: 'session', name: '', description: '' }]);
  };

  const removeComponent = (index: number) => {
    setComponents(components.filter((_, i) => i !== index));
  };

  const updateComponent = (index: number, field: keyof ProgramComponent, value: string) => {
    const updated = [...components];
    updated[index] = { ...updated[index], [field]: value };
    setComponents(updated);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    await onSubmit({
      name: formData.get("name")?.toString() || "",
      type: selectedProgramType || formData.get("type")?.toString() || "",
      description: formData.get("description")?.toString() || "",
      sessionFreq: formData.get("sessionFreq")?.toString() || "weekly",
      duration: duration,
      durationUnit: durationUnit,
      medicationIds: selectedMedicationIds.length > 0 ? selectedMedicationIds : undefined,
      staffIds: selectedStaffIds.length > 0 ? selectedStaffIds : undefined,
      components: components.filter(c => c.name.trim() !== "").length > 0 
        ? components.filter(c => c.name.trim() !== "")
        : undefined,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={initialValues ? "Edit Program" : "Add Program"} size="lg">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormField label="Program Name" required error={undefined}>
          <FormInput
            data-testid="program-name-input"
            name="name"
            autoFocus
            placeholder="e.g., Mental Health Support"
            defaultValue={initialValues?.name}
            required
          />
        </FormField>

        <FormField label="Program Type" required error={undefined}>
          <SearchableSelect
            name="type"
            value={selectedProgramType}
            onChange={(value) => setSelectedProgramType(value)}
            required
            placeholder="Select or search program type..."
            options={[
              { value: "Mental Health", label: "Mental Health" },
              { value: "Vaccination", label: "Vaccination" },
              { value: "Diabetes", label: "Diabetes" },
              { value: "Other", label: "Other" },
            ]}
          />
        </FormField>

        <FormField label="Description" error={undefined}>
          <FormTextarea
            name="description"
            rows={3}
            placeholder="Enter program description..."
            defaultValue={initialValues?.description}
          />
        </FormField>

        <FormField label="Session Frequency" error={undefined}>
          <div className="flex gap-4 text-sm text-gray-700">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="sessionFreq" 
                value="daily" 
                defaultChecked={initialValues?.sessionFreq === "daily"}
                className="text-[#0066cc]" 
              /> 
              Daily
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="sessionFreq" 
                value="weekly" 
                defaultChecked={!initialValues || initialValues.sessionFreq === "weekly" || initialValues.sessionFreq === undefined}
                className="text-[#0066cc]" 
              /> 
              Weekly
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="sessionFreq" 
                value="monthly" 
                defaultChecked={initialValues?.sessionFreq === "monthly"}
                className="text-[#0066cc]" 
              /> 
              Monthly
            </label>
          </div>
        </FormField>

        <FormField 
          label="Program Duration" 
          hint="Specify how long this program runs"
          error={undefined}
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <input
                type="number"
                min="1"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066cc] focus:border-transparent"
                placeholder="12"
              />
            </div>
            <div>
              <select
                value={durationUnit}
                onChange={(e) => setDurationUnit(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066cc] focus:border-transparent"
              >
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
              </select>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Computed: <span className="font-semibold text-[#0066cc]">
              {durationUnit === 'days' ? duration : 
               durationUnit === 'weeks' ? duration * 7 : 
               duration * 30} days
            </span>
          </p>
        </FormField>

        <FormField 
          label="Program Components" 
          hint="Define the types of activities in this program (sessions, consultations, group discussions)"
          error={undefined}
        >
          <div className="space-y-3">
            {components.map((component, index) => (
              <div key={index} className="flex gap-2 items-start p-3 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex-1 grid grid-cols-12 gap-2">
                  <div className="col-span-3">
                    <select
                      value={component.type}
                      onChange={(e) => updateComponent(index, 'type', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066cc] focus:border-transparent"
                    >
                      <option value="session">Session</option>
                      <option value="consultation">Consultation</option>
                      <option value="group_discussion">Group Discussion</option>
                    </select>
                  </div>
                  <div className="col-span-5">
                    <input
                      type="text"
                      value={component.name}
                      onChange={(e) => updateComponent(index, 'name', e.target.value)}
                      placeholder="Component name"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066cc] focus:border-transparent"
                    />
                  </div>
                  <div className="col-span-4">
                    <input
                      type="text"
                      value={component.description || ""}
                      onChange={(e) => updateComponent(index, 'description', e.target.value)}
                      placeholder="Description (optional)"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066cc] focus:border-transparent"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeComponent(index)}
                  className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addComponent}
              className="w-full px-4 py-2 text-sm border border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-[#0066cc] hover:text-[#0066cc] transition-colors flex items-center justify-center gap-2"
            >
              <PlusIcon className="h-4 w-4" />
              Add Component
            </button>
          </div>
        </FormField>

        <FormField label="Assign Staff" hint="(optional) Select staff members to assign to this program" error={undefined}>
          <div className="space-y-3">
            <SearchableSelect
              placeholder="Search and select staff members..."
              options={allStaff
                .filter(s => !selectedStaffIds.includes(s.id))
                .map(s => ({
                  value: s.id,
                  label: `${s.name} (${s.email})`,
                }))}
              value=""
              onChange={(staffId) => {
                if (staffId && !selectedStaffIds.includes(staffId)) {
                  setSelectedStaffIds([...selectedStaffIds, staffId]);
                }
              }}
            />
            {selectedStaffIds.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                <div className="text-xs font-semibold text-gray-700 mb-2">Assigned Staff:</div>
                {selectedStaffIds.map((staffId) => {
                  const staff = allStaff.find(s => s.id === staffId);
                  if (!staff) return null;
                  return (
                    <div key={staffId} className="flex items-center justify-between text-sm text-gray-700 p-2 bg-white rounded border border-gray-200">
                      <span>
                        <span className="font-medium">{staff.name}</span>
                        <span className="text-gray-500 text-xs ml-2">({staff.email})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedStaffIds(selectedStaffIds.filter(id => id !== staffId))}
                        className="text-red-600 hover:text-red-700 text-xs font-semibold"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </FormField>

        <FormField label="Assign Medications" hint="(optional) Select medications to assign to this program" error={undefined}>
          {selectedProgramType ? (
            <div className="space-y-3">
              <SearchableSelect
                placeholder="Search and select medications..."
                options={getFilteredMedications(selectedProgramType).map(m => ({
                  value: m.id,
                  label: `${m.name} ${m.dosage} (${m.frequency})`,
                }))}
                value=""
                onChange={(medicationId) => {
                  if (medicationId && !selectedMedicationIds.includes(medicationId)) {
                    setSelectedMedicationIds([...selectedMedicationIds, medicationId]);
                  }
                }}
              />
              {selectedMedicationIds.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="text-xs font-semibold text-gray-700 mb-2">Selected Medications:</div>
                  {selectedMedicationIds.map((medId) => {
                    const med = medications.find(m => m.id === medId);
                    if (!med) return null;
                    return (
                      <div key={medId} className="flex items-center justify-between text-sm text-gray-700 p-2 bg-white rounded border border-gray-200">
                        <span>
                          <span className="font-medium">{med.name}</span>
                          <span className="text-gray-500 text-xs ml-2">({med.dosage}, {med.frequency})</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedMedicationIds(selectedMedicationIds.filter(id => id !== medId))}
                          className="text-red-600 hover:text-red-700 text-xs font-semibold"
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              {getFilteredMedications(selectedProgramType).length === 0 && (
                <div className="text-xs text-gray-500 text-center py-4 border border-gray-200 rounded-lg bg-gray-50">
                  No medications available for this program type. Create medications first.
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-gray-500 italic p-3 border border-gray-200 rounded-lg bg-gray-50">
              Select a program type first to assign medications
            </div>
          )}
        </FormField>

        <FormActions
          data-testid="program-submit-button"
          submitLabel={initialValues ? "Save Changes" : "Create Program"}
          loading={loading}
          showCancel={false}
        />
      </form>
    </Modal>
  );
}
