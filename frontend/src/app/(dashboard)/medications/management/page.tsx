"use client";

import { Table, THead, TBody, TH, TD } from "@/components/Table";
import Badge from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "@heroicons/react/24/outline";
import { PageHeader, SearchBar } from "@/components/ui/PageHeader";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { ActionButtons } from "@/components/ui/ActionButtons";
import { MedicationForm } from "@/components/forms/MedicationForm";
import Button from "@/components/ui/Button";
import { medicationsApi, programsApi } from "@/lib/api";
import { LiaPillsSolid } from "react-icons/lia";
import { Pagination } from "@/components/ui/Pagination";

type Medication = {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  programType?: string;
  assignedPrograms?: string[];
  status: "Active" | "Inactive";
  createdAt?: string;
};

export default function MedicationsManagementPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [programs, setPrograms] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [selectedMedicationDetails, setSelectedMedicationDetails] = useState<any>(null);
  const [query, setQuery] = useState("");
  const [programTypeFilter, setProgramTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const { notify } = useToast();

  // Load full medication details when editing
  useEffect(() => {
    if (selectedMedication && editOpen) {
      medicationsApi.getById(selectedMedication.id).then((response) => {
        if (response.data) {
          setSelectedMedicationDetails(response.data);
        }
      });
    }
  }, [selectedMedication, editOpen]);

  useEffect(() => {
    if (user && user.role !== "Admin") {
      router.push("/medications");
    } else {
      loadMedications();
      loadPrograms();
    }
  }, [user, router]);

  const loadMedications = async () => {
    const response = await medicationsApi.getAll();
    if (response.data) {
      const medicationsArray = Array.isArray(response.data)
        ? response.data
        : response.data.data || [];
      // Transform medications to include assigned program names
      const transformedMedications = medicationsArray.map((med: any) => ({
        ...med,
        assignedPrograms: med.programs?.map((p: any) => p.name) || [],
        programType: med.programType || '',
      }));
      setMedications(transformedMedications);
    } else if (response.error) {
      notify(response.error, "error");
      setMedications([]);
    }
  };

  const loadPrograms = async () => {
    const response = await programsApi.getAll();
    if (response.data) {
      const programsArray = Array.isArray(response.data)
        ? response.data
        : response.data.data || [];
      setPrograms(programsArray.map((p: any) => ({ id: p.id, name: p.name, type: p.type })));
    }
  };

  if (user && user.role !== "Admin") {
    return null;
  }

  const filteredMedications = medications.filter((m) => {
    const matchesQuery = !query || 
      m.name?.toLowerCase().includes(query.toLowerCase()) ||
      m.dosage?.toLowerCase().includes(query.toLowerCase()) ||
      m.frequency?.toLowerCase().includes(query.toLowerCase());
    const matchesProgramType = !programTypeFilter || m.programType === programTypeFilter;
    const matchesStatus = !statusFilter || m.status === statusFilter;
    return matchesQuery && matchesProgramType && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredMedications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMedications = filteredMedications.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [query, programTypeFilter, statusFilter]);

  const handleAddMedication = async (data: any) => {
    setLoading(true);
    setErrors({});
    
    const response = await medicationsApi.create({
      name: data.name,
      dosage: data.dosage,
      frequency: data.frequency,
      programType: data.programType,
      programIds: data.assignedProgramIds,
    });

    if (response.data) {
      notify("Medication created successfully", "success");
      setAddOpen(false);
      await loadMedications();
      // Redirect to medications tracking page to view all medications
      router.push("/medications");
    } else {
      notify(response.error || "Failed to create medication", "error");
      if (response.error) {
        setErrors({ general: response.error });
      }
    }
    setLoading(false);
  };

  const handleEditMedication = async (data: any) => {
    if (!selectedMedication) return;
    
    setLoading(true);
    setErrors({});
    
    const response = await medicationsApi.update(selectedMedication.id, {
      name: data.name,
      dosage: data.dosage,
      frequency: data.frequency,
      programType: data.programType,
      programIds: data.assignedProgramIds || [],
    });

    if (response.data) {
      notify("Medication updated successfully", "success");
      setEditOpen(false);
      setSelectedMedication(null);
      await loadMedications();
    } else {
      notify(response.error || "Failed to update medication", "error");
      if (response.error) {
        setErrors({ general: response.error });
      }
    }
    setLoading(false);
  };

  const handleDeleteMedication = async (id: string) => {
    if (!confirm("Are you sure you want to delete this medication?")) return;
    
    setLoading(true);
    const response = await medicationsApi.delete(id);
    
    if (!response.error) {
      notify("Medication deleted successfully", "success");
      await loadMedications();
    } else {
      notify(response.error || "Failed to delete medication", "error");
    }
    setLoading(false);
  };

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Medications Management"
          description="Create and manage medication inventory, assign medications to programs, and track medication assignments"
          action={
            <Button
              onClick={() => setAddOpen(true)}
              leftIcon={<PlusIcon className="h-4 w-4" />}
            >
              Add Medication
            </Button>
          }
        />
        
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="Search medications by name, dosage, or frequency..."
          filters={
            <>
              <FilterSelect
                value={programTypeFilter}
                onChange={setProgramTypeFilter}
                options={[
                  { value: "Mental Health", label: "Mental Health" },
                  { value: "Vaccination", label: "Vaccination" },
                  { value: "Diabetes", label: "Diabetes" },
                  { value: "Other", label: "Other" },
                ]}
                placeholder="All Program Types"
              />
              <FilterSelect
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: "Active", label: "Active" },
                  { value: "Inactive", label: "Inactive" },
                ]}
                placeholder="All Status"
              />
              {(programTypeFilter || statusFilter || query) && (
                <button
                  onClick={() => {
                    setProgramTypeFilter("");
                    setStatusFilter("");
                    setQuery("");
                  }}
                  className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-semibold transition-all text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0066cc] focus:border-transparent"
                >
                  Clear
                </button>
              )}
            </>
          }
        />

        {filteredMedications.length === 0 ? (
          <EmptyState
            icon={<LiaPillsSolid className="h-16 w-16 text-gray-400" />}
            title="No medications found"
            description="Get started by adding your first medication."
            action={
              <Button onClick={() => setAddOpen(true)}>
                Add Medication
              </Button>
            }
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Name</TH>
                <TH>Dosage</TH>
                <TH>Frequency</TH>
                <TH>Assigned Programs</TH>
                <TH>Status</TH>
                <TH>Created</TH>
                <TH>Actions</TH>
              </tr>
            </THead>
            <TBody>
              {paginatedMedications.map((med) => (
                <tr key={med.id}>
                  <TD>
                    <button
                      onClick={() => {
                        router.push(`/medications/${med.id}`);
                      }}
                      className="text-[#0066cc] hover:text-[#0052a3] hover:underline font-semibold text-left"
                    >
                      {med.name}
                    </button>
                  </TD>
                  <TD><span className="text-gray-700">{med.dosage}</span></TD>
                  <TD><span className="text-gray-700">{med.frequency}</span></TD>
                  <TD>
                    <div className="flex flex-wrap gap-1">
                      {med.assignedPrograms && med.assignedPrograms.length > 0 ? (
                        med.assignedPrograms.map((p) => (
                          <Badge key={p} variant="neutral">{p}</Badge>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">Not assigned</span>
                      )}
                    </div>
                  </TD>
                  <TD>
                    <Badge variant={med.status === "Active" ? "active" : "inactive"}>{med.status}</Badge>
                  </TD>
                  <TD><span className="text-gray-700">{med.createdAt || "N/A"}</span></TD>
                  <TD>
                    <ActionButtons
                      onEdit={() => {
                        setSelectedMedication(med);
                        setEditOpen(true);
                      }}
                      onDelete={() => handleDeleteMedication(med.id)}
                    />
                  </TD>
                </tr>
              ))}
            </TBody>
          </Table>
        )}

        {filteredMedications.length > itemsPerPage && (
          <div className="mt-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredMedications.length}
              itemsPerPage={itemsPerPage}
              onPageChange={(page) => {
                setCurrentPage(page);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        )}
      </div>

      <MedicationForm
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          setErrors({});
        }}
        onSubmit={handleAddMedication}
        programs={programs}
        loading={loading}
      />

      <MedicationForm
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setSelectedMedication(null);
          setSelectedMedicationDetails(null);
          setErrors({});
        }}
        onSubmit={handleEditMedication}
        programs={programs}
        loading={loading}
        initialValues={selectedMedication && selectedMedicationDetails ? {
          name: selectedMedication.name,
          dosage: selectedMedication.dosage,
          frequency: selectedMedication.frequency,
          programType: selectedMedication.programType || selectedMedicationDetails.programType,
          status: selectedMedication.status,
          assignedProgramIds: selectedMedicationDetails.programs?.map((p: any) => p.id) || [],
        } : undefined}
      />
    </>
  );
}

