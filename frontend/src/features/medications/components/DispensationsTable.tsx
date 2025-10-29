/**
 * DispensationsTable Component
 * Displays medication dispensation records in a table
 */

import { Table, THead, TBody, TH, TD } from "@/components/Table";
import Badge from "@/components/Badge";

interface DispensationRecord {
  id: string;
  patientName: string;
  program: string;
  medication: string;
  dosage: string;
  schedule: string;
  lastDispensed: string;
  nextDue: string;
  status: "Dispensed" | "Pending" | "Overdue";
  recentlyDispensed: boolean;
  patientId: string;
  programId: string;
  medicationId: string;
}

interface DispensationsTableProps {
  dispensations: DispensationRecord[];
  onPatientClick?: (patientId: string) => void;
  onDispenseNow?: (dispensation: DispensationRecord) => void;
}

export function DispensationsTable({ dispensations, onPatientClick, onDispenseNow }: DispensationsTableProps) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>Patient</TH>
          <TH>Program</TH>
          <TH>Medication</TH>
          <TH>Dosage</TH>
          <TH>Schedule</TH>
          <TH>Last Dispensed</TH>
          <TH>Next Due</TH>
          <TH>Status</TH>
          <TH>Actions</TH>
        </tr>
      </THead>
      <TBody>
        {dispensations.map((disp, i) => (
          <tr key={disp.id || i} className={disp.recentlyDispensed ? "bg-gray-50/50" : ""}>
            <TD>
              {onPatientClick ? (
                <button
                  onClick={() => onPatientClick(disp.patientId)}
                  className="text-[#0066cc] hover:underline font-medium"
                >
                  {disp.patientName}
                </button>
              ) : (
                <span className="text-gray-900 font-medium">{disp.patientName}</span>
              )}
            </TD>
            <TD><span className="text-gray-700">{disp.program}</span></TD>
            <TD><span className="font-semibold text-gray-900">{disp.medication}</span></TD>
            <TD><span className="text-gray-700">{disp.dosage}</span></TD>
            <TD><span className="text-gray-700">{disp.schedule}</span></TD>
            <TD><span className="text-gray-700">{disp.lastDispensed}</span></TD>
            <TD><span className="text-gray-700">{disp.nextDue}</span></TD>
            <TD>
              <Badge
                variant={
                  disp.status === "Overdue"
                    ? "danger"
                    : disp.status === "Pending"
                    ? "warning"
                    : "success"
                }
              >
                {disp.status}
              </Badge>
            </TD>
            <TD>
              {onDispenseNow && (
                <button
                  onClick={() => onDispenseNow(disp)}
                  className="px-3 py-1.5 rounded-lg bg-[#0066cc] text-white text-sm font-semibold hover:bg-[#0052a3] active:bg-[#003d7a] shadow-sm hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-[#0066cc] focus:ring-offset-2"
                >
                  Dispense Now
                </button>
              )}
            </TD>
          </tr>
        ))}
      </TBody>
    </Table>
  );
}

