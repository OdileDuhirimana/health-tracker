"use client";

import { Card } from "@/components/ui/Card";

interface ScheduleItem {
  time: string;
  program: string;
}

interface TodaysScheduleProps {
  items: ScheduleItem[];
  className?: string;
}

export function TodaysSchedule({ items, className }: TodaysScheduleProps) {
  return (
    <Card className={className}>
      <div className="p-5">
        <h3 className="font-bold mb-3 text-gray-900">Today's Schedule</h3>
        <p className="text-xs text-gray-600 mb-4">Your scheduled program sessions for today</p>
        {items.length > 0 ? (
          <ul className="space-y-3">
            {items.map((item, index) => (
              <li key={index} className="text-sm text-gray-700 py-2 border-b border-gray-100 last:border-b-0">
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-gray-900 break-words">{item.program}</span>
                  <span className="text-xs text-gray-500">{item.time}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No sessions scheduled for today</p>
        )}
      </div>
    </Card>
  );
}


