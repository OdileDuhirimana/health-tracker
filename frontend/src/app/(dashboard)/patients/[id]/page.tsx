"use client";

/**
 * Patient Details Page
 * Individual patient detail view with tabs for overview, programs, medications, and attendance
 * Refactored for modularity and maintainability
 */

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { TabSwitcher } from "@/components/ui/TabSwitcher";
import Modal from "@/components/ui/Modal";
import { FormField, FormTextarea } from "@/components/ui/FormField";
import EmptyState from "@/components/EmptyState";
import { UserIcon } from "@heroicons/react/24/outline";
import { usePatientDetails } from "@/hooks/usePatientDetails";
import { usePatientEnrollment } from "@/hooks/usePatientEnrollment";
import { PatientProfileHeader } from "@/features/patients/components/PatientProfileHeader";
import { PatientTabs } from "@/features/patients/components/PatientTabs";
import { QuickEnrollmentForm } from "@/components/forms/QuickEnrollmentForm";

export default function PatientDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { notify } = useToast();
  const patientId = params.id as string;
  
  // UUID validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  // Validate patientId on mount
  useEffect(() => {
    if (patientId && !uuidRegex.test(patientId)) {
      notify("Invalid Patient ID in URL. Redirecting to patients list.", "error");
      router.push("/patients");
    }
  }, [patientId, router, notify]);
  
  const [completingProgramId, setCompletingProgramId] = useState<string | null>(null);
  const [completeNotes, setCompleteNotes] = useState("");
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [quickEnrollOpen, setQuickEnrollOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "programs" | "medications" | "attendance">("overview");

  const {
    patient,
    programs,
    medications,
    attendance,
    loading,
    markProgramCompleted,
    loadPatientDetails,
  } = usePatientDetails(patientId);

  const { quickEnrollPatient, loading: enrollingLoading } = usePatientEnrollment();

  const handleMarkCompleted = async () => {
    if (!completingProgramId) return;
    
    try {
      await markProgramCompleted(completingProgramId, completeNotes);
      setCompleteModalOpen(false);
      setCompleteNotes("");
      setCompletingProgramId(null);
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleMarkCompletedClick = (programId: string) => {
    setCompletingProgramId(programId);
    setCompleteModalOpen(true);
  };

  const handleQuickEnroll = async (data: { programId: string; enrollmentDate?: string; assignedStaffId?: string }) => {
    try {
      await quickEnrollPatient(
        patientId,
        data.programId,
        data.enrollmentDate,
        data.assignedStaffId
      );
      setQuickEnrollOpen(false);
      await loadPatientDetails();
    } catch (error) {
      // Error handled by hook
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

  if (!patient) {
    return <EmptyState icon={<UserIcon className="h-12 w-12 text-gray-400" />} title="Patient not found" description="The patient you're looking for doesn't exist." />;
  }

  return (
    <>
      <div className="space-y-6">
        <PatientProfileHeader patient={patient} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="border-b border-gray-200">
              <TabSwitcher
                tabs={[
                  { id: "overview", label: "Overview" },
                  { id: "programs", label: "Programs" },
                  { id: "medications", label: "Medications" },
                  { id: "attendance", label: "Attendance" },
                ]}
                activeTab={activeTab}
                onChange={(id) => setActiveTab(id as "overview" | "programs" | "medications" | "attendance")}
                variant="underline"
              />
            </div>

            <PatientTabs
              activeTab={activeTab}
              patient={patient}
              programs={programs}
              medications={medications}
              attendance={attendance}
              user={user}
              onMarkCompleted={handleMarkCompletedClick}
              onQuickEnroll={() => setQuickEnrollOpen(true)}
            />
          </div>
        </div>
      </div>

      <Modal
        open={completeModalOpen}
        onClose={() => {
          setCompleteModalOpen(false);
          setCompleteNotes("");
          setCompletingProgramId(null);
        }}
        title="Mark Program as Completed"
      >
        <div className="space-y-4">
          <FormField label="Completion Notes (Optional)">
            <FormTextarea
              value={completeNotes}
              onChange={(e) => setCompleteNotes(e.target.value)}
              placeholder="Add any notes about the program completion..."
              rows={4}
            />
          </FormField>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setCompleteModalOpen(false);
                setCompleteNotes("");
                setCompletingProgramId(null);
              }}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleMarkCompleted}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-[#0066cc] text-white font-semibold hover:bg-[#0052a3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Marking..." : "Mark as Completed"}
            </button>
          </div>
        </div>
      </Modal>

      <QuickEnrollmentForm
        open={quickEnrollOpen}
        onClose={() => setQuickEnrollOpen(false)}
        onSubmit={handleQuickEnroll}
        patientId={patientId}
        existingProgramIds={programs.map((p: any) => p.programId || p.program?.id).filter(Boolean)}
        loading={enrollingLoading}
      />
    </>
  );
}
