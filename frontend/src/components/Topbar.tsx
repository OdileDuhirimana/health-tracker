"use client";

import Notifications from "@/components/Notifications";
import { useAuth } from "@/contexts/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";

const pageNames: Record<string, string> = {
  "/": "Dashboard",
  "/programs": "Programs",
  "/patients": "Patients",
  "/medications": "Medications",
  "/medications/management": "Medications Management",
  "/attendance": "Attendance",
  "/reports": "Reports",
  "/activity": "Activity Logs",
  "/users": "Users",
  "/settings": "Settings",
  "/profile": "Profile",
};

export default function Topbar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const pageName = pageNames[pathname] || "Dashboard";
  
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };
  
  return (
    <header className="h-16 border-b border-gray-200 flex items-center justify-between px-4 md:px-6 lg:px-8 bg-white/95 backdrop-blur-sm shadow-sm sticky top-0 z-30">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <h1 className="font-bold text-gray-900 text-lg md:text-xl truncate">
          {pageName}
        </h1>
        {pathname !== "/" && (
          <nav className="hidden sm:flex items-center gap-1 text-sm text-gray-500" aria-label="Breadcrumb">
            <span>/</span>
            <span className="truncate max-w-[200px]">{pageName}</span>
          </nav>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Notifications />
        {user && (
          <button
            onClick={() => router.push("/profile")}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-all group"
            title={`View profile for ${user.name}`}
            aria-label="View profile"
          >
            <div className="h-9 w-9 rounded-full bg-[#0066cc] flex items-center justify-center text-white text-xs font-bold shadow-md group-hover:shadow-lg transition-shadow flex-shrink-0">
              {getInitials(user.name)}
            </div>
            <div className="hidden md:block text-left min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate max-w-[120px]">
                {user.name}
              </div>
              <div className={clsx("text-xs font-medium truncate", {
                "text-green-600": user.role === "Admin",
                "text-[#0066cc]": user.role === "Healthcare Staff",
                "text-gray-500": user.role === "Guest",
              })}>
                {user.role}
              </div>
            </div>
            <ChevronRightIcon className="hidden lg:block h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0" />
          </button>
        )}
      </div>
    </header>
  );
}


