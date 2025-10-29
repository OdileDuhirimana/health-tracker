"use client";

import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";

type CalendarEvent = {
  id: string;
  date: Date;
  title: string;
  program: string;
  time: string;
  frequency: "Daily" | "Weekly" | "Monthly";
};

export default function Calendar({ events = [], onDateSelect }: { events?: CalendarEvent[]; onDateSelect?: (date: Date) => void }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad to start on Sunday
  const firstDayOfWeek = monthStart.getDay();
  const paddingDays = Array.from({ length: firstDayOfWeek }, (_, i) => i);

  const getEventsForDate = (date: Date) => {
    return events.filter((e) => isSameDay(new Date(e.date), date));
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    onDateSelect?.(date);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-md">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
        </button>
        <h3 className="font-bold text-gray-900">{format(currentMonth, "MMMM yyyy")}</h3>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronRightIcon className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="text-center text-xs font-medium text-gray-600 py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {paddingDays.map((i) => (
          <div key={`pad-${i}`} className="aspect-square" />
        ))}
        {daysInMonth.map((day) => {
          const dayEvents = getEventsForDate(day);
          const isToday = isSameDay(day, new Date());
          const isSelected = selectedDate && isSameDay(day, selectedDate);

          return (
            <button
              key={day.toISOString()}
              onClick={() => handleDateClick(day)}
              className={`aspect-square p-1 rounded-lg text-sm transition-colors font-medium ${
                isSelected
                  ? "bg-[#0066cc] text-white shadow-md"
                  : isToday
                  ? "bg-blue-50 text-[#0052a3] font-bold"
                  : "hover:bg-gray-100 text-gray-700"
              } ${!isSameMonth(day, currentMonth) ? "opacity-30" : ""}`}
            >
              <div className="text-xs font-medium">{format(day, "d")}</div>
              {dayEvents.length > 0 && (
                <div className="flex gap-0.5 justify-center mt-0.5">
                  {dayEvents.slice(0, 3).map((e, idx) => (
                    <div
                      key={e.id}
                      className={`h-1 w-1 rounded-full ${
                        e.frequency === "Daily"
                          ? "bg-[#0066cc]"
                          : e.frequency === "Weekly"
                          ? "bg-green-500"
                          : "bg-teal-500"
                      }`}
                      title={`${e.program} - ${e.time}`}
                    />
                  ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[8px] text-gray-500">+{dayEvents.length - 3}</div>
                    )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

