"use client";

/**
 * Medications Page
 * Main page for tracking medication dispensations
 * Refactored for modularity and maintainability
 */

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Cog6ToothIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { PageHeader, SearchBar } from "@/components/ui/PageHeader";
import { DispensationForm } from "@/components/forms/DispensationForm";
import { Alert } from "@/components/ui/Alert";
import SidebarPanel from "@/components/ui/SidebarPanel";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { useDispensations } from "@/hooks/useDispensations";
import { MedicationTrackingTable } from "@/features/medications/components/MedicationTrackingTable";
import { Pagination } from "@/components/ui/Pagination";
import { useDebounce } from "@/hooks/useDebounce";
import { dispensationsService } from "@/services";

export default function MedicationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { notify } = useToast();
  const [recordOpen, setRecordOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [overdueOpen, setOverdueOpen] = useState(false);
  const [quickDispenseData, setQuickDispenseData] = useState<any>(null);
  const [overdueMedications, setOverdueMedications] = useState<any[]>([]);
  const [loadingOverdue, setLoadingOverdue] = useState(false);
  const [overdueViewAll, setOverdueViewAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const {
    dispensations,
    patients,
    programs,
    medications,
    trackingTable,
    overdueCount,
    loading,
    loadPatients,
    loadPrograms,
    loadMedications,
    loadDispensations,
    loadOverdueCount,
    recordDispensation,
  } = useDispensations();

  // Guest users cannot access medication dispensation data
  useEffect(() => {
    if (user && user.role === "Guest") {
      notify("Access denied. Guest users can only view public health programs.", "error");
      router.push("/programs");
    }
  }, [user, router, notify]);

  // React Query handles loading automatically, no manual loading needed

  // Filter tracking data based on search query - MUST be before any conditional returns
  const filteredTrackingData = useMemo(() => {
    // Ensure trackingTable is an array
    if (!trackingTable || !Array.isArray(trackingTable)) return [];
    if (!debouncedSearch) return trackingTable;
    const searchLower = debouncedSearch.toLowerCase();
    return trackingTable.filter((record: any) =>
      (record.patientName || "").toLowerCase().includes(searchLower) ||
      (record.medicationName || "").toLowerCase().includes(searchLower) ||
      (record.programName || "").toLowerCase().includes(searchLower)
    );
  }, [trackingTable, debouncedSearch]);

  // Paginate filtered data
  const totalPages = Math.ceil(filteredTrackingData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTrackingData = filteredTrackingData.slice(startIndex, startIndex + itemsPerPage);

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

  const handleRecordDispensation = async (data: {
    patientId: string;
    programId: string;
    medicationId: string;
    dispensedAt: string;
    notes?: string;
  }) => {
    try {
      await recordDispensation(data);
      setRecordOpen(false);
      setQuickDispenseData(null);
    } catch (error) {
      // Error handled by hook
    }
  };

  const handlePatientClick = (patientId: string) => {
    setHistoryOpen(true);
  };

  const handleDispenseNow = (dispensation: any) => {
    setQuickDispenseData({
      patientId: dispensation.patientId,
      programId: dispensation.programId,
      medicationId: dispensation.medicationId,
    });
    setRecordOpen(true);
  };

  return (
    <>
      <div className="space-y-4">
        <PageHeader
          title="Medication Tracking"
          description="Track medication dispensation schedules, record dispensations, and monitor patient medication adherence across all programs"
          action={
            <>
              <input
                type="date"
                className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
              />
              {user?.role === "Admin" && (
                <button
                  onClick={() => router.push("/medications/management")}
                  className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-semibold transition-colors flex items-center gap-2"
                >
                  <Cog6ToothIcon className="h-4 w-4" />
                  Manage Medications
                </button>
              )}
              <button
                onClick={() => setRecordOpen(true)}
                className="px-4 py-2 rounded-lg bg-[#0066cc] text-white font-semibold hover:bg-[#0052a3] shadow-md transition-all"
              >
                Record Dispensation
              </button>
            </>
          }
        />

        {overdueCount > 0 && (
          <Alert
            variant="error"
            title={`${overdueCount} medication${overdueCount !== 1 ? 's' : ''} overdue for dispensation`}
            action={{
              label: "View Details",
              onClick: async () => {
                setLoadingOverdue(true);
                setOverdueOpen(true);
                try {
                  const response = await dispensationsService.getOverdueDetails();
                  if (response.data) {
                    setOverdueMedications(response.data || []);
                  }
                } catch (error) {
                  notify("Failed to load overdue medications", "error");
                } finally {
                  setLoadingOverdue(false);
                }
              },
            }}
          />
        )}

        {/* Medical Tracking Table - Main Feature */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Medical Tracking Table</h2>
            <p className="text-sm text-gray-600">
              Comprehensive view of all patients, their medications, and adherence rates
            </p>
          </div>
          {loading || !trackingTable ? (
            <LoadingSkeleton className="h-96" />
          ) : trackingTable.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
              <p className="text-gray-600">No medication tracking data available yet.</p>
              <p className="text-sm text-gray-500 mt-2">Patients must be enrolled in programs with medications assigned.</p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <SearchBar
                  placeholder="Search by patient, medication, or program..."
                  value={searchQuery}
                  onChange={setSearchQuery}
                />
              </div>
              <MedicationTrackingTable
                trackingData={paginatedTrackingData.map((record: any) => {
                  // Safely convert dates, handle if already Date objects or invalid
                  let lastCollected = null;
                  let nextDue = new Date();
                  
                  try {
                    if (record.lastCollected) {
                      lastCollected = record.lastCollected instanceof Date 
                        ? record.lastCollected 
                        : new Date(record.lastCollected);
                    }
                    if (record.nextDue) {
                      nextDue = record.nextDue instanceof Date 
                        ? record.nextDue 
                        : new Date(record.nextDue);
                    }
                  } catch (e) {
                    // Date conversion error handled silently
                  }
                  
                  return {
                    ...record,
                    lastCollected,
                    nextDue,
                  };
                })}
                loading={false}
                onPatientClick={handlePatientClick}
                onDispenseNow={(record) => handleDispenseNow({
                  patientId: record.patientId,
                  programId: record.programId,
                  medicationId: record.medicationId,
                })}
              />
              {totalPages > 1 && (
                <div className="mt-4">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredTrackingData.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={(page) => {
                      setCurrentPage(page);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>

      </div>

      <DispensationForm
        open={recordOpen}
        onClose={() => {
          setRecordOpen(false);
          setQuickDispenseData(null);
        }}
        onSubmit={handleRecordDispensation}
        patients={patients}
        programs={programs}
        medications={medications}
        quickDispenseData={quickDispenseData}
        loading={loading}
      />

      <SidebarPanel open={historyOpen} onClose={() => setHistoryOpen(false)} title="Medication History">
        <div className="text-sm space-y-3 text-gray-700">
          <div className="font-semibold text-gray-900">John Doe</div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Sertraline 50mg</span>
              <span className="text-xs text-gray-500">Today, 9:05 AM</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Sertraline 50mg</span>
              <span className="text-xs text-red-600">Yesterday, 10:20 AM (late)</span>
            </div>
          </div>
        </div>
      </SidebarPanel>

      <SidebarPanel open={overdueOpen} onClose={() => {
        setOverdueOpen(false);
        setOverdueViewAll(false);
      }} title="Overdue Medications">
        {loadingOverdue ? (
          <LoadingSkeleton className="h-64" />
        ) : overdueMedications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No overdue medications found.</p>
          </div>
        ) : (
          <>
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                <span className="font-semibold">{overdueMedications.length}</span> medication{overdueMedications.length !== 1 ? 's' : ''} overdue
              </p>
            </div>
            <div className="space-y-3">
              {(overdueViewAll ? overdueMedications : overdueMedications.slice(0, 10)).map((med: any, idx: number) => (
                <div
                  key={`${med.patientId}_${med.medicationId}_${med.programId}_${idx}`}
                  className="p-3 border border-red-200 bg-red-50 rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{med.patientName}</div>
                      <div className="text-sm text-gray-700 mt-1">
                        <span className="font-medium">{med.medicationName}</span> - {med.dosage} ({med.frequency})
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{med.programName}</div>
                      <div className="text-xs text-red-600 mt-1">
                        Next due: {med.nextDue ? new Date(med.nextDue).toLocaleString() : "N/A"}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDispenseNow({
                        patientId: med.patientId,
                        programId: med.programId,
                        medicationId: med.medicationId,
                      })}
                      className="px-3 py-1.5 rounded-lg bg-[#0066cc] text-white text-xs font-semibold hover:bg-[#0052a3] transition-colors"
                    >
                      Dispense Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {overdueMedications.length > 10 && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setOverdueViewAll(!overdueViewAll)}
                  className="px-4 py-2 text-sm font-medium text-[#0066cc] hover:text-[#0052a3] hover:bg-blue-50 rounded-lg transition-colors"
                >
                  {overdueViewAll ? `Show Less` : `View All (${overdueMedications.length})`}
                </button>
              </div>
            )}
          </>
        )}
      </SidebarPanel>
    </>
  );
}
