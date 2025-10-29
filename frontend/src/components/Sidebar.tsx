/** Navigation sidebar with role-based menu items and mobile support. */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, CalendarDaysIcon, UsersIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon, UserIcon, DocumentChartBarIcon, XMarkIcon, Bars3Icon } from "@heroicons/react/24/outline";
import { ClipboardDocumentListIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/Logo";
import { LiaPillsSolid } from "react-icons/lia";
import clsx from "clsx";

const navItems = [
  { href: "/", label: "Dashboard", icon: HomeIcon, roles: ["Admin"] },
  { href: "/programs", label: "Programs", icon: ClipboardDocumentListIcon, roles: ["Admin", "Healthcare Staff", "Guest"] },
  { href: "/patients", label: "Patients", icon: UsersIcon, roles: ["Admin", "Healthcare Staff"] },
  { href: "/medications", label: "Medications", icon: LiaPillsSolid, roles: ["Admin", "Healthcare Staff"] },
  { href: "/attendance", label: "Attendance", icon: CalendarDaysIcon, roles: ["Admin", "Healthcare Staff"] },
  { href: "/reports", label: "Reports", icon: DocumentChartBarIcon, roles: ["Admin"] },
  { href: "/activity", label: "Activity Logs", icon: ClipboardDocumentListIcon, roles: ["Admin"] },
  { href: "/users", label: "Users", icon: UsersIcon, roles: ["Admin"] },
  { href: "/profile", label: "Profile", icon: UserIcon, roles: ["Admin", "Healthcare Staff", "Guest"] },
  { href: "/settings", label: "Settings", icon: Cog6ToothIcon, roles: ["Admin", "Healthcare Staff", "Guest"] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileOpen]);

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-gray-200 bg-white">
        <Logo size="default" />
        <button
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
          aria-label="Close menu"
        >
          <XMarkIcon className="h-5 w-5 text-gray-600" />
        </button>
      </div>
      
      {/* Navigation */}
      <nav className="p-3 space-y-1 flex-1 overflow-y-auto" aria-label="Main navigation">
        {navItems
          .filter((item) => !item.roles || !user || item.roles.includes(user.role))
          .map((item) => {
          const ActiveIcon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 group relative",
              active
                  ? "bg-[#0066cc] text-white shadow-md"
                  : "text-gray-700 hover:bg-gray-50 hover:text-[#0066cc]"
              )}
              aria-current={active ? "page" : undefined}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
              )}
              <ActiveIcon className={clsx(
                "h-5 w-5 transition-all duration-200 flex-shrink-0",
                active ? "text-white" : "text-gray-500 group-hover:text-[#0066cc]"
              )} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      
      {/* User Profile & Logout */}
      <div className="mt-auto p-4 border-t border-gray-200 space-y-2 bg-gradient-to-b from-gray-50 to-white">
        <Link
          href="/profile"
          className="flex items-center gap-3 hover:bg-gray-100 active:bg-gray-200 rounded-lg p-2.5 transition-all group"
        >
          <div className="h-11 w-11 rounded-full bg-[#0066cc] flex items-center justify-center text-white text-sm font-bold shadow-md group-hover:shadow-lg transition-shadow flex-shrink-0">
            {user ? getInitials(user.name) : "U"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold truncate text-gray-900">{user?.name || "User"}</div>
            <div className={clsx("text-xs truncate font-semibold", {
              "text-green-600": user?.role === "Admin",
              "text-[#0066cc]": user?.role === "Healthcare Staff",
              "text-gray-500": !user || user.role === "Guest",
            })}>
              {user?.role || "Guest"}
            </div>
          </div>
        </Link>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 active:bg-red-100 transition-all"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5 flex-shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile menu button - Only show when sidebar is closed */}
      {!isMobileOpen && (
        <button
          onClick={() => setIsMobileOpen(true)}
          className="md:hidden fixed top-4 left-4 z-50 p-2.5 rounded-lg bg-white border-2 border-gray-200 shadow-lg hover:shadow-xl hover:bg-gray-50 active:bg-gray-100 transition-all"
          aria-label="Open menu"
          aria-expanded={isMobileOpen}
        >
          <Bars3Icon className="h-5 w-5 text-gray-700" />
        </button>
      )}

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed md:static inset-y-0 left-0 z-50 w-64 flex flex-col border-r border-gray-200 bg-white shadow-xl md:shadow-sm transition-transform duration-300 ease-in-out",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
        aria-label="Sidebar navigation"
      >
        {sidebarContent}
      </aside>
    </>
  );
}