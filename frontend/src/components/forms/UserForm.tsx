/** Form component for creating and editing user accounts. */
"use client";

import { useState, useEffect } from "react";
import { FormField, FormInput, FormSelect, FormActions } from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { programsApi } from "@/lib/api";

interface UserFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; email: string; password?: string; role: string; programIds?: string[] }) => Promise<void>;
  loading?: boolean;
  initialValues?: {
    name?: string;
    email?: string;
    role?: string;
    programIds?: string[];
  };
}

export function UserForm({ open, onClose, onSubmit, loading = false, initialValues }: UserFormProps) {
  const [programs, setPrograms] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>(initialValues?.programIds || []);
  // Initialize selectedRole with initialValues or default to "Healthcare Staff" for new users
  const [selectedRole, setSelectedRole] = useState<string>(initialValues?.role || "Healthcare Staff");

  useEffect(() => {
    if (open) {
      loadPrograms();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      // Reset or set form state when modal opens
      if (initialValues) {
        setSelectedProgramIds(initialValues.programIds || []);
        setSelectedRole(initialValues.role || "Healthcare Staff");
      } else {
        setSelectedProgramIds([]);
        setSelectedRole("Healthcare Staff");
      }
    }
  }, [open]); // Only depend on open, not initialValues

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
      setPrograms([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const role = formData.get("role")?.toString() || "";
    
    await onSubmit({
      name: formData.get("name")?.toString() || "",
      email: formData.get("email")?.toString() || "",
      password: formData.get("password")?.toString() || "",
      role: role,
      // Always send programIds for Healthcare Staff (even if empty array), undefined for other roles
      programIds: role === "Healthcare Staff" ? selectedProgramIds : undefined,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={initialValues ? "Edit User" : "Add User"} size="md">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormField label="Full Name" required hint="Enter the user's full name" error={undefined}>
          <FormInput
            name="name"
            autoFocus
            placeholder="Enter full name (e.g., Dr. John Smith)"
            defaultValue={initialValues?.name}
            required
          />
        </FormField>

        <FormField label="Email Address" required hint="This will be used for login and notifications" error={undefined}>
          <FormInput
            name="email"
            type="email"
            placeholder="user@example.com"
            defaultValue={initialValues?.email}
            required
          />
        </FormField>

        <FormField label="User Role" required hint="Select the appropriate role based on user permissions needed" error={undefined}>
          <FormSelect
            name="role"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            required
          >
            <option value="">Select Role</option>
            <option value="Admin">Admin - Full system access</option>
            <option value="Healthcare Staff">Healthcare Staff - Manage patients and programs</option>
            <option value="Guest">Guest - Read-only access</option>
          </FormSelect>
        </FormField>

        {!initialValues && (
          <FormField label="Password" required hint="Set a password for the user (minimum 6 characters)" error={undefined}>
            <FormInput
              name="password"
              type="password"
              placeholder="Enter password"
              required
              minLength={6}
            />
          </FormField>
        )}

        {initialValues && (
          <FormField label="New Password" hint="(optional) Leave blank to keep current password" error={undefined}>
            <FormInput
              name="password"
              type="password"
              placeholder="Enter new password (leave blank to keep current)"
              minLength={6}
            />
          </FormField>
        )}

        {selectedRole === "Healthcare Staff" && (
          <FormField 
            label="Assign Programs" 
            hint={selectedProgramIds.length === 0 ? "(recommended) Select programs to assign to this Healthcare Staff member" : "Assigned programs:"} 
            error={undefined}
          >
            {programs.length > 0 ? (
              <div className="space-y-3">
                <SearchableSelect
                  placeholder="Search and select programs to assign..."
                  options={programs
                    .filter(p => !selectedProgramIds.includes(p.id)) // Don't show already selected programs
                    .map(p => ({ value: p.id, label: p.name }))}
                  value=""
                  onChange={(programId) => {
                    if (programId && !selectedProgramIds.includes(programId)) {
                      setSelectedProgramIds([...selectedProgramIds, programId]);
                    }
                  }}
                />
                {selectedProgramIds.length > 0 && (
                  <div className="space-y-2 max-h-40 overflow-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                    <div className="text-xs font-semibold text-gray-700 mb-2">
                      Assigned Programs ({selectedProgramIds.length}):
                    </div>
                    {selectedProgramIds.map((programId) => {
                      const program = programs.find(p => p.id === programId);
                      if (!program) return null;
                      return (
                        <div key={programId} className="flex items-center justify-between text-sm text-gray-700 p-2 bg-white rounded border border-gray-200">
                          <span className="font-medium">{program.name}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedProgramIds(selectedProgramIds.filter(id => id !== programId))}
                            className="text-red-600 hover:text-red-700 text-xs font-semibold px-2 py-1 hover:bg-red-50 rounded transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                {selectedProgramIds.length === 0 && (
                  <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2">
                    No programs assigned. This Healthcare Staff member will not have access to any programs until assigned.
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-gray-500 italic p-3 border border-gray-200 rounded-lg bg-gray-50">
                Loading programs...
              </div>
            )}
          </FormField>
        )}

        <FormActions
          submitLabel={initialValues ? "Save Changes" : "Create User"}
          loading={loading}
          showCancel={false}
        />
      </form>
    </Modal>
  );
}

