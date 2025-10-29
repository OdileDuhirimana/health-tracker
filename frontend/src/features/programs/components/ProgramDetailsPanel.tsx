/**
 * ProgramDetailsPanel Component
 * Sidebar panel showing detailed program information
 */

import SidebarPanel from "@/components/ui/SidebarPanel";
import Badge from "@/components/Badge";
import { Program, Medication } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

interface ProgramDetailsPanelProps {
  open: boolean;
  onClose: () => void;
  program: Program | null;
  medications: Medication[];
}

export function ProgramDetailsPanel({ open, onClose, program, medications }: ProgramDetailsPanelProps) {
  const { user } = useAuth();
  if (!program) return null;

  return (
    <SidebarPanel open={open} onClose={onClose} title="Program Details">
      <div className="space-y-6">
        {/* Program Header */}
        <div className="border-b border-gray-200 pb-4">
          <h2 className="text-xl font-bold text-gray-900 mb-2 leading-tight">
            {program.name}
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            {program.description || "No description provided."}
          </p>
        </div>

        {/* Program Details */}
        <div className="space-y-4">
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Program Type</div>
            <div className="text-base text-gray-900 font-medium">
              {program.type || "—"}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Status</div>
            <Badge variant={program.status === "Active" ? "active" : "inactive"}>
              {program.status || "—"}
            </Badge>
          </div>
          {user?.role !== "Guest" && (
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Patients Enrolled</div>
              <div className="text-2xl text-gray-900 font-bold">
                {program.totalPatients !== undefined ? program.totalPatients : (program as any).enrollments?.length || 0}
              </div>
            </div>
          )}
          {user?.role !== "Guest" && program.assignedStaff && program.assignedStaff.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Assigned Staff</div>
              <ul className="space-y-2">
                {program.assignedStaff.map((staff: any) => (
                  <li key={staff.id || staff.userId} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-200">
                    <div className="h-8 w-8 rounded-full bg-[#0066cc] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {(staff.name || staff.email || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">
                        {staff.name || staff.email || "Unknown User"}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {staff.email || staff.role || "Staff Member"}
                      </div>
                    </div>
                    {staff.role && (
                      <Badge variant={staff.role === "Healthcare Staff" ? "active" : "inactive"}>
                        {staff.role}
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Medications</div>
            <ul className="space-y-2">
              {program.medications && program.medications.length > 0 ? (
                program.medications.map((med: any) => {
                  // Check if med is already a full object with name
                  if (typeof med === 'object' && med.name) {
                    return (
                      <li key={med.id} className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
                        <span className="text-blue-600 font-bold mt-0.5">•</span>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-900">{med.name}</div>
                          <div className="text-xs text-gray-600 mt-0.5">
                            {med.dosage && <span className="mr-2">{med.dosage}</span>}
                            {med.frequency && <span className="text-blue-600 font-medium">({med.frequency})</span>}
                          </div>
                        </div>
                      </li>
                    );
                  }
                  
                  // Otherwise, try to find it in the medications list
                  const medId = typeof med === 'string' ? med : med.id;
                  const medication = medications.find(m => m.id === medId);
                  return medication ? (
                    <li key={medication.id} className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
                      <span className="text-blue-600 font-bold mt-0.5">•</span>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-900">{medication.name}</div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          {medication.dosage && <span className="mr-2">{medication.dosage}</span>}
                          {medication.frequency && <span className="text-blue-600 font-medium">({medication.frequency})</span>}
                        </div>
                      </div>
                    </li>
                  ) : (
                    <li key={medId} className="text-sm text-gray-500 italic p-2">
                      Loading medication details...
                    </li>
                  );
                })
              ) : (
                <li className="text-sm text-gray-500 italic p-2">No medications assigned</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </SidebarPanel>
  );
}

