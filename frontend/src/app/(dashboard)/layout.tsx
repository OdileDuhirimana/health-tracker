"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import React from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen flex bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 md:ml-0">
          <Topbar />
          <main className="p-4 md:p-6 lg:p-8 space-y-6">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}


