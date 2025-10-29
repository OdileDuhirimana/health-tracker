"use client";

/**
 * Dashboard Page
 * Main dashboard for administrators
 * Refactored for modularity and maintainability
 */

import { useEffect, Suspense, lazy } from "react";
import { useRouter } from "next/navigation";
import { UsersIcon, CalendarDaysIcon, PlusIcon, ClipboardDocumentListIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useAuth } from "@/contexts/AuthContext";
import ActivityLog from "@/components/ActivityLog";
import { MetricsGrid } from "@/components/ui/MetricsGrid";
import { QuickActions } from "@/components/ui/QuickActions";
import { TodaysSchedule } from "@/components/ui/TodaysSchedule";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { useDashboard } from "@/hooks/useDashboard";
import { LiaPillsSolid } from "react-icons/lia";

// Lazy load heavy chart components
const LineChart = lazy(() => import("@/components/charts/LineChart").then(m => ({ default: m.LineChart })));
const PieChart = lazy(() => import("@/components/charts/PieChart").then(m => ({ default: m.PieChart })));
const BarChart = lazy(() => import("@/components/charts/BarChart").then(m => ({ default: m.BarChart })));

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const {
    metrics,
    programData,
    attendanceProgressData,
    adherenceData,
    programDurationSummary,
    upcomingDispensations,
    loading,
    loadDashboardData,
  } = useDashboard();

  useEffect(() => {
    // Only Admin can access dashboard
    if (user && user.role !== "Admin") {
      router.push("/programs");
      return;
    }
    if (user && user.role === "Admin") {
      loadDashboardData();
    }
  }, [user, router, loadDashboardData]);

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "Add Program":
        router.push("/programs");
        break;
      case "Enroll Patient":
        router.push("/patients?tab=enroll");
        break;
      case "Record Medication":
        router.push("/medications");
        break;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900">Dashboard</h1>
        <p className="text-xs md:text-sm text-gray-600 mt-1">
          Monitor key metrics, track program performance, and access quick actions for your healthcare programs and patient management
        </p>
      </div>
      
      <MetricsGrid
        metrics={[
          {
            title: "Total Programs",
            value: metrics.totalPrograms,
            accent: "green",
            delta: { value: "+5%", direction: "up" },
            icon: <ClipboardDocumentListIcon className="h-5 w-5" />,
          },
          {
            title: "Active Patients",
            value: metrics.activePatients,
            accent: "blue",
            delta: { value: "+2%", direction: "up" },
            icon: <UsersIcon className="h-5 w-5" />,
          },
          {
            title: "Pending Medications",
            value: metrics.pendingMedications,
            accent: "yellow",
            delta: { value: "-3%", direction: "down" },
            icon: <LiaPillsSolid className="h-5 w-5" />,
          },
          {
            title: "Attendance Pending",
            value: metrics.attendancePending,
            accent: "red",
            icon: <CalendarDaysIcon className="h-5 w-5" />,
          },
        ]}
        loading={loading}
      />

      {/* New Dashboard Widgets */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Program Duration Summary Widget */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Program Duration Summary</h3>
          {loading ? (
            <LoadingSkeleton className="h-48" />
          ) : programDurationSummary.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No active programs with enrollments</div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {programDurationSummary.map((program, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900 text-sm">{program.programName}</h4>
                    <span className={clsx(
                      "px-2 py-1 rounded text-xs font-medium",
                      program.adherencePercent >= 80 ? "bg-green-100 text-green-700" :
                      program.adherencePercent >= 60 ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    )}>
                      {program.adherencePercent}% adherence
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div>Start: {program.startDate || 'N/A'}</div>
                    <div>End: {program.endDate || 'Ongoing'}</div>
                    <div>Expected: {program.expectedEnrollments}</div>
                    <div>Active: {program.activePatients}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Dispensation Alerts Widget */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Dispensation Alerts</h3>
          {loading ? (
            <LoadingSkeleton className="h-48" />
          ) : upcomingDispensations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No medications due or overdue</div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {upcomingDispensations.slice(0, 10).map((item, idx) => (
                <div
                  key={idx}
                  className={clsx(
                    "p-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow",
                    item.status === 'overdue' ? "bg-red-50 border-red-200" : "bg-yellow-50 border-yellow-200"
                  )}
                  onClick={() => router.push(`/patients/${item.patientId}`)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-gray-900 text-sm">{item.patientName}</span>
                    <span className={clsx(
                      "px-2 py-0.5 rounded text-xs font-medium",
                      item.status === 'overdue' ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                    )}>
                      {item.status === 'overdue' ? 'Overdue' : 'Due Today'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    <div>{item.medicationName} - {item.programName}</div>
                    <div className="mt-1 suppressHydrationWarning">
                      Due: {typeof window !== 'undefined' ? new Date(item.nextDueDate).toLocaleString() : item.nextDueDate}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActivityLog />
        </div>
        <div className="space-y-6">
          <TodaysSchedule
            items={(programData || []).slice(0, 5).map((program, index) => {
              // Generate time slots for programs (morning, afternoon, evening)
              const timeSlots = ['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM', '05:00 PM'];
              return {
                program: program.name,
                time: timeSlots[index % timeSlots.length],
                status: 'scheduled'
              };
            })}
          />
          <QuickActions
            actions={[
              { label: "Add Program", icon: PlusIcon, onClick: () => handleQuickAction("Add Program") },
              { label: "Enroll Patient", icon: UsersIcon, onClick: () => handleQuickAction("Enroll Patient") },
              { label: "Record Medication", icon: LiaPillsSolid, onClick: () => handleQuickAction("Record Medication") },
            ]}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<LoadingSkeleton className="h-64" />}>
        <LineChart
          title="Adherence Rate (Last 7 Days)"
          data={adherenceData as any}
          dataKey="rate"
        />
        </Suspense>
        <Suspense fallback={<LoadingSkeleton className="h-64" />}>
        <PieChart
          title="Attendance Overview"
          data={attendanceProgressData}
        />
        </Suspense>
      </section>

      <Suspense fallback={<LoadingSkeleton className="h-64" />}>
      <BarChart
        title="Programs Overview"
        data={programData as any}
        dataKey="patients"
        label="Patients"
      />
      </Suspense>
    </div>
  );
}
