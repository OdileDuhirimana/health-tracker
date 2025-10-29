"use client";

/**
 * Attendance Page
 * Main page for tracking program attendance with records management
 * Refactored for modularity and maintainability
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CalendarDaysIcon, LockClosedIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { PageHeader, SearchBar } from "@/components/ui/PageHeader";
import { AttendanceForm } from "@/components/forms/AttendanceForm";
import { EditAttendanceForm } from "@/components/forms/EditAttendanceForm";
import { AttendanceRecordsTable } from "@/features/attendance/components/AttendanceRecordsTable";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/EmptyState";
import { Card } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { useAttendance } from "@/hooks/useAttendance";
import { AttendanceSessionCard } from "@/features/attendance/components/AttendanceSessionCard";
import { AttendanceStatistics } from "@/features/attendance/components/AttendanceStatistics";
import { Attendance, AttendanceStatus } from "@/types";
import { useDebounce } from "@/hooks/useDebounce";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { FormField, FormSelect, FormInput } from "@/components/ui/FormField";

export default function AttendancePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { notify } = useToast();
  const [markOpen, setMarkOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<Attendance | null>(null);
  const [programFilter, setProgramFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | "">("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const itemsPerPage = 15;

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Build filters object
  const filters = {
    programId: programFilter || undefined,
    date: dateFilter || undefined,
    status: statusFilter || undefined,
    search: debouncedSearch || undefined,
    page: currentPage,
    limit: itemsPerPage,
  };

  const {
    sessions,
    attendanceRecords,
    pagination,
    statistics,
    programs,
    patients,
    loading,
    loadingRecords,
    loadPrograms,
    loadPatients,
    loadSessions,
    loadStatistics,
    markAttendance,
    updateAttendance,
    deleteAttendance,
  } = useAttendance(filters);

  // Reset to page 1 when filters change (except page itself)
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programFilter, dateFilter, statusFilter, debouncedSearch]);

  // Guest users cannot access attendance data
  useEffect(() => {
    if (user && user.role === "Guest") {
      notify("Access denied. Guest users can only view public health programs.", "error");
      router.push("/programs");
    }
  }, [user, router, notify]);

  useEffect(() => {
    if (user && user.role !== "Guest") {
      loadPrograms();
      loadPatients();
      loadSessions();
      loadStatistics();
    }
  }, [user, loadPrograms, loadPatients, loadSessions, loadStatistics]);

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

  const handleMarkAttendance = async (data: {
    programId: string;
    attendanceDate: string;
    time: string;
    attendance: Array<{
      patientId: string;
      status: "Present" | "Absent" | "Late" | "Excused" | "Canceled";
      checkInTime?: string;
    }>;
  }) => {
    try {
      await markAttendance({
        programId: data.programId,
        attendanceDate: data.attendanceDate,
        attendance: data.attendance.map(att => ({
          ...att,
          checkInTime: `${data.attendanceDate}T${data.time}:00`,
        })),
      });
      setMarkOpen(false);
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleStatusChange = (patientId: string, status: string) => {
    notify(`Status updated to ${status}`, "success");
  };

  const handleMarkAllPresent = () => {
    notify("All patients marked as Present", "success");
  };

  const handleEditRecord = (record: Attendance) => {
    setSelectedRecord(record);
    setEditOpen(true);
  };

  const handleUpdateAttendance = async (id: string, data: { status: AttendanceStatus; notes?: string }) => {
    try {
      await updateAttendance(id, data);
      setEditOpen(false);
      setSelectedRecord(null);
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm("Are you sure you want to delete this attendance record? This action cannot be undone.")) {
      return;
    }
    try {
      await deleteAttendance(id);
    } catch (error) {
      // Error handled by hook
    }
  };

  const clearFilters = () => {
    setProgramFilter("");
    setDateFilter("");
    setStatusFilter("");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const hasFilters = programFilter || dateFilter || statusFilter || searchQuery;

  // For Healthcare Staff, filter programs to only show assigned programs
  const availablePrograms = user?.role === "Healthcare Staff"
    ? programs.filter((p: any) => 
        p.assignedStaff?.some((staff: any) => 
          (staff.id === user.id || staff.userId === user.id) || 
          (typeof staff === 'string' && staff === user.id)
        )
      )
    : programs;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of table
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Program Attendance"
          description="Track patient attendance for program sessions, mark attendance status, and manage attendance records"
          action={
            <Button
              onClick={() => setMarkOpen(true)}
              leftIcon={<CalendarDaysIcon className="h-4 w-4" />}
            >
              Mark Attendance
            </Button>
          }
        />

        {/* Attendance Records Table with Filters */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Card>
          <div className="p-5 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Attendance Records</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {user?.role === "Admin" 
                    ? "View and manage all attendance records across all programs" 
                    : "View attendance records for programs you're assigned to"}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                leftIcon={<FunnelIcon className="h-4 w-4" />}
              >
                {showFilters ? "Hide Filters" : "Show Filters"}
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="p-5 border-b border-gray-200 bg-gray-50">
              <div className="space-y-4">
                <FormField label="Search" error={undefined}>
                  <SearchBar
                    placeholder="Search by patient name or program name..."
                    value={searchQuery}
                    onChange={setSearchQuery}
                  />
                </FormField>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <FormField label="Program" error={undefined}>
                    <SearchableSelect
                      placeholder="All Programs"
                      value={programFilter}
                      onChange={(value) => setProgramFilter(value || "")}
                      options={availablePrograms.map(p => ({
                        value: p.id,
                        label: p.name,
                      }))}
                    />
                  </FormField>

                  <FormField label="Date" error={undefined}>
                    <FormInput
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      placeholder="Select date"
                    />
                  </FormField>

                  <FormField label="Status" error={undefined}>
                    <FormSelect
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as AttendanceStatus | "")}
                    >
                      <option value="">All Status</option>
                      <option value="Present">Present</option>
                      <option value="Absent">Absent</option>
                      <option value="Late">Late</option>
                      <option value="Excused">Excused</option>
                      <option value="Canceled">Canceled</option>
                    </FormSelect>
                  </FormField>

                  <div className="flex items-end">
                    {hasFilters && (
                      <Button
                        variant="outline"
                        onClick={clearFilters}
                        className="w-full"
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="p-5">
            {attendanceRecords.length === 0 && !loadingRecords ? (
              <EmptyState
                icon={<CalendarDaysIcon className="h-12 w-12 text-gray-400" />}
                title="No attendance records found"
                description={hasFilters 
                  ? "No records match your current filters. Try adjusting your search criteria."
                  : "Mark attendance for your first session to see records here."}
              />
            ) : (
              <>
                <AttendanceRecordsTable
                  records={attendanceRecords}
                  userRole={user?.role}
                  onEdit={handleEditRecord}
                  onDelete={user?.role === "Admin" ? handleDeleteRecord : undefined}
                  loading={loadingRecords}
                />
                {pagination && pagination.totalPages > 1 && (
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    totalItems={pagination.total}
                    itemsPerPage={pagination.limit}
                    onPageChange={handlePageChange}
                  />
                )}
              </>
            )}
          </div>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <AttendanceStatistics 
              overallRate={statistics.overallRate}
              programRates={statistics.programRates}
            />
          </div>
        </div>
      </div>

      <AttendanceForm
        open={markOpen}
        onClose={() => setMarkOpen(false)}
        onSubmit={handleMarkAttendance}
        programs={programs}
        patients={patients}
        loading={loading}
      />

      <EditAttendanceForm
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setSelectedRecord(null);
        }}
        onSubmit={handleUpdateAttendance}
        record={selectedRecord}
        loading={loading}
      />
    </>
  );
}
