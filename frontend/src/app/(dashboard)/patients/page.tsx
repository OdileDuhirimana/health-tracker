"use client";

/**
 * Patients Page
 * Main page for viewing and managing patients
 * Refactored for modularity and maintainability
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { PageHeader, SearchBar } from "@/components/ui/PageHeader";
import { TabSwitcher } from "@/components/ui/TabSwitcher";
import { PatientForm } from "@/components/forms/PatientForm";
import { Card } from "@/components/ui/Card";
import EmptyState from "@/components/EmptyState";
import SidebarPanel from "@/components/ui/SidebarPanel";
import { PencilIcon, LockClosedIcon, UsersIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { usePatients } from "@/hooks/usePatients";
import { usePrograms } from "@/hooks/usePrograms";
import { usePatientEnrollment } from "@/hooks/usePatientEnrollment";
import { PatientFilters } from "@/features/patients/components/PatientFilters";
import { PatientCardGrid } from "@/features/patients/components/PatientCardGrid";
import { Pagination } from "@/components/ui/Pagination";
import { exportPatientProgress } from "@/utils/csv";
import { Patient, PatientFilters as PatientFiltersType } from "@/types";
import { useDebounce } from "@/hooks/useDebounce";

export default function PatientsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { notify } = useToast();
  
  // State management
  const [tab, setTab] = useState<"all" | "enroll">("all");
  const [query, setQuery] = useState("");
  const [programFilter, setProgramFilter] = useState("");
  const [sortBy, setSortBy] = useState<"progress" | "adherence" | "">("");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Debounce search query for better performance
  const debouncedQuery = useDebounce(query, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Build filters object - removed progressMin and adherenceMin per Phase 3 requirements
  const filters: PatientFiltersType = {
    search: debouncedQuery || undefined,
    programId: programFilter || undefined,
    sortBy: sortBy || undefined,
    sortOrder: sortOrder,
    page: currentPage,
    limit: itemsPerPage,
  };

  // Custom hooks
  const { patients, pagination, loading: patientsLoading, loadPatients, updatePatient } = usePatients(filters);

  // Reset to page 1 when filters change (except page itself)
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, programFilter, sortBy, sortOrder]);
  const { programs, loading: programsLoading, loadPrograms } = usePrograms();
  const { enrollPatient, loading: enrollmentLoading } = usePatientEnrollment();

  // Redirect Guest users
  useEffect(() => {
    if (user && user.role === "Guest") {
      notify("Access denied. Guest users can only view public health programs.", "error");
      router.push("/programs");
    }
  }, [user, router, notify]);

  // Early return for Guest users
  if (user && user.role === "Guest") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-8 text-center max-w-md">
          <div className="mb-4 flex justify-center">
            <LockClosedIcon className="h-16 w-16 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Guest users can only view public health programs.
          </p>
        </div>
      </div>
    );
  }

  // Load data - removed progressMin and adherenceMin from dependencies
  useEffect(() => {
    if (user && user.role !== "Guest") {
      loadPatients();
      loadPrograms();
    }
  }, [user, debouncedQuery, programFilter, sortBy, sortOrder, currentPage]);

  // Handlers
  const handleEnrollPatient = async (data: any) => {
    try {
      await enrollPatient(data, loadPatients);
      setTab("all");
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleUpdatePatient = async (data: any) => {
    if (!selectedPatient) return;
    try {
      await updatePatient(selectedPatient.id, {
        fullName: data.name,
        dateOfBirth: data.dob,
        gender: data.gender,
        contactNumber: data.contact,
        email: data.email,
        address: data.address,
        emergencyContact: data.emergencyContact,
        medicalNotes: data.medicalNotes,
      });
      setEditOpen(false);
      setSelectedPatient(null);
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleExportProgress = () => {
    // Use real patient data instead of mock data
    const exportData = patients.map((patient) => ({
      id: patient.patientId || patient.id,
      name: patient.name || patient.fullName,
      email: patient.email || "",
      program: patient.programs?.[0] || "",
      enrollmentDate: patient.enrollments?.[0]?.enrollmentDate || "",
      sessionsCompleted: patient.progress?.sessionsCompleted || 0,
      sessionsMissed: patient.progress?.sessionsMissed || 0,
      attendanceRate: patient.progress?.attendanceRate || 0,
      medicationsDispensed: patient.progress?.medicationsDispensed || 0,
      adherenceRate: patient.progress?.adherenceRate || 0,
      status: patient.status || "Active",
    }));
    
    if (exportData.length === 0) {
      notify("No patient data to export", "error");
      return;
    }
    
    exportPatientProgress(exportData);
    notify("Patient progress exported", "success");
  };

  const clearFilters = () => {
    setProgramFilter("");
    setSortBy("");
    setSortOrder("DESC");
  };

  const hasNoAssignedPatients = user?.role === "Healthcare Staff" && patients.length === 0;
  const loading = patientsLoading || programsLoading || enrollmentLoading;

  return (
    <>
      <div className="space-y-4">
        <TabSwitcher
          tabs={[
            { id: "all", label: "All Patients" },
            { id: "enroll", label: "Enroll Patient" },
          ]}
          activeTab={tab}
          onChange={(id) => setTab(id as "all" | "enroll")}
        />

        {tab === "all" ? (
          <div className="space-y-6">
            <SearchBar
              value={query}
              onChange={setQuery}
              placeholder="Search patients by name, ID, email, or phone number..."
              filters={
                <PatientFilters
                  programFilter={programFilter}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  programs={programs}
                  onProgramFilterChange={setProgramFilter}
                  onSortByChange={setSortBy}
                  onSortOrderChange={setSortOrder}
                  onClear={clearFilters}
                />
              }
              actions={
                <button
                  onClick={handleExportProgress}
                  className="px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-semibold transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  <span><ArrowDownTrayIcon className="h-4 w-4" /></span>
                  Export Progress
                </button>
              }
            />
            
            {hasNoAssignedPatients ? (
              <Card padding="lg" className="text-center">
                <div className="flex justify-center mb-4">
                  <UsersIcon className="h-16 w-16 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-amber-900 mb-2">Not assigned to any patients</h3>
                <p className="text-sm text-amber-700 leading-relaxed max-w-md mx-auto">
                  You are not currently assigned to any patients. Please contact an administrator to be assigned to patient programs.
                </p>
              </Card>
            ) : patients.length === 0 ? (
              <EmptyState
                icon={<UsersIcon className="h-16 w-16 text-gray-400" />}
                title="No patients found"
                description={user?.role === "Admin" 
                  ? "No patients match your search criteria."
                  : "No patients match your search criteria."}
              />
            ) : (
              <>
                <PatientCardGrid patients={patients} />
                {pagination && pagination.totalPages > 1 && (
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    totalItems={pagination.total}
                    itemsPerPage={pagination.limit}
                    onPageChange={(page) => {
                      setCurrentPage(page);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  />
                )}
              </>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Enroll New Patient</h2>
            <p className="text-sm text-gray-600 mb-6">
              Add a new patient to the system and enroll them in a health program. Fill in all required information to complete the enrollment process.
            </p>
            <PatientForm
              open={true}
              onClose={() => setTab("all")}
              onSubmit={handleEnrollPatient}
              programs={programs}
              loading={loading}
              inline={true}
            />
          </div>
        )}
      </div>

      {/* Patient Details Sidebar */}
      <SidebarPanel open={detailsOpen} onClose={() => setDetailsOpen(false)} title="Patient Details">
        <div className="space-y-6">
          <div className="border-b border-gray-200 pb-4">
            <div className="flex items-center gap-4 mb-3">
              <div className="h-14 w-14 rounded-full bg-[#0066cc] flex items-center justify-center text-white text-lg font-bold">
                {selectedPatient?.name
                  ?.split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2) || "JD"}
              </div>
              <div>
                <div className="font-bold text-gray-900 text-lg">{selectedPatient?.name || "Patient Name"}</div>
                <div className="text-sm text-gray-500">ID: {selectedPatient?.id || "—"}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-gray-600 font-medium mb-1">Contact</div>
                <div className="text-gray-900">{selectedPatient?.contactNumber || "—"}</div>
              </div>
              <div>
                <div className="text-gray-600 font-medium mb-1">Email</div>
                <div className="text-gray-900">{selectedPatient?.email || "—"}</div>
              </div>
            </div>
          </div>

          <div className="border-b border-gray-200 pb-4">
            <div className="flex gap-2 mb-4">
              <button className="px-3 py-2 text-[#0066cc] font-semibold border-b-2 border-[#0066cc] text-sm">
                Programs
              </button>
            </div>
            <div className="space-y-3">
              {selectedPatient?.programs?.map((program: string, idx: number) => (
                <div key={idx} className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                  <div className="font-semibold text-gray-900 text-sm mb-1">{program}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {user?.role === "Admin" && (
              <button
                onClick={() => {
                  setSelectedPatient(selectedPatient);
                  setEditOpen(true);
                }}
                className="w-full px-4 py-2.5 rounded-lg bg-[#0066cc] text-white font-semibold hover:bg-[#0052a3] transition-colors text-sm flex items-center justify-center gap-2"
              >
                <PencilIcon className="h-4 w-4" />
                Edit Patient Info
              </button>
            )}
          </div>
        </div>
      </SidebarPanel>

      {/* Edit Patient Modal */}
      <PatientForm
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setSelectedPatient(null);
        }}
        onSubmit={handleUpdatePatient}
        programs={programs}
        loading={loading}
        initialValues={selectedPatient ? {
          name: selectedPatient.name,
          dob: selectedPatient.dateOfBirth,
          gender: selectedPatient.gender,
          contact: selectedPatient.contactNumber,
          email: selectedPatient.email,
          address: selectedPatient.address,
          emergencyContact: selectedPatient.emergencyContact,
          medicalNotes: selectedPatient.medicalNotes,
        } : undefined}
      />
    </>
  );
}
