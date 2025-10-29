/**
 * AttendanceSessionCard Component
 * Displays a single attendance session with patient list
 */

import { Card } from "@/components/ui/Card";
import Badge from "@/components/Badge";

interface AttendanceSessionCardProps {
  session: {
    id: string;
    program: string;
    date: string;
    attended: number;
    total: number;
    patients: Array<{
      id: string;
      name: string;
      checkIn: string | null;
      status: string;
    }>;
  };
  onStatusChange?: (patientId: string, status: string) => void;
  onMarkAllPresent?: () => void;
}

export function AttendanceSessionCard({ session, onStatusChange, onMarkAllPresent }: AttendanceSessionCardProps) {
  return (
    <Card key={session.id} padding="none">
      <div className="p-4 flex items-center justify-between border-b border-gray-200">
        <div>
          <div className="font-semibold text-gray-900">{session.program}</div>
          <div className="text-sm text-gray-600 mt-1">
            {new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>
      <div className="border-t border-gray-200">
        <div className="p-3 text-sm grid grid-cols-5 gap-2 font-semibold text-gray-900 bg-gray-50 border-b border-gray-200">
          <div>Patient</div>
          <div>Enrollment</div>
          <div>Check-in</div>
          <div>Status</div>
          <div className="text-right">
            {onMarkAllPresent && (
              <button
                type="button"
                onClick={onMarkAllPresent}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-semibold transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0066cc] focus:border-transparent"
              >
                Mark All Present
              </button>
            )}
          </div>
        </div>
        {session.patients.map((patient: any, j: number) => (
          <div
            key={patient.id || j}
            className="p-3 text-sm grid grid-cols-5 gap-2 items-center border-b border-gray-200 text-gray-700 last:border-b-0 hover:bg-gray-50 transition-colors"
          >
            <div className="font-medium text-gray-900">{patient.name}</div>
            <div className="text-gray-600">{patient.id}</div>
            <div className="text-gray-600">{patient.checkIn || "—"}</div>
            <div>
              <Badge
                variant={
                  patient.status === "Present"
                    ? "present"
                    : patient.status === "Absent"
                    ? "absent"
                    : patient.status === "Late"
                    ? "late"
                    : patient.status === "Excused"
                    ? "excused"
                    : patient.status === "Canceled"
                    ? "canceled"
                    : "neutral"
                }
              >
                {patient.status}
              </Badge>
            </div>
            <div className="flex justify-end">
              {onStatusChange && (
                <select
                  defaultValue={patient.status}
                  onChange={(e) => onStatusChange(patient.id, e.target.value)}
                  className="px-3 py-2 pr-8 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0066cc] focus:border-transparent transition-all appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3E%3Cpath stroke=%27%236b7280%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%272%27 d=%27M6 8l4 4 4-4%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_0.75rem_center] bg-[length:1em_1em]"
                >
                  <option>Present</option>
                  <option>Absent</option>
                  <option>Late</option>
                  <option>Excused</option>
                  <option>Canceled</option>
                </select>
              )}
            </div>
          </div>
        ))}
        <div className="p-3 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700 font-medium">Attendance Summary:</span>
            <span className="text-gray-900 font-semibold">{session.attended}/{session.total} patients attended</span>
          </div>
          <div className="mt-2">
            <div className="h-2 rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-[#0066cc] transition-all"
                style={{ width: `${(session.attended / session.total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

