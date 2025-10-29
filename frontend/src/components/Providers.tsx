"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "next-themes";
import { ToastProvider } from "@/components/Toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  // Create QueryClient with optimized settings for performance
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute - data stays fresh for 1 min
            gcTime: 5 * 60 * 1000, // 5 minutes - cache garbage collection
            refetchOnWindowFocus: false, // Don't refetch on window focus
            retry: 1, // Only retry once on failure
            refetchOnMount: true, // Refetch on mount for fresh data
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
    <ThemeProvider 
      attribute="class" 
      defaultTheme="light" 
      enableSystem={false} 
      storageKey="healthtrack-theme"
      disableTransitionOnChange={false}
    >
      <AuthProvider>
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </ThemeProvider>
    </QueryClientProvider>
  );
}
