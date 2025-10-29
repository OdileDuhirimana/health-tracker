"use client";

import { Card } from "@/components/ui/Card";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  items?: Array<{ label: string; value: string | number }>;
  className?: string;
}

export function StatsCard({ title, value, subtitle, items, className }: StatsCardProps) {
  return (
    <Card className={className}>
      <div className="p-5">
        <div className="text-lg font-bold text-gray-900 mb-2">{title}</div>
        {subtitle && <p className="text-xs text-gray-600 mb-4">{subtitle}</p>}
        <div className="mb-4 pb-4 border-b border-gray-200">
          <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
        </div>
        {items && items.length > 0 && (
          <div className="space-y-3 text-sm">
            {items.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-gray-700">{item.label}</span>
                <span className="font-semibold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        )}
        {items && items.length === 0 && (
          <div className="text-gray-500 text-sm">No data available</div>
        )}
      </div>
    </Card>
  );
}

