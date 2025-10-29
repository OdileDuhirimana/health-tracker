"use client";

/**
 * Medication Details Page
 * Individual medication detail view
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
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { medicationsService, programsService, dispensationsService } from "@/services";
import Button from "@/components/ui/Button";

export default function MedicationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { notify } = useToast();
  const medicationId = params.id as string;
  const [medication, setMedication] = useState<any>(null);
  const [programs, setPrograms] = useState<any[]>([]);
  const [dispensations, setDispensations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMedicationDetails();
  }, [medicationId]);

  const loadMedicationDetails = async () => {
    setLoading(true);
    try {
      const medicationResponse = await medicationsService.getById(medicationId);
      if (medicationResponse.data) {
        const medication = medicationResponse.data;
        setMedication(medication);
        
        // Load assigned programs
        const programsResponse = await programsService.getAll();
        if (programsResponse.data) {
          const programsArray = Array.isArray(programsResponse.data)
            ? programsResponse.data
            : programsResponse.data.data || [];
          const assignedPrograms = programsArray.filter((p: any) => 
            p.medications?.some((m: any) => m.id === medicationId) ||
            (medication as any).programs?.some((p: any) => p.id === (medication as any).programId)
          );
          setPrograms(assignedPrograms);
        }
        
        // Load dispensation history
        const dispResponse = await dispensationsService.getAll();
        if (dispResponse.data) {
          const dispensationsArray = Array.isArray(dispResponse.data)
            ? dispResponse.data
            : [];
          setDispensations(dispensationsArray.filter((d: any) => d.medicationId === medicationId || d.medication?.id === medicationId));
        }
      } else {
        notify(medicationResponse.error || "Medication not found", "error");
        router.push("/medications/management");
      }
    } catch (error) {
      notify("Failed to load medication details", "error");
      router.push("/medications/management");
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

  if (!medication) {
    return <EmptyState icon="💊" title="Medication not found" description="The medication you're looking for doesn't exist." />;
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
          title={`${medication.name || "Medication"} Details`}
          description="View comprehensive medication information, assigned programs, and dispensation history"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="p-5 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Medication Information</h2>
            </div>
            <CardBody>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Medication Name</label>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{medication.name || "—"}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Dosage</label>
                    <p className="mt-1 text-sm text-gray-900">{medication.dosage || "—"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Frequency</label>
                    <p className="mt-1 text-sm text-gray-900">{medication.frequency || "—"}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Program Type</label>
                  <div className="mt-1">
                    <Badge variant="default">{medication.programType || "—"}</Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <div className="mt-1">
                    <Badge variant={medication.status === "Active" ? "active" : "inactive"}>
                      {medication.status || "—"}
                    </Badge>
                  </div>
                </div>
                {medication.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Description</label>
                    <p className="mt-1 text-sm text-gray-900">{medication.description}</p>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <div className="p-5 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Assigned Programs</h2>
              <p className="text-sm text-gray-600 mt-1">Programs this medication is assigned to</p>
            </div>
            <CardBody>
              {programs.length === 0 ? (
                <EmptyState
                  icon="📋"
                  title="No assigned programs"
                  description="This medication is not assigned to any programs yet."
                />
              ) : (
                <div className="space-y-3">
                  {programs.map((program: any) => (
                    <div key={program.id} className="p-4 rounded-lg border border-gray-200 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-gray-900">{program.name}</div>
                          <div className="text-xs text-gray-600 mt-1">{program.type}</div>
                        </div>
                        <Badge variant={program.status === "Active" ? "active" : "inactive"}>
                          {program.status || "—"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <div className="p-5 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Dispensation History</h2>
              <p className="text-sm text-gray-600 mt-1">Recent dispensations of this medication</p>
            </div>
            <CardBody>
              {dispensations.length === 0 ? (
                <EmptyState
                  icon="📋"
                  title="No dispensation history"
                  description="No dispensations have been recorded for this medication yet."
                />
              ) : (
                <Table>
                  <THead>
                    <tr>
                      <TH>Patient</TH>
                      <TH>Program</TH>
                      <TH>Dispensed Date</TH>
                      <TH>Dispensed By</TH>
                      <TH>Notes</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {dispensations.map((disp: any) => (
                      <tr key={disp.id}>
                        <TD>
                          <span className="font-semibold text-gray-900">{disp.patient?.name || disp.patientName || "—"}</span>
                        </TD>
                        <TD>
                          <span className="text-gray-700">{disp.program?.name || "—"}</span>
                        </TD>
                        <TD>
                          <span className="text-gray-700 text-sm">
                            {disp.dispensedAt ? new Date(disp.dispensedAt).toLocaleDateString() : "—"}
                          </span>
                        </TD>
                        <TD>
                          <span className="text-gray-700 text-sm">{disp.dispensedBy?.name || "—"}</span>
                        </TD>
                        <TD>
                          <span className="text-gray-700 text-sm">{disp.notes || "—"}</span>
                        </TD>
                      </tr>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardBody>
              <div className="flex flex-col items-center text-center">
                <div className="h-20 w-20 rounded-full bg-[#0066cc] flex items-center justify-center text-white text-3xl font-bold mb-4">
                  💊
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">{medication.name || "Medication"}</h3>
                <p className="text-sm text-gray-600 mb-4">{medication.dosage || "—"}</p>
                <div className="w-full border-t border-gray-200 pt-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 font-medium">Status</span>
                    <Badge variant={medication.status === "Active" ? "active" : "inactive"}>
                      {medication.status || "—"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 font-medium">Frequency</span>
                    <span className="text-gray-900 font-semibold">{medication.frequency || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 font-medium">Assigned Programs</span>
                    <span className="text-gray-900 font-semibold">{programs.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 font-medium">Total Dispensations</span>
                    <span className="text-gray-900 font-semibold">{dispensations.length}</span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
