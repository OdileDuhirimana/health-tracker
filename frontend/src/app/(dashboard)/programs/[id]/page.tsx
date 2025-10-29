"use client";

/**
 * Program Details Page
 * Individual program detail view
 * Refactored for modularity and maintainability
 */

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import Badge from "@/components/Badge";
import { Table, THead, TBody, TH, TD } from "@/components/Table";
import EmptyState from "@/components/EmptyState";
import { ArrowLeftIcon, UsersIcon } from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";
import { programsService, patientsService } from "@/services";

export default function ProgramDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { notify } = useToast();
  const programId = params.id as string;
  const [program, setProgram] = useState<any>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgramDetails();
  }, [programId]);

  const loadProgramDetails = async () => {
    setLoading(true);
    try {
      const programResponse = await programsService.getById(programId);
      if (programResponse.data) {
        setProgram(programResponse.data);
        // Load patients enrolled in this program (only for non-Guest users)
        if (user && user.role !== "Guest") {
          const patientsResponse = await patientsService.getAll();
          if (patientsResponse.data) {
            const patientsArray = Array.isArray(patientsResponse.data) 
              ? patientsResponse.data 
              : (patientsResponse.data?.data || []);
            setPatients(patientsArray.filter((p: any) => 
              p.programs?.some((prog: any) => prog.id === programId) || 
              p.enrollments?.some((e: any) => e.programId === programId)
            ));
          }
        }
      } else {
        notify(programResponse.error || "Program not found", "error");
        router.push("/programs");
      }
    } catch (error) {
      notify("Failed to load program details", "error");
      router.push("/programs");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!program) {
    return <EmptyState icon="📋" title="Program not found" description="The program you're looking for doesn't exist." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          aria-label="Go back"
          leftIcon={<ArrowLeftIcon className="h-5 w-5" />}
        >
          Back
        </Button>
        <PageHeader
          title={program.name || "Program Details"}
          description="View comprehensive program information, enrolled patients, and assigned medications"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="p-5 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Program Information</h2>
            </div>
            <CardBody>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Program Type</label>
                  <div className="mt-1">
                    <Badge variant="default">{program.type || "—"}</Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Description</label>
                  <p className="mt-1 text-sm text-gray-900">{program.description || "No description provided."}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <div className="mt-1">
                    <Badge variant={program.status === "Active" ? "success" : "neutral"}>
                      {program.status || "—"}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Session Frequency</label>
                  <p className="mt-1 text-sm text-gray-900">{program.sessionFrequency || "Weekly"}</p>
                </div>
                {user?.role !== "Guest" && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Total Enrolled Patients</label>
                    <p className="mt-1 text-lg font-semibold text-gray-900">{patients.length || 0}</p>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <div className="p-5 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Assigned Medications</h2>
            </div>
            <CardBody>
              {program.medications && program.medications.length > 0 ? (
                <div className="space-y-3">
                  {program.medications.map((med: any) => (
                    <div key={med.id} className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                      <div className="font-semibold text-gray-900 text-sm">{med.name}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {med.dosage} • {med.frequency}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No medications assigned to this program.</p>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <div className="p-5 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Quick Stats</h2>
            </div>
            <CardBody>
              <div className="space-y-4">
                {user?.role !== "Guest" && (
                  <div>
                    <div className="text-xs text-gray-600 font-medium">Enrolled Patients</div>
                    <div className="text-2xl font-bold text-gray-900 mt-1">{patients.length}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-gray-600 font-medium">Medications</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">
                    {program.medications?.length || 0}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 font-medium">Created</div>
                  <div className="text-sm font-semibold text-gray-900 mt-1">
                    {program.createdAt ? new Date(program.createdAt).toLocaleDateString() : "—"}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {user?.role !== "Guest" && (
        <Card>
          <div className="p-5 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Enrolled Patients</h2>
            <p className="text-sm text-gray-600 mt-1">View all patients currently enrolled in this program</p>
          </div>
          <CardBody>
            {patients.length === 0 ? (
              <EmptyState
                icon={<UsersIcon className="h-12 w-12 text-gray-400" />}
                title="No patients enrolled"
                description="No patients are currently enrolled in this program."
              />
            ) : (
              <Table>
                <THead>
                  <tr>
                    <TH>Patient Name</TH>
                    <TH>Patient ID</TH>
                    <TH>Contact</TH>
                    <TH>Email</TH>
                    <TH>Enrollment Date</TH>
                  </tr>
                </THead>
                <TBody>
                  {patients.map((patient) => (
                    <tr key={patient.id}>
                      <TD>
                        <div className="font-semibold text-gray-900">{patient.fullName || patient.name}</div>
                      </TD>
                      <TD>
                        <span className="text-gray-700 text-sm">{patient.patientId || patient.id}</span>
                      </TD>
                      <TD>
                        <span className="text-gray-700">{patient.contactNumber || "—"}</span>
                      </TD>
                      <TD>
                        <span className="text-gray-700">{patient.email || "—"}</span>
                      </TD>
                      <TD>
                        <span className="text-gray-700 text-sm">
                          {patient.enrollments?.[0]?.enrollmentDate
                            ? new Date(patient.enrollments[0].enrollmentDate).toLocaleDateString()
                            : "—"}
                        </span>
                      </TD>
                    </tr>
                  ))}
                </TBody>
              </Table>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
