/**
 * AttendanceRecordsTable Component
 * Displays attendance records in a table format with filtering, update, and delete functionality
 */

import { Table, THead, TBody, TH, TD } from "@/components/Table";
import Badge from "@/components/Badge";
import { ActionButtons } from "@/components/ui/ActionButtons";
import { Attendance, AttendanceStatus } from "@/types";
import { format } from "date-fns";

interface AttendanceRecordsTableProps {
  records: Attendance[];
  userRole?: string;
  onEdit?: (record: Attendance) => void;
  onDelete?: (id: string) => void;
  loading?: boolean;
}

export function AttendanceRecordsTable({
  records,
  userRole,
  onEdit,
  onDelete,
  loading = false,
}: AttendanceRecordsTableProps) {
  const formatDate = (date: string | Date | undefined) => {
    if (!date) return "—";
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return format(dateObj, 'MMM dd, yyyy');
    } catch {
      return "—";
    }
  };

  const formatTime = (date: string | Date | undefined) => {
    if (!date) return "—";
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return format(dateObj, 'hh:mm a');
    } catch {
      return "—";
    }
  };

  const getStatusBadge = (status: AttendanceStatus) => {
    const variants: Record<string, "active" | "inactive" | "warning"> = {
      Present: "active",
      Absent: "inactive",
      Late: "warning",
      Excused: "warning",
      Canceled: "inactive",
    };
    return variants[status] || "inactive";
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-500">
        Loading attendance records...
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No attendance records found. Mark attendance to see records here.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <THead>
          <tr>
            <TH>Date</TH>
            <TH>Program</TH>
            <TH>Patient</TH>
            <TH>Status</TH>
            <TH>Check-in Time</TH>
            {userRole === "Admin" && <TH>Marked By</TH>}
            <TH>Actions</TH>
          </tr>
        </THead>
        <TBody>
          {records.map((record) => (
            <tr key={record.id}>
              <TD>
                <span className="text-gray-700 font-medium">
                  {formatDate(record.attendanceDate)}
                </span>
              </TD>
              <TD>
                <span className="text-gray-700">
                  {record.program?.name || "Unknown Program"}
                </span>
              </TD>
              <TD>
                <span className="text-gray-900 font-medium">
                  {record.patient?.fullName || record.patient?.name || "Unknown Patient"}
                </span>
              </TD>
              <TD>
                <Badge variant={getStatusBadge(record.status)}>
                  {record.status}
                </Badge>
              </TD>
              <TD>
                <span className="text-gray-600 text-sm">
                  {formatTime(record.checkInTime)}
                </span>
              </TD>
              {userRole === "Admin" && (
                <TD>
                  <span className="text-gray-600 text-sm">
                    {record.markedBy?.name || "—"}
                  </span>
                </TD>
              )}
              <TD>
                <ActionButtons
                  onEdit={onEdit ? () => onEdit(record) : undefined}
                  onDelete={userRole === "Admin" && onDelete ? () => onDelete(record.id) : undefined}
                  canEdit={userRole === "Admin" || userRole === "Healthcare Staff"}
                  canDelete={userRole === "Admin"}
                />
              </TD>
            </tr>
          ))}
        </TBody>
      </Table>
    </div>
  );
}

