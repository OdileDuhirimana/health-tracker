/** Form component for recording patient attendance at program sessions. */
"use client";

import { useState, useEffect, useCallback } from "react";
import { FormField, FormInput, FormSelect, FormActions } from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/contexts/AuthContext";
import { patientsApi } from "@/lib/api";

interface AttendanceFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    programId: string;
    attendanceDate: string;
    time: string;
    attendance: Array<{
      patientId: string;
      status: "Present" | "Absent" | "Late" | "Excused" | "Canceled";
      checkInTime?: string;
    }>;
  }) => Promise<void>;
  programs: Array<{ id: string; name: string }>;
  patients?: Array<{ id: string; name: string }>;
  loading?: boolean;
}

export function AttendanceForm({
  open,
  onClose,
  onSubmit,
  programs,
  patients: initialPatients = [],
  loading = false,
}: AttendanceFormProps) {
  const { notify } = useToast();
  const { user } = useAuth();
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState(new Date().toTimeString().slice(0, 5));
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [patients, setPatients] = useState<Array<{ id: string; name: string }>>([]);
  const [patientStatuses, setPatientStatuses] = useState<Record<string, string>>({});
  const [loadingPatients, setLoadingPatients] = useState(false);
  
  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setSelectedProgram("");
      setSelectedPatients([]);
      setPatients([]);
      setPatientStatuses({});
      setSelectedDate(new Date().toISOString().split('T')[0]);
      setSelectedTime(new Date().toTimeString().slice(0, 5));
    }
  }, [open]);
  
  // For Healthcare Staff, filter to only show programs they're assigned to
  const availablePrograms = user?.role === "Healthcare Staff"
    ? programs.filter((p: any) => 
        p.assignedStaff?.some((staff: any) => 
          (staff.id === user.id || staff.userId === user.id) || 
          (typeof staff === 'string' && staff === user.id)
        )
      )
    : programs;

  const loadPatientsForProgram = useCallback(async (programId: string) => {
    if (!programId) {
      setPatients([]);
      setSelectedPatients([]);
      setLoadingPatients(false);
      return;
    }
    
    setLoadingPatients(true);
    try {
      // Always fetch patients from backend filtered by programId to get only enrolled patients
      const response = await patientsApi.getAll({ programId });
      if (response.data) {
        let patientsData: any[] = [];
        if (Array.isArray(response.data)) {
          patientsData = response.data;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          patientsData = response.data.data;
        }
        // Map to the format needed by the form
        const programPatients = patientsData.map((p: any) => ({
          id: p.id || p.patientId,
          name: p.fullName || p.name,
        }));
        setPatients(programPatients);
        
        // Auto-select all patients when loaded
        if (programPatients.length > 0) {
          setSelectedPatients(programPatients.map((p: any) => p.id));
        } else {
          setSelectedPatients([]);
        }
      } else {
        setPatients([]);
        setSelectedPatients([]);
      }
    } catch (error) {
      notify("Failed to load patients for this program. Please try again.", "error");
      setPatients([]);
      setSelectedPatients([]);
    } finally {
      setLoadingPatients(false);
    }
  }, [notify]);

  // Always load patients from backend when program is selected
  useEffect(() => {
    if (selectedProgram) {
      loadPatientsForProgram(selectedProgram);
    } else {
      setPatients([]);
      setSelectedPatients([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProgram]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const attendance = selectedPatients.map((patientId) => ({
      patientId,
      status: (patientStatuses[patientId] || formData.get(`status_${patientId}`) as any || "Present") as "Present" | "Absent" | "Late" | "Excused" | "Canceled",
      checkInTime: selectedTime,
    }));

    await onSubmit({
      programId: selectedProgram,
      attendanceDate: selectedDate,
      time: selectedTime,
      attendance,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Mark Attendance" size="lg">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Date" required error={undefined}>
            <FormInput
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              required
            />
          </FormField>
          <FormField label="Time" required error={undefined}>
            <FormInput
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              required
            />
          </FormField>
          <FormField label="Program" required error={undefined}>
            <SearchableSelect
              name="programId"
              value={selectedProgram}
              onChange={(programId) => {
                setSelectedProgram(programId);
                // Reset patient statuses when program changes
                setPatientStatuses({});
                // loadPatientsForProgram will be called by useEffect when selectedProgram changes
              }}
              required
              placeholder="Type to search program..."
              options={availablePrograms.map((p) => ({
                value: p.id,
                label: p.name,
              }))}
            />
          </FormField>
        </div>

        {selectedProgram && loadingPatients && (
          <div className="text-center py-8 text-gray-500 text-sm">
            Loading patients enrolled in this program...
          </div>
        )}

        {selectedProgram && !loadingPatients && patients.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700">
                Select Patients ({selectedPatients.length} selected) <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const allIds = patients.map(p => p.id);
                    setSelectedPatients(allIds);
                    notify(`Selected all ${allIds.length} patients`, "success");
                  }}
                  className="text-xs px-2 py-1 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPatients([]);
                    notify("Selection cleared", "info");
                  }}
                  className="text-xs px-2 py-1 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
            
            {/* Searchable patient selection */}
            <div className="space-y-2">
              <FormField label="Quick Search Patients" error={undefined}>
                <SearchableSelect
                  placeholder="Type to search and select patients..."
                  options={patients.map(p => ({ value: p.id, label: p.name }))}
                  value=""
                  onChange={(patientId) => {
                    if (patientId && !selectedPatients.includes(patientId)) {
                      setSelectedPatients([...selectedPatients, patientId]);
                      setPatientStatuses(prev => ({ ...prev, [patientId]: "Present" }));
                    }
                  }}
                />
              </FormField>
            </div>

            <div className="max-h-60 overflow-auto border border-gray-200 rounded-lg">
              {patients.map((patient) => (
                <div
                  key={patient.id}
                  className="flex items-center gap-3 px-3 py-2.5 border-b border-gray-200 hover:bg-gray-50 transition-colors last:border-b-0"
                >
                  <input
                    type="checkbox"
                    name={`patient_${patient.id}`}
                    checked={selectedPatients.includes(patient.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPatients([...selectedPatients, patient.id]);
                        setPatientStatuses(prev => ({ ...prev, [patient.id]: "Present" }));
                      } else {
                        setSelectedPatients(selectedPatients.filter((id) => id !== patient.id));
                        setPatientStatuses(prev => {
                          const newStatuses = { ...prev };
                          delete newStatuses[patient.id];
                          return newStatuses;
                        });
                      }
                    }}
                    className="rounded border-gray-300 text-[#0066cc] focus:ring-[#0066cc]"
                  />
                  <span className="flex-1 text-gray-900 font-medium text-sm">{patient.name}</span>
                  <FormSelect
                    name={`status_${patient.id}`}
                    value={patientStatuses[patient.id] || "Present"}
                    onChange={(e) => {
                      setPatientStatuses(prev => ({ ...prev, [patient.id]: e.target.value }));
                    }}
                    disabled={!selectedPatients.includes(patient.id)}
                    className="px-2 py-1 pr-8 text-sm"
                  >
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                    <option value="Late">Late</option>
                    <option value="Excused">Excused</option>
                    <option value="Canceled">Canceled</option>
                  </FormSelect>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {selectedProgram && !loadingPatients && patients.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="font-semibold text-amber-900 mb-1">No patients enrolled</p>
            <p className="text-sm text-amber-700">No patients are currently enrolled in this program. Please enroll patients first before marking attendance.</p>
          </div>
        )}

        <FormActions
          submitLabel="Save Attendance"
          loading={loading}
          disabled={!selectedProgram || selectedPatients.length === 0}
          showCancel={false}
        />
      </form>
    </Modal>
  );
}

