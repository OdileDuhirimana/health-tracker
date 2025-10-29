import clsx from "clsx";
import { ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/24/outline";

interface MetricCardProps {
  title: string;
  value: string | number;
  delta?: { value: string; direction: "up" | "down" };
  accent?: "blue" | "green" | "yellow" | "red";
  icon?: React.ReactNode;
  loading?: boolean;
}

export default function MetricCard({
  title,
  value,
  delta,
  accent = "blue",
  icon,
  loading = false,
}: MetricCardProps) {
  const accentColors = {
    blue: {
      border: "border-l-blue-600",
      iconBg: "bg-blue-50",
      iconColor: "text-[#0066cc]",
    },
    green: {
      border: "border-l-green-600",
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
    },
    yellow: {
      border: "border-l-yellow-500",
      iconBg: "bg-yellow-50",
      iconColor: "text-yellow-600",
    },
    red: {
      border: "border-l-red-600",
      iconBg: "bg-red-50",
      iconColor: "text-red-600",
    },
  }[accent];
  
  return (
    <div
      data-testid={`metric-card-${title.toLowerCase().replace(/\s+/g, "-")}`}
      className={clsx(
        "rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-lg transition-all duration-200 border-l-4",
        accentColors.border,
        "group"
      )}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-gray-600 mb-2 uppercase tracking-wider">
              {title}
            </div>
          </div>
          {icon && (
            <div className={clsx(
              "h-10 w-10 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0 transition-transform group-hover:scale-110",
              accentColors.iconBg,
              accentColors.iconColor
            )}>
              {icon}
            </div>
          )}
        </div>
        
        <div className="flex items-baseline gap-2">
          {loading ? (
            <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
          ) : (
            <>
              <div className="text-3xl font-bold text-gray-900 tabular-nums">{value}</div>
        {delta && (
                <div
                  className={clsx(
                    "flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full",
                    delta.direction === "up"
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  )}
                >
                  {delta.direction === "up" ? (
                    <ArrowUpIcon className="h-3 w-3" />
                  ) : (
                    <ArrowDownIcon className="h-3 w-3" />
                  )}
                  <span>{delta.value}</span>
                </div>
              )}
            </>
          )}
        </div>
        
        {delta && !loading && (
          <div className="text-xs text-gray-500 mt-2">
            <span>since last period</span>
          </div>
        )}
      </div>
    </div>
  );
}


