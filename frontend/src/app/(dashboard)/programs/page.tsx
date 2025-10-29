"use client";

/**
 * Programs Page
 * Main page for viewing and managing health programs
 * Refactored for modularity and maintainability
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ClipboardDocumentListIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { PageHeader, SearchBar } from "@/components/ui/PageHeader";
import { MedicationForm } from "@/components/forms/MedicationForm";
import { ProgramForm } from "@/components/forms/ProgramForm";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/EmptyState";
import { usePrograms } from "@/hooks/usePrograms";
import { useMedications } from "@/hooks/useMedications";
import { ProgramsTable } from "@/features/programs/components/ProgramsTable";
import { AssignedProgramsTable } from "@/features/programs/components/AssignedProgramsTable";
import { ProgramFilters } from "@/features/programs/components/ProgramFilters";
import { ProgramDetailsPanel } from "@/features/programs/components/ProgramDetailsPanel";
import { Pagination } from "@/components/ui/Pagination";
import { Program, Medication } from "@/types";
import { programsService } from "@/services";
import { useDebounce } from "@/hooks/useDebounce";


export default function ProgramsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { notify } = useToast();
  
  // State management
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addMedicationOpen, setAddMedicationOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);

  // Debounce search query for better performance
  const debouncedQuery = useDebounce(query, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Custom hooks for data management - use debounced query in filters
  const { programs, assignedPrograms, pagination, loading: programsLoading, loadPrograms, createProgram, updateProgram, deleteProgram } = usePrograms({
    search: debouncedQuery || undefined,
    type: typeFilter || undefined,
    status: statusFilter || undefined,
    page: currentPage,
    limit: itemsPerPage,
  });

  // Reset to page 1 when filters change (except page itself)
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, typeFilter, statusFilter]);
  const { medications, loading: medicationsLoading, createMedication } = useMedications();

  // Backend handles all filtering now, no need for client-side filtering
  const filteredAssignedPrograms = assignedPrograms;
  const filteredPrograms = programs;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Load programs on mount
  useEffect(() => {
    if (user) {
      loadPrograms();
    }
  }, [user]);

  // Handlers
  const handleAddMedication = async (data: { name: string; dosage: string; frequency: string; programType: string }) => {
    try {
      await createMedication(data);
      setAddMedicationOpen(false);
      // Redirect to medications page to view all medications
      router.push("/medications");
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleAddProgram = async (data: any) => {
    try {
      await createProgram({
        name: data.name,
        type: data.type,
        description: data.description,
        sessionFreq: data.sessionFreq || data.sessionFrequency,
        medicationIds: data.medicationIds || [],
        staffIds: data.staffIds || [],
        components: data.components || [],
      } as any);
      setAddOpen(false);
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleEditProgram = async (data: any) => {
    if (!selectedProgram) return;
    
    try {
      await updateProgram(selectedProgram.id, {
        name: data.name,
        type: data.type,
        description: data.description,
        sessionFreq: data.sessionFreq || data.sessionFrequency,
        medicationIds: data.medicationIds || [],
        staffIds: data.staffIds || [],
        components: data.components || [],
      } as any);
      setEditOpen(false);
      setSelectedProgram(null);
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleDeleteProgram = async (id: string) => {
    if (!confirm("Are you sure you want to delete this program?")) return;
    try {
      await deleteProgram(id);
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleViewProgram = async (program: Program) => {
    try {
      const response = await programsService.getById(program.id);
      if (response.data) {
        setSelectedProgram(response.data);
        setDetailsOpen(true);
      } else {
        setSelectedProgram(program);
        setDetailsOpen(true);
      }
    } catch (error) {
      setSelectedProgram(program);
      setDetailsOpen(true);
    }
  };

  const handleEditProgramClick = (program: Program) => {
    setSelectedProgram(program);
    setEditOpen(true);
  };

  const clearFilters = () => {
    setTypeFilter("");
    setStatusFilter("");
    setQuery("");
  };

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Health Programs"
          description={user?.role === "Guest" 
            ? "View available public health programs" 
            : "Create and manage health programs for patient enrollment, session scheduling, and medication assignments"}
          action={
            user?.role === "Admin" ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setAddMedicationOpen(true)}
                  leftIcon={<PlusIcon className="h-4 w-4" />}
                >
                  Add Medication
                </Button>
                <Button
                  onClick={() => setAddOpen(true)}
                  leftIcon={<PlusIcon className="h-4 w-4" />}
                >
                  Add New Program
                </Button>
              </>
            ) : undefined
          }
        />

        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="Search programs by name, type, or description..."
          filters={
            <ProgramFilters
              typeFilter={typeFilter}
              statusFilter={statusFilter}
              query={query}
              onTypeFilterChange={setTypeFilter}
              onStatusFilterChange={setStatusFilter}
              onQueryChange={setQuery}
              onClear={clearFilters}
            />
          }
        />

        {/* Assigned Programs Section (for Healthcare Staff only) */}
        {user?.role === "Healthcare Staff" && filteredAssignedPrograms.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">My Assigned Programs</h2>
              <span className="px-2.5 py-0.5 bg-[#0066cc] text-white text-xs font-semibold rounded-full">
                {filteredAssignedPrograms.length}
              </span>
            </div>
            <AssignedProgramsTable
              programs={filteredAssignedPrograms}
              onView={handleViewProgram}
            />
          </div>
        )}

        {/* All Programs Section */}
        {user?.role === "Healthcare Staff" && filteredAssignedPrograms.length > 0 && (
          <div className="flex items-center gap-2 mt-8 mb-4">
            <h2 className="text-lg font-bold text-gray-900">All Programs</h2>
            <span className="px-2.5 py-0.5 bg-gray-200 text-gray-700 text-xs font-semibold rounded-full">
              {filteredPrograms.length}
            </span>
          </div>
        )}

        {filteredPrograms.length === 0 && 
         programs.length === 0 && 
         assignedPrograms.length === 0 && 
         (!user || user.role !== "Healthcare Staff" || filteredAssignedPrograms.length === 0) ? (
          <EmptyState
            icon={<ClipboardDocumentListIcon className="h-16 w-16 text-gray-400" />}
            title="No programs found"
            description={
              user?.role === "Admin" 
                ? "Get started by creating your first health program."
                : user?.role === "Guest"
                ? "No programs are currently available."
                : "No programs match your search criteria."
            }
            action={
              user?.role === "Admin" && programs.length === 0 ? (
                <Button onClick={() => setAddOpen(true)}>
                  Create Your First Program
                </Button>
              ) : undefined
            }
          />
        ) : filteredPrograms.length === 0 && (programs.length > 0 || assignedPrograms.length > 0) ? (
          <EmptyState
            icon={<ClipboardDocumentListIcon className="h-16 w-16 text-gray-400" />}
            title="No programs match your filters"
            description="Try adjusting your search or filter criteria."
          />
        ) : (
          <>
            <ProgramsTable
              programs={filteredPrograms}
              userRole={user?.role}
              onView={handleViewProgram}
              onEdit={user?.role === "Admin" ? handleEditProgramClick : undefined}
              onDelete={user?.role === "Admin" ? handleDeleteProgram : undefined}
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

      {/* Modals */}
      <MedicationForm
        open={addMedicationOpen}
        onClose={() => setAddMedicationOpen(false)}
        onSubmit={handleAddMedication}
        loading={medicationsLoading}
      />

      <ProgramForm
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAddProgram}
        medications={medications.filter(m => m.status === "Active")}
        loading={programsLoading}
      />

      <ProgramForm
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setSelectedProgram(null);
        }}
        onSubmit={handleEditProgram}
        medications={medications.filter(m => m.status === "Active")}
        loading={programsLoading}
        initialValues={selectedProgram ? {
          name: selectedProgram.name,
          type: selectedProgram.type,
          description: selectedProgram.description,
          sessionFreq: selectedProgram.sessionFrequency,
          medications: selectedProgram.medications?.map((m: any) => typeof m === 'string' ? m : m.id) || [],
          components: (selectedProgram as any).components || [],
          staffIds: selectedProgram.assignedStaff?.map((s: any) => typeof s === 'string' ? s : s.id) || [],
        } as any : undefined}
      />

      <ProgramDetailsPanel
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        program={selectedProgram}
        medications={medications}
      />
    </>
  );
}
