import clsx from "clsx";

type Variant = 
  | "default" 
  | "success" 
  | "warning" 
  | "danger" 
  | "neutral" 
  | "info"
  | "ongoing" 
  | "completed" 
  | "missed" 
  | "scheduled" 
  | "today" 
  | "overdue"
  | "present"
  | "absent"
  | "late"
  | "excused"
  | "canceled"
  | "active"
  | "inactive"
  | "admin"
  | "staff"
  | "guest";

export default function Badge({
  children,
  variant = "default",
  size = "default",
}: {
  children: React.ReactNode;
  variant?: Variant;
  size?: "small" | "default" | "large";
}) {
  const sizeClasses = {
    small: "px-1.5 py-0.5 text-xs",
    default: "px-2.5 py-1 text-xs",
    large: "px-3 py-1.5 text-sm",
  };

  const classes = clsx(
    "inline-flex items-center justify-center rounded-lg font-semibold shadow-sm transition-colors",
    sizeClasses[size],
    {
      default: "bg-[#0066cc] text-white",
      success: "bg-green-600 text-white",
      warning: "bg-yellow-500 text-gray-900",
      danger: "bg-red-600 text-white",
      neutral: "bg-gray-200 text-gray-800",
      info: "bg-[#0066cc] text-white",
      ongoing: "bg-[#0066cc] text-white",
      completed: "bg-green-600 text-white",
      missed: "bg-red-600 text-white",
      scheduled: "bg-green-500 text-white",
      today: "bg-yellow-500 text-gray-900",
      overdue: "bg-red-600 text-white",
      present: "bg-green-600 text-white",
      absent: "bg-red-600 text-white",
      late: "bg-yellow-500 text-gray-900",
      excused: "bg-blue-500 text-white",
      canceled: "bg-gray-500 text-white",
      active: "bg-green-600 text-white",
      inactive: "bg-gray-400 text-white",
      admin: "bg-purple-600 text-white",
      staff: "bg-[#0066cc] text-white",
      guest: "bg-gray-500 text-white",
    }[variant]
  );
  return <span className={classes}>{children}</span>;
}


