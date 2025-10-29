/** Quick enrollment form for enrolling patients into programs. */
"use client";

import { useState, useEffect } from "react";
import { FormField, FormInput, FormSelect, FormActions } from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { programsApi, usersApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";

interface QuickEnrollmentFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { programId: string; enrollmentDate?: string; assignedStaffId?: string }) => Promise<void>;
  patientId: string;
  existingProgramIds?: string[];
  loading?: boolean;
}

export function QuickEnrollmentForm({
  open,
  onClose,
  onSubmit,
  patientId,
  existingProgramIds = [],
  loading = false,
}: QuickEnrollmentFormProps) {
  const { user } = useAuth();
  const { notify } = useToast();
  const [programs, setPrograms] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [staff, setStaff] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [enrollmentDate, setEnrollmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  // UUID validation regex
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  // Validate patientId on mount
  useEffect(() => {
    if (open) {
      if (!patientId) {
        notify("Patient ID is missing. Please try again or refresh the page.", "error");
      } else if (!uuidRegex.test(patientId)) {
        notify("Invalid Patient ID format. Please ensure you're on the correct patient page.", "error");
      }
    }
  }, [open, patientId, notify]);

  useEffect(() => {
    if (open) {
      loadPrograms();
      setSelectedProgramId("");
      setSelectedStaffId("");
      setEnrollmentDate(new Date().toISOString().split('T')[0]);
      setStaff([]); // Clear staff when modal opens
    }
  }, [open]);

  // Load staff when program is selected
  useEffect(() => {
    if (selectedProgramId && user?.role === "Admin") {
      loadStaffForProgram(selectedProgramId);
    } else {
      setStaff([]);
      setSelectedStaffId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProgramId, user?.role]);

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
        // Filter out programs the patient is already enrolled in
        let availablePrograms = programsData.filter(
          (p: any) => !existingProgramIds.includes(p.id)
        );
        
        // For Healthcare Staff: only show programs they are assigned to
        if (user?.role === "Healthcare Staff") {
          availablePrograms = availablePrograms.filter((p: any) => 
            p.isAssigned || p.assignedStaff?.some((staff: any) => 
              (staff.id === user.id || staff.userId === user.id) || 
              (typeof staff === 'string' && staff === user.id)
            )
          );
        }
        
        setPrograms(availablePrograms.map((p: any) => ({ id: p.id, name: p.name, type: p.type })));
      }
    } catch (error) {
      setPrograms([]);
    }
  };

  const loadStaffForProgram = async (programId: string) => {
    if (!programId) return;
    
    setLoadingStaff(true);
    try {
      // Fetch program details to get assigned staff
      const programResponse = await programsApi.getById(programId);
      if (programResponse.data) {
        const program = programResponse.data;
        // Get staff assigned to this program
        const assignedStaff = program.assignedStaff || [];
        
        // Map assigned staff to the format we need
        const staffData = assignedStaff
          .filter((s: any) => s.role === "Healthcare Staff" || s.role === "Admin")
          .map((s: any) => ({ 
            id: s.id || s.userId, 
            name: s.name || s.email || "Unknown Staff" 
          }));
        
        setStaff(staffData);
        
        // Clear selected staff if they're not in the new list
        if (selectedStaffId && !staffData.some((s: any) => s.id === selectedStaffId)) {
          setSelectedStaffId("");
        }
      }
    } catch (error) {
      setStaff([]);
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleProgramChange = (programId: string) => {
    setSelectedProgramId(programId);
    setSelectedStaffId(""); // Reset staff selection when program changes
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!patientId) {
      notify("Patient ID is required. Please refresh the page and try again.", "error");
      return;
    }
    if (!uuidRegex.test(patientId)) {
      notify("Invalid Patient ID format. Please ensure you're on the correct patient page.", "error");
      return;
    }
    if (!selectedProgramId) {
      notify("Please select a program to enroll the patient in.", "error");
      return;
    }
    if (!uuidRegex.test(selectedProgramId)) {
      notify("Invalid program selection. Please try selecting the program again.", "error");
      return;
    }
    
    await onSubmit({
      programId: selectedProgramId,
      enrollmentDate,
      assignedStaffId: user?.role === "Admin" && selectedStaffId ? selectedStaffId : undefined,
    });
  };

  const availablePrograms = programs.filter(
    (p) => !existingProgramIds.includes(p.id)
  );

  return (
    <Modal open={open} onClose={onClose} title="Quick Enroll in Program" size="md">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormField label="Select Program" required hint="Choose a program to enroll this patient in" error={undefined}>
          <SearchableSelect
            name="programId"
            value={selectedProgramId}
            onChange={handleProgramChange}
            required
            placeholder="Type to search program..."
            options={availablePrograms.map((p) => ({
              value: p.id,
              label: `${p.name} (${p.type})`,
            }))}
          />
        </FormField>

        <FormField label="Enrollment Date" error={undefined}>
          <FormInput
            type="date"
            value={enrollmentDate}
            onChange={(e) => setEnrollmentDate(e.target.value)}
            required
          />
        </FormField>

        {user?.role === "Admin" && (
          <FormField 
            label="Assigned Staff (Optional)" 
            hint={selectedProgramId 
              ? staff.length > 0 
                ? "Select staff assigned to this program, or leave empty to auto-assign" 
                : "No staff assigned to this program. Leave empty to auto-assign from program defaults."
              : "Select a program first to see assigned staff"}
            error={undefined}
          >
            <FormSelect
              name="assignedStaffId"
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              disabled={!selectedProgramId || loadingStaff}
            >
              <option value="">
                {loadingStaff 
                  ? "Loading staff..." 
                  : !selectedProgramId 
                  ? "Select program first"
                  : staff.length === 0
                  ? "No staff assigned to program"
                  : "Auto-assign"}
              </option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </FormSelect>
          </FormField>
        )}

        {availablePrograms.length === 0 && (
          <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
            This patient is already enrolled in all available programs.
          </div>
        )}

        <FormActions
          submitLabel="Enroll Patient"
          loading={loading}
          disabled={!selectedProgramId || availablePrograms.length === 0}
          showCancel={false}
        />
      </form>
    </Modal>
  );
}

