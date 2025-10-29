/**
 * AttendanceStatistics Component
 * Displays attendance statistics card
 */

import { StatsCard } from "@/components/ui/StatsCard";

interface AttendanceStatisticsProps {
  overallRate: number;
  programRates: Array<{ name: string; rate: number }>;
  mobile?: boolean;
}

export function AttendanceStatistics({ overallRate, programRates, mobile = false }: AttendanceStatisticsProps) {
  return (
    <div className={mobile ? "lg:hidden" : "hidden lg:block"}>
      <div className={mobile ? "" : "sticky top-20"}>
        <StatsCard
          title="Attendance Statistics"
          subtitle="Overview of attendance rates across all programs"
          value={`${overallRate}%`}
          items={programRates.slice(0, 3).map((p) => ({
            label: p.name,
            value: `${p.rate}%`,
          }))}
        />
      </div>
    </div>
  );
}

