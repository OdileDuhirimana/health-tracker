/**
 * ProgramsTable Component
 * Displays programs in a table format with actions
 */

import { Table, THead, TBody, TH, TD } from "@/components/Table";
import Badge from "@/components/Badge";
import { ActionButtons } from "@/components/ui/ActionButtons";
import { Program } from "@/types";

interface ProgramsTableProps {
  programs: Program[];
  userRole?: string;
  onView: (program: Program) => void;
  onEdit?: (program: Program) => void;
  onDelete?: (id: string) => void;
}

export function ProgramsTable({ programs, userRole, onView, onEdit, onDelete }: ProgramsTableProps) {
  const formatDate = (date: string | Date | undefined) => {
    if (!date) return "—";
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <Table>
      <THead>
        <tr>
          <TH>Program Name</TH>
          <TH>Type</TH>
          <TH>Description</TH>
          {userRole !== "Guest" && <TH>Total Patients</TH>}
          <TH>Status</TH>
          <TH>Created</TH>
          <TH>Actions</TH>
        </tr>
      </THead>
      <TBody>
        {programs.map((program) => (
          <tr key={program.id}>
            <TD>
              <button
                onClick={() => onView(program)}
                className="text-[#0066cc] hover:text-[#0052a3] hover:underline font-semibold"
              >
                {program.name}
              </button>
            </TD>
            <TD><span className="text-gray-700">{program.type}</span></TD>
            <TD>
              <span className="block max-w-[320px] truncate text-gray-700">
                {program.description || "—"}
              </span>
            </TD>
            {userRole !== "Guest" && (
              <TD>
                <span className="text-gray-700">
                  {program.totalPatients !== undefined ? program.totalPatients : (program as any).enrollments?.length || 0}
                </span>
              </TD>
            )}
            <TD>
              <Badge variant={program.status === "Active" ? "active" : "inactive"}>
                {program.status}
              </Badge>
            </TD>
            <TD>
              <span className="text-gray-700">{formatDate(program.createdAt)}</span>
            </TD>
            <TD>
              <ActionButtons
                onView={() => onView(program)}
                onEdit={onEdit ? () => onEdit(program) : undefined}
                onDelete={onDelete ? () => onDelete(program.id) : undefined}
                canEdit={userRole === "Admin"}
                canDelete={userRole === "Admin"}
              />
            </TD>
          </tr>
        ))}
      </TBody>
    </Table>
  );
}

