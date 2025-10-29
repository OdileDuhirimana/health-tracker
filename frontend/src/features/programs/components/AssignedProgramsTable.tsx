/**
 * AssignedProgramsTable Component
 * Displays assigned programs for healthcare staff with highlighted styling
 */

import { Table, THead, TBody, TH, TD } from "@/components/Table";
import Badge from "@/components/Badge";
import { ActionButtons } from "@/components/ui/ActionButtons";
import { Program } from "@/types";

interface AssignedProgramsTableProps {
  programs: Program[];
  onView: (program: Program) => void;
}

export function AssignedProgramsTable({ programs, onView }: AssignedProgramsTableProps) {
  const formatDate = (date: string | Date | undefined) => {
    if (!date) return "—";
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="rounded-xl border border-[#0066cc]/20 bg-blue-50/50 shadow-sm">
      <Table>
        <THead>
          <tr>
            <TH>Program Name</TH>
            <TH>Type</TH>
            <TH>Description</TH>
            <TH>Total Patients</TH>
            <TH>Status</TH>
            <TH>Created</TH>
            <TH>Actions</TH>
          </tr>
        </THead>
        <TBody>
          {programs.map((program) => (
            <tr key={program.id} className="bg-white/50">
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
              <TD>
                <span className="text-gray-700">
                  {program.totalPatients !== undefined ? program.totalPatients : (program as any).enrollments?.length || 0}
                </span>
              </TD>
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
                  onEdit={undefined}
                  onDelete={undefined}
                  canEdit={false}
                  canDelete={false}
                />
              </TD>
            </tr>
          ))}
        </TBody>
      </Table>
    </div>
  );
}

