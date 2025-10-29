"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

type AllowedRole = "Admin" | "Healthcare Staff" | "Guest";

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: AllowedRole[];
  redirectTo?: string;
}

export default function RoleProtectedRoute({ 
  children, 
  allowedRoles,
  redirectTo = "/"
}: RoleProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (!allowedRoles.includes(user.role as AllowedRole)) {
        router.push(redirectTo);
      }
    }
  }, [user, loading, allowedRoles, redirectTo, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0066cc]" />
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role as AllowedRole)) {
    return null;
  }

  return <>{children}</>;
}


