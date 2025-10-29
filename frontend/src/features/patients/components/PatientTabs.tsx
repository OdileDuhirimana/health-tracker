/**
 * PatientTabs Component
 * Tab content for patient details page
 */

import { Card, CardBody } from "@/components/ui/Card";
import { Table, THead, TBody, TH, TD } from "@/components/Table";
import Badge from "@/components/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/EmptyState";
import { CheckCircleIcon, CalendarDaysIcon, PlusIcon, ClipboardDocumentListIcon } from "@heroicons/react/24/outline";
import { PillIcon } from "@/components/ui/PillIcon";
import { Patient } from "@/types";
import { User } from "@/types";

interface PatientTabsProps {
  activeTab: "overview" | "programs" | "medications" | "attendance";
  patient: Patient;
  programs: any[];
  medications: any[];
  attendance: any[];
  user?: User | null;
  onMarkCompleted?: (programId: string) => void;
  onQuickEnroll?: () => void;
}

export function PatientTabs({
  activeTab,
  patient,
  programs,
  medications,
  attendance,
  user,
  onMarkCompleted,
  onQuickEnroll,
}: PatientTabsProps) {
  if (activeTab === "overview") {
    return (
      <Card>
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Personal Information</h2>
        </div>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Full Name</label>
              <p className="mt-1 text-sm font-semibold text-gray-900">{patient.fullName || patient.name || "—"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Patient ID</label>
              <p className="mt-1 text-sm text-gray-900">{patient.patientId || patient.id || "—"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Date of Birth</label>
              <p className="mt-1 text-sm text-gray-900">
                {patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : "—"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Gender</label>
              <p className="mt-1 text-sm text-gray-900">{patient.gender || "—"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Contact Number</label>
              <p className="mt-1 text-sm text-gray-900">{patient.contactNumber || "—"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Email</label>
              <p className="mt-1 text-sm text-gray-900">{patient.email || "—"}</p>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-600">Address</label>
              <p className="mt-1 text-sm text-gray-900">{patient.address || "—"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Emergency Contact</label>
              <p className="mt-1 text-sm text-gray-900">{patient.emergencyContact || "—"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Status</label>
              <div className="mt-1">
                <Badge variant={patient.status === "active" ? "success" : "neutral"}>
                  {patient.status || "—"}
                </Badge>
              </div>
            </div>
            {patient.medicalNotes && (
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-600">Medical Notes</label>
                <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{patient.medicalNotes}</p>
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    );
  }

  if (activeTab === "programs") {
    return (
      <Card>
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Enrolled Programs</h2>
            <p className="text-sm text-gray-600 mt-1">Programs this patient is currently enrolled in</p>
          </div>
          {(user?.role === "Admin" || user?.role === "Healthcare Staff") && onQuickEnroll && (
            <Button
              variant="primary"
              size="sm"
              onClick={onQuickEnroll}
              leftIcon={<PlusIcon className="h-4 w-4" />}
            >
              Enroll in Program
            </Button>
          )}
        </div>
        <CardBody>
          {programs.length === 0 ? (
            <EmptyState
              icon={<ClipboardDocumentListIcon className="h-12 w-12 text-gray-400" />}
              title="No program enrollments"
              description="This patient is not enrolled in any programs yet."
              action={
                (user?.role === "Admin" || user?.role === "Healthcare Staff") && onQuickEnroll ? (
                  <Button
                    variant="primary"
                    onClick={onQuickEnroll}
                    leftIcon={<PlusIcon className="h-4 w-4" />}
                  >
                    Enroll in Program
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-3">
              {programs.map((enrollment: any) => (
                <div key={enrollment.id} className="p-4 rounded-lg border border-gray-200 bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-semibold text-gray-900">{enrollment.program?.name || "—"}</div>
                        {enrollment.isCompleted && (
                          <Badge variant="completed">
                            <CheckCircleIcon className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        <span className="font-medium">Start:</span> {enrollment.enrollmentDate ? new Date(enrollment.enrollmentDate).toLocaleDateString() : "—"}
                        {enrollment.completedDate && (
                          <> • <span className="font-medium">Expected End:</span> {new Date(enrollment.completedDate).toLocaleDateString()}</>
                        )}
                        {enrollment.isCompleted && enrollment.actualCompletionDate && (
                          <> • <span className="font-medium text-green-600">Completed:</span> {new Date(enrollment.actualCompletionDate).toLocaleDateString()}</>
                        )}
                      </div>
                      {enrollment.program?.duration && enrollment.program?.durationUnit && (
                        <div className="text-xs text-gray-500 mt-1">
                          <span className="font-medium">Duration:</span> {enrollment.program.duration} {enrollment.program.durationUnit}
                          {enrollment.program.durationInDays && (
                            <span className="text-gray-400"> ({enrollment.program.durationInDays} days)</span>
                          )}
                        </div>
                      )}
                      {enrollment.assignedStaff && (
                        <div className="text-xs text-gray-500 mt-1">
                          <span className="font-medium">Assigned Staff:</span> {enrollment.assignedStaff.name || "—"}
                        </div>
                      )}
                      {enrollment.completionNotes && (
                        <div className="text-xs text-gray-500 mt-2 italic">
                          Notes: {enrollment.completionNotes}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default">{enrollment.program?.type || "—"}</Badge>
                    </div>
                  </div>
                  {!enrollment.isCompleted && (user?.role === "Admin" || (user?.role === "Healthcare Staff" && enrollment.assignedStaffId === user?.id)) && (
                    <div className="pt-3 border-t border-gray-200">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onMarkCompleted?.(enrollment.programId)}
                        leftIcon={<CheckCircleIcon className="h-4 w-4" />}
                      >
                        Mark as Completed
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    );
  }

  if (activeTab === "medications") {
    return (
      <Card>
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Medication History</h2>
          <p className="text-sm text-gray-600 mt-1">Complete history of medication dispensations</p>
        </div>
        <CardBody>
          {medications.length === 0 ? (
            <EmptyState
              icon={<PillIcon className="h-12 w-12 text-gray-400" />}
              title="No medication history"
              description="No medications have been dispensed to this patient yet."
            />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Medication</TH>
                  <TH>Dosage</TH>
                  <TH>Dispensed Date</TH>
                  <TH>Dispensed By</TH>
                </tr>
              </THead>
              <TBody>
                {medications.map((med: any) => (
                  <tr key={med.id}>
                    <TD>
                      <span className="font-semibold text-gray-900">{med.medication?.name || "—"}</span>
                    </TD>
                    <TD>
                      <span className="text-gray-700">{med.medication?.dosage || "—"}</span>
                    </TD>
                    <TD>
                      <span className="text-gray-700 text-sm">
                        {med.dispensedAt ? new Date(med.dispensedAt).toLocaleDateString() : "—"}
                      </span>
                    </TD>
                    <TD>
                      <span className="text-gray-700 text-sm">{med.dispensedBy?.name || "—"}</span>
                    </TD>
                  </tr>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>
    );
  }

  if (activeTab === "attendance") {
    return (
      <Card>
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Attendance History</h2>
          <p className="text-sm text-gray-600 mt-1">Track record of patient attendance for program sessions</p>
        </div>
        <CardBody>
          {attendance.length === 0 ? (
            <EmptyState
              icon={<CalendarDaysIcon className="h-12 w-12 text-gray-400" />}
              title="No attendance records"
              description="No attendance records found for this patient."
            />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Program</TH>
                  <TH>Date</TH>
                  <TH>Status</TH>
                  <TH>Check-in Time</TH>
                </tr>
              </THead>
              <TBody>
                {attendance.map((att: any) => (
                  <tr key={att.id}>
                    <TD>
                      <span className="font-semibold text-gray-900">{att.program?.name || "—"}</span>
                    </TD>
                    <TD>
                      <span className="text-gray-700 text-sm">
                        {att.attendanceDate ? new Date(att.attendanceDate).toLocaleDateString() : "—"}
                      </span>
                    </TD>
                    <TD>
                      <Badge
                        variant={
                          att.status === "Present"
                            ? "present"
                            : att.status === "Absent"
                            ? "absent"
                            : att.status === "Late"
                            ? "late"
                            : "neutral"
                        }
                      >
                        {att.status}
                      </Badge>
                    </TD>
                    <TD>
                      <span className="text-gray-700 text-sm">
                        {att.checkInTime ? new Date(att.checkInTime).toLocaleTimeString() : "—"}
                      </span>
                    </TD>
                  </tr>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>
    );
  }

  return null;
}

