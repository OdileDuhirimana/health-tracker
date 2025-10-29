"use client";

import { useState, useEffect } from "react";
import { FormField, FormSelect, FormTextarea, FormActions } from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import { Attendance, AttendanceStatus } from "@/types";

interface EditAttendanceFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (id: string, data: { status: AttendanceStatus; notes?: string }) => Promise<void>;
  record: Attendance | null;
  loading?: boolean;
}

export function EditAttendanceForm({
  open,
  onClose,
  onSubmit,
  record,
  loading = false,
}: EditAttendanceFormProps) {
  const [status, setStatus] = useState<AttendanceStatus>(record?.status || "Present");
  const [notes, setNotes] = useState(record?.notes || "");

  useEffect(() => {
    if (record) {
      setStatus(record.status);
      setNotes(record.notes || "");
    }
  }, [record]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!record) return;
    
    await onSubmit(record.id, {
      status,
      notes: notes.trim() || undefined,
    });
  };

  if (!record) return null;

  return (
    <Modal open={open} onClose={onClose} title="Edit Attendance Record" size="md">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-xs text-gray-600 mb-1">Patient</div>
            <div className="font-semibold text-gray-900">
              {record.patient?.fullName || record.patient?.name || "Unknown Patient"}
            </div>
          </div>
          
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-xs text-gray-600 mb-1">Program</div>
            <div className="font-semibold text-gray-900">
              {record.program?.name || "Unknown Program"}
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-xs text-gray-600 mb-1">Date</div>
            <div className="font-semibold text-gray-900">
              {record.attendanceDate ? new Date(record.attendanceDate).toLocaleDateString() : "—"}
            </div>
          </div>
        </div>

        <FormField label="Status" required hint="Update the attendance status" error={undefined}>
          <FormSelect
            value={status}
            onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
            required
          >
            <option value="Present">Present</option>
            <option value="Absent">Absent</option>
            <option value="Late">Late</option>
            <option value="Excused">Excused</option>
            <option value="Canceled">Canceled</option>
          </FormSelect>
        </FormField>

        <FormField label="Notes (Optional)" hint="Add any additional notes about this attendance record" error={undefined}>
          <FormTextarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter any notes about this attendance record..."
            rows={3}
          />
        </FormField>

        <FormActions
          submitLabel="Update Attendance"
          loading={loading}
          showCancel={false}
        />
      </form>
    </Modal>
  );
}


