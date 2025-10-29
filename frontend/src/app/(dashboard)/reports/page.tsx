"use client";

/**
 * Reports Page
 * Generate and export various reports
 * Refactored for modularity and maintainability
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DocumentArrowDownIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatsCard } from "@/components/ui/StatsCard";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { FormField, FormInput, FormSelect } from "@/components/ui/FormField";
import { useReports } from "@/hooks/useReports";
import { useToast } from "@/components/Toast";
import { useState } from "react";

export default function ReportsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { notify } = useToast();
  const [reportType, setReportType] = useState("patient");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [programFilter, setProgramFilter] = useState("all");

  const {
    statistics,
    loading,
    loadStatistics,
    generatePatientReport,
    generateProgramReport,
    generateMedicationReport,
    generateAttendanceReport,
    generateUserReport,
  } = useReports();

  useEffect(() => {
    // Only Admin can access reports
    if (user && user.role === "Admin") {
      loadStatistics();
    } else if (user && user.role !== "Admin") {
      router.push("/programs");
    }
  }, [user, router, loadStatistics]);

  // Only Admin can access reports
  if (user && user.role !== "Admin") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-8 text-center max-w-md">
          <div className="mb-4 flex justify-center">
            <LockClosedIcon className="h-16 w-16 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Reports are only available to administrators.
          </p>
        </div>
      </div>
    );
  }

  const reportTypes = [
    {
      id: "patient",
      label: "Patient Progress",
      description: "Track patient enrollment, sessions, and medication adherence",
      generate: () => generatePatientReport({
        programId: programFilter !== "all" ? programFilter : undefined,
        startDate: dateRange.start || undefined,
        endDate: dateRange.end || undefined,
      }),
    },
    {
      id: "program",
      label: "Program Performance",
      description: "Overview of program metrics and patient participation",
      generate: () => generateProgramReport({
        startDate: dateRange.start || undefined,
        endDate: dateRange.end || undefined,
      }),
    },
    {
      id: "medication",
      label: "Medication Tracking",
      description: "Medication dispensation and adherence statistics",
      generate: () => generateMedicationReport(),
    },
    {
      id: "attendance",
      label: "Attendance Summary",
      description: "Session attendance records and statistics",
      generate: () => generateAttendanceReport({
        programId: programFilter !== "all" ? programFilter : undefined,
        startDate: dateRange.start || undefined,
        endDate: dateRange.end || undefined,
      }),
    },
    {
      id: "user",
      label: "User Activity",
      description: "Staff activity and program assignments (Admin only)",
      generate: () => generateUserReport(),
    },
  ];

  const handleGenerateReport = () => {
    const selected = reportTypes.find((t) => t.id === reportType);
    if (selected) {
      if (selected.id === "user" && user?.role !== "Admin") {
        notify("Only administrators can generate user reports", "error");
        return;
      }
      selected.generate();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900">Reports & Analytics</h1>
        <p className="text-xs md:text-sm text-gray-600 mt-1">
          Generate comprehensive reports for patients, programs, medications, attendance, and user activity. Export data in CSV format for analysis and record-keeping
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Generate Report</h3>
              <div className="space-y-4">
                <FormField label="Report Type">
                  <FormSelect
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                  >
                    {reportTypes.map((type) => {
                      if (type.id === "user" && user?.role !== "Admin") {
                        return null;
                      }
                      return (
                        <option key={type.id} value={type.id}>{type.label}</option>
                      );
                    })}
                  </FormSelect>
                </FormField>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Start Date">
                    <FormInput
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    />
                  </FormField>
                  <FormField label="End Date">
                    <FormInput
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    />
                  </FormField>
                </div>
                <FormField label="Filter by Program">
                  <FormSelect
                    value={programFilter}
                    onChange={(e) => setProgramFilter(e.target.value)}
                  >
                    <option value="all">All Programs</option>
                    <option value="mental">Mental Health</option>
                    <option value="vaccination">Vaccination</option>
                    <option value="diabetes">Diabetes</option>
                  </FormSelect>
                </FormField>
                <Button
                  onClick={handleGenerateReport}
                  className="w-full"
                  leftIcon={<DocumentArrowDownIcon className="h-5 w-5" />}
                  disabled={loading}
                >
                  {loading ? "Generating..." : "Generate & Export Report"}
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Reports</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {reportTypes.map((type) => {
                  if (type.id === "user" && user?.role !== "Admin") {
                    return null;
                  }
                  return (
                    <button
                      key={type.id}
                      onClick={() => {
                        if (type.id === "user" && user?.role !== "Admin") {
                          notify("Only administrators can generate user reports", "error");
                          return;
                        }
                        type.generate();
                      }}
                      className="p-4 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-[#0066cc] transition-all text-left"
                      disabled={loading}
                    >
                      <div className="font-semibold text-gray-900 mb-1">{type.label}</div>
                      <div className="text-xs text-gray-600">{type.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>

        <StatsCard
          title="Report Statistics"
          value=""
          items={[
            { label: "Total Patients", value: statistics.totalPatients },
            { label: "Active Programs", value: statistics.activePrograms },
            { label: "Sessions Completed", value: statistics.sessionsCompleted },
            { label: "Average Attendance", value: `${statistics.averageAttendance}%` },
          ]}
        />
      </div>
    </div>
  );
}
