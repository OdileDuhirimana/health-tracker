/**
 * MedicationTrackingTable Component
 * Comprehensive medication tracking table with adherence rates
 */

import { Table, THead, TBody, TH, TD } from "@/components/Table";
import Badge from "@/components/Badge";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { format, isPast, isToday, isTomorrow } from "date-fns";

interface TrackingRecord {
  patientId: string;
  patientName: string;
  medicationId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  programId: string;
  programName: string;
  lastCollected: string | Date | null;
  nextDue: string | Date | null;
  adherenceRate: number;
}

interface MedicationTrackingTableProps {
  trackingData: TrackingRecord[];
  loading?: boolean;
  onPatientClick?: (patientId: string) => void;
  onDispenseNow?: (record: TrackingRecord) => void;
}

export function MedicationTrackingTable({
  trackingData,
  loading = false,
  onPatientClick,
  onDispenseNow,
}: MedicationTrackingTableProps) {
  const formatDate = (date: string | Date | null) => {
    if (!date) return 'Never';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return 'Invalid Date';
    if (isToday(d)) {
      return `Today, ${format(d, 'h:mm a')}`;
    } else if (isTomorrow(d)) {
      return `Tomorrow, ${format(d, 'h:mm a')}`;
    } else {
      return format(d, 'MMM d, h:mm a');
    }
  };

  const getAdherenceBadgeVariant = (rate: number) => {
    if (rate >= 90) return "success";
    if (rate >= 70) return "warning";
    return "danger";
  };

  if (loading) {
    return <LoadingSkeleton className="h-96" />;
  }

  if (trackingData.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
        <p className="text-gray-500">No medication tracking data available</p>
      </div>
    );
  }

  return (
    <div data-testid="medication-tracking-table" className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <Table>
        <THead>
          <tr>
            <TH>Patient</TH>
            <TH>Medication</TH>
            <TH>Dose</TH>
            <TH>Frequency</TH>
            <TH>Last Collected</TH>
            <TH>Next Due</TH>
            <TH>Adherence %</TH>
            <TH>Actions</TH>
          </tr>
        </THead>
        <TBody>
          {trackingData.map((record, i) => {
            const nextDueDate = record.nextDue 
              ? (typeof record.nextDue === 'string' ? new Date(record.nextDue) : record.nextDue)
              : null;
            const isOverdue = nextDueDate && isPast(nextDueDate) && !isToday(nextDueDate);
            
            return (
              <tr 
                key={`${record.patientId}_${record.medicationId}_${record.programId}_${i}`}
                data-testid={`medication-tracking-row-${record.patientId}-${record.medicationId}`}
                className={isOverdue ? "bg-red-50/50" : ""}
              >
                <TD>
                  {onPatientClick ? (
                    <button
                      onClick={() => onPatientClick(record.patientId)}
                      className="text-[#0066cc] hover:underline font-medium text-left"
                    >
                      {record.patientName}
                    </button>
                  ) : (
                    <span className="text-gray-900 font-medium">{record.patientName}</span>
                  )}
                </TD>
                <TD>
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-900">{record.medicationName}</span>
                    <span className="text-xs text-gray-500">{record.programName}</span>
                  </div>
                </TD>
                <TD className="hidden sm:table-cell"><span className="text-gray-700">{record.dosage}</span></TD>
                <TD className="hidden md:table-cell"><span className="text-gray-700">{record.frequency}</span></TD>
                <TD className="hidden lg:table-cell">
                  <span className="text-gray-700 text-sm">
                    {formatDate(record.lastCollected)}
                  </span>
                </TD>
                <TD>
                  <div className="flex flex-col">
                    <span className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-gray-700'}`}>
                      {formatDate(record.nextDue)}
                    </span>
                    {isOverdue && (
                      <span className="text-xs text-red-600">Overdue</span>
                    )}
                  </div>
                </TD>
                <TD>
                  <Badge data-testid={`adherence-badge-${record.patientId}-${record.medicationId}`} variant={getAdherenceBadgeVariant(record.adherenceRate)}>
                    {record.adherenceRate !== undefined && record.adherenceRate !== null ? `${record.adherenceRate}%` : '0%'}
                  </Badge>
                </TD>
                <TD>
                  {onDispenseNow && (
                    <button
                      data-testid={`dispense-button-${record.patientId}-${record.medicationId}`}
                      onClick={() => onDispenseNow(record)}
                      className="px-3 py-1.5 rounded-lg bg-[#0066cc] text-white text-sm font-semibold hover:bg-[#0052a3] active:bg-[#003d7a] shadow-sm hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-[#0066cc] focus:ring-offset-2"
                    >
                      Dispense Now
                    </button>
                  )}
                </TD>
              </tr>
            );
          })}
        </TBody>
      </Table>
    </div>
  );
}

