/** Form component for creating and editing patient information. */
"use client";

import React, { useEffect } from "react";
import { FormField, FormInput, FormSelect, FormTextarea, FormActions } from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { programsApi, usersApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface PatientFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  programs?: Array<{ id: string; name: string }>;
  loading?: boolean;
  inline?: boolean;
  initialValues?: {
    name?: string;
    dob?: string;
    gender?: string;
    contact?: string;
    email?: string;
    address?: string;
    emergencyContact?: string;
    programId?: string;
    enrollmentDate?: string;
    assignedStaffId?: string;
    medicalNotes?: string;
  };
}

function PatientFormContent({ 
  onSubmit, 
  programs: initialPrograms = [], 
  loading, 
  initialValues 
}: { 
  onSubmit: (data: any) => Promise<void>; 
  programs: Array<{ id: string; name: string }>; 
  loading: boolean; 
  initialValues?: PatientFormProps['initialValues'];
}) {
  const { user } = useAuth();
  const [selectedProgramId, setSelectedProgramId] = React.useState(initialValues?.programId || "");
  const [programs, setPrograms] = React.useState<Array<{ id: string; name: string }>>(initialPrograms);
  const [staff, setStaff] = React.useState<Array<{ id: string; name: string }>>([]);
  const [selectedStaffId, setSelectedStaffId] = React.useState(initialValues?.assignedStaffId || "");
  const [loadingStaff, setLoadingStaff] = React.useState(false);

  // Load programs if not provided
  useEffect(() => {
    if (programs.length === 0) {
      loadPrograms();
    }
  }, []);

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

  // Set initial program and load staff if program is provided
  React.useEffect(() => {
    if (initialValues?.programId) {
      setSelectedProgramId(initialValues.programId);
      if (user?.role === "Admin" && initialValues.programId) {
        loadStaffForProgram(initialValues.programId);
      }
    }
    if (initialValues?.assignedStaffId) {
      setSelectedStaffId(initialValues.assignedStaffId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues?.programId, initialValues?.assignedStaffId, user?.role]);

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
        
        // For Healthcare Staff: only show programs they are assigned to
        if (user?.role === "Healthcare Staff") {
          programsData = programsData.filter((p: any) => 
            p.isAssigned || p.assignedStaff?.some((staff: any) => 
              (staff.id === user.id || staff.userId === user.id) || 
              (typeof staff === 'string' && staff === user.id)
            )
          );
        }
        
        setPrograms(programsData.map((p: any) => ({ id: p.id, name: p.name })));
      }
    } catch (error) {
      // Error handled silently
    }
  };

  const loadStaffForProgram = async (programId: string) => {
    if (!programId || user?.role !== "Admin") return;
    
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
    const formData = new FormData(e.currentTarget);
    
    // Only Admin can assign staff - Healthcare Staff cannot assign staff
    // Use selectedStaffId from state (controlled component)
    const assignedStaffId = user?.role === "Admin" && selectedStaffId ? selectedStaffId : undefined;
    
    await onSubmit({
      name: formData.get("name")?.toString() || "",
      dob: formData.get("dob")?.toString() || "",
      gender: formData.get("gender")?.toString() || "",
      contact: formData.get("contact")?.toString() || "",
      email: formData.get("email")?.toString() || "",
      address: formData.get("address")?.toString() || "",
      emergencyContact: formData.get("emergencyContact")?.toString() || "",
      programId: selectedProgramId,
      enrollmentDate: formData.get("enrollmentDate")?.toString() || new Date().toISOString().split('T')[0],
      assignedStaffId: assignedStaffId,
      medicalNotes: formData.get("medicalNotes")?.toString() || "",
    });
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="Full Name" required error={undefined}>
            <FormInput
              name="name"
              autoFocus
              placeholder="Enter full name"
              defaultValue={initialValues?.name}
              required
            />
          </FormField>

          <FormField label="Date of Birth" required error={undefined}>
            <FormInput
              name="dob"
              type="date"
              defaultValue={initialValues?.dob}
              required
            />
          </FormField>

          <FormField label="Gender" required error={undefined}>
            <FormSelect name="gender" defaultValue={initialValues?.gender} required>
              <option value="">Select Gender</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </FormSelect>
          </FormField>

          <FormField label="Contact Number" required error={undefined}>
            <FormInput
              name="contact"
              placeholder="+250 700 000 000"
              defaultValue={initialValues?.contact}
              required
            />
          </FormField>

          <FormField label="Email" error={undefined}>
            <FormInput
              name="email"
              type="email"
              placeholder="patient@example.com"
              defaultValue={initialValues?.email}
            />
          </FormField>

          <FormField label="Emergency Contact" error={undefined}>
            <FormInput
              name="emergencyContact"
              placeholder="+250 700 000 000"
              defaultValue={initialValues?.emergencyContact}
            />
          </FormField>

          <div className="md:col-span-2">
            <FormField label="Address" error={undefined}>
            <FormTextarea
              name="address"
              rows={2}
              placeholder="Enter full address"
              defaultValue={initialValues?.address}
            />
            </FormField>
          </div>

          <FormField label="Select Program" required error={undefined}>
            <SearchableSelect
              name="programId"
              required
              placeholder="Type to search program..."
              value={selectedProgramId}
              onChange={handleProgramChange}
              options={programs.map((p) => ({
                value: p.id,
                label: p.name,
              }))}
            />
          </FormField>

          <FormField label="Enrollment Date" error={undefined}>
            <FormInput
              name="enrollmentDate"
              type="date"
              defaultValue={initialValues?.enrollmentDate || new Date().toISOString().split('T')[0]}
            />
          </FormField>

          {/* Only Admin can assign staff to patients */}
          {user?.role === "Admin" && (
            <div className="md:col-span-2">
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
            </div>
          )}

          <div className="md:col-span-2">
            <FormField label="Medical Notes" error={undefined}>
            <FormTextarea
              name="medicalNotes"
              rows={3}
              placeholder="Enter any relevant medical information..."
              defaultValue={initialValues?.medicalNotes}
            />
            </FormField>
          </div>
        </div>

        <FormActions
          submitLabel={loading ? "Enrolling..." : initialValues ? "Save Changes" : "Enroll Patient"}
          loading={loading}
          showCancel={false}
        />
      </form>
  );
}

export function PatientForm({ open, onClose, onSubmit, programs = [], loading = false, inline = false, initialValues }: PatientFormProps) {
  const formContent = (
    <PatientFormContent 
      onSubmit={onSubmit}
      programs={programs}
      loading={loading}
      initialValues={initialValues}
    />
  );

  if (inline) {
    return formContent;
  }

  return (
    <Modal open={open} onClose={onClose} title={initialValues ? "Edit Patient Information" : "Enroll Patient"} size="lg">
      {formContent}
    </Modal>
  );
}

