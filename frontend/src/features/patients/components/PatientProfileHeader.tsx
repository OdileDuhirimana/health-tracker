/**
 * PatientProfileHeader Component
 * Displays patient profile header with avatar and basic info
 */

import { Card, CardBody } from "@/components/ui/Card";
import Badge from "@/components/Badge";
import Button from "@/components/ui/Button";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { Patient } from "@/types";
import { useRouter } from "next/navigation";

interface PatientProfileHeaderProps {
  patient: Patient;
  onBack?: () => void;
}

export function PatientProfileHeader({ patient, onBack }: PatientProfileHeaderProps) {
  const router = useRouter();
  
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <Card className="w-full">
      <CardBody>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Button
            variant="ghost"
            onClick={handleBack}
            aria-label="Go back"
            leftIcon={<ArrowLeftIcon className="h-5 w-5" />}
            className="self-start"
          >
            Back
          </Button>
          <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-4 min-w-0">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-[#0066cc] flex items-center justify-center text-white text-xl sm:text-2xl font-bold flex-shrink-0">
              {getInitials(patient.fullName || patient.name || "Patient")}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                {patient.fullName || patient.name || "Patient"}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant={patient.status?.toLowerCase() === 'active' ? 'active' : 'inactive'}>
                  {patient.status || 'Active'}
                </Badge>
                <span className="text-sm text-gray-600">ID: {patient.patientId || patient.id}</span>
              </div>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

