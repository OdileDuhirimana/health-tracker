/**
 * PatientCardGrid Component
 * Grid layout for displaying patient cards
 */

import { useRouter } from "next/navigation";
import { PatientCard } from "@/components/PatientCard";
import { Patient, PatientProgress } from "@/types";

interface PatientCardGridProps {
  patients: Patient[];
}

export function PatientCardGrid({ patients }: PatientCardGridProps) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {patients.map((patient) => (
      <PatientCard
        key={patient.id}
        id={patient.patientId || patient.id}
        name={patient.name}
        programs={patient.programs || []}
        status={patient.status || 'active'}
        onView={() => {
          router.push(`/patients/${patient.id}`);
        }}
      />
      ))}
    </div>
  );
}

