"use client";

import MetricCard from "@/components/MetricCard";

interface Metric {
  title: string;
  value: string | number;
  accent?: "blue" | "green" | "yellow" | "red";
  delta?: { value: string; direction: "up" | "down" };
  icon?: React.ReactNode;
  loading?: boolean;
}

interface MetricsGridProps {
  metrics: Metric[];
  loading?: boolean;
}

export function MetricsGrid({ metrics, loading }: MetricsGridProps) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {metrics.map((metric, index) => (
        <MetricCard
          key={index}
          title={metric.title}
          value={loading ? "..." : metric.value}
          accent={metric.accent || "blue"}
          delta={metric.delta}
          icon={metric.icon}
          loading={loading || metric.loading}
        />
      ))}
    </section>
  );
}


