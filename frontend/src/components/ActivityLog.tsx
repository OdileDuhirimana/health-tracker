"use client";

/**
 * ActivityLog Component
 * Displays recent activity log entries
 * Refactored to use services
 */

import { format } from "date-fns";
import Link from "next/link";
import { UserPlusIcon, CheckCircleIcon, ClipboardDocumentCheckIcon } from "@heroicons/react/24/outline";
import { PillIcon } from "@/components/ui/PillIcon";
import { useActivityLog } from "@/hooks/useActivityLog";

type ActivityType = "enrollment" | "medication" | "attendance" | "program";

export default function ActivityLog() {
  const { activities, loading } = useActivityLog(10);

  const getActivityType = (type: string): ActivityType => {
    if (type.toLowerCase().includes("enrollment") || type.toLowerCase().includes("patient")) return "enrollment";
    if (type.toLowerCase().includes("medication") || type.toLowerCase().includes("dispensation")) return "medication";
    if (type.toLowerCase().includes("attendance")) return "attendance";
    if (type.toLowerCase().includes("program")) return "program";
    return "program";
  };

  const getActivityIcon = (type: ActivityType) => {
    const iconBoxClasses = "h-10 w-10 rounded-lg border border-gray-200 bg-blue-50 flex items-center justify-center flex-shrink-0";
    switch (type) {
      case "enrollment":
        return <div className={iconBoxClasses}><UserPlusIcon className="h-5 w-5 text-[#0066cc]" /></div>;
      case "medication":
        return <div className={iconBoxClasses}><PillIcon className="h-5 w-5 text-[#0066cc]" /></div>;
      case "attendance":
        return <div className={iconBoxClasses}><CheckCircleIcon className="h-5 w-5 text-[#0066cc]" /></div>;
      case "program":
        return <div className={iconBoxClasses}><ClipboardDocumentCheckIcon className="h-5 w-5 text-[#0066cc]" /></div>;
      default:
        return <div className={iconBoxClasses}><ClipboardDocumentCheckIcon className="h-5 w-5 text-[#0066cc]" /></div>;
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 text-lg">Recent Activity</h3>
        <Link href="/activity" className="text-sm text-[#0066cc] hover:text-[#0052a3] font-semibold transition-colors">
          View All
        </Link>
      </div>
      <ul className="space-y-3 max-h-96 overflow-auto divide-y divide-gray-200">
        {loading ? (
          <li className="text-sm text-gray-500 text-center py-8">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0066cc]"></div>
              <span>Loading activities...</span>
            </div>
          </li>
        ) : activities.length === 0 ? (
          <li className="text-sm text-gray-500 text-center py-8">
            <div className="flex flex-col items-center gap-2">
              <ClipboardDocumentCheckIcon className="h-12 w-12 text-gray-300" />
              <span>No activities yet</span>
              <span className="text-xs text-gray-400">Activities will appear here as actions are performed</span>
            </div>
          </li>
        ) : (
          activities.map((activity) => {
            const activityType = getActivityType(activity.type);
            const activityDate = activity.createdAt ? new Date(activity.createdAt) : new Date(activity.timestamp);
            const userName = activity.user || activity.userEmail || "System";
            
            return (
              <li key={activity.id} className="flex items-start gap-3 py-3 first:pt-0">
                <div className="mt-0.5">
                  {getActivityIcon(activityType)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-700 leading-relaxed">{activity.description || activity.type}</div>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
                    <span>{userName}</span>
                    <span>•</span>
                    <span>{format(activityDate, "dd-MM-yyyy hh:mm a")}</span>
                  </div>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
