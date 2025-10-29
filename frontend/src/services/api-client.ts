/**
 * API Client - Core HTTP request handler
 * Handles authentication, error handling, and response parsing
 */

import { ApiResponse } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/**
 * Core API request function with authentication and error handling
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    // Get auth token from secure storage
    let token: string | null = null;
    if (typeof window !== "undefined") {
      try {
        const { tokenStorage } = await import("@/lib/tokenStorage");
        token = tokenStorage.getToken();
        
        // Fallback to legacy storage for migration
        if (!token) {
          const authData = localStorage.getItem("auth");
          if (authData) {
            const parsed = JSON.parse(authData);
            token = parsed.token || parsed.accessToken;
          }
        }
      } catch {
        // If secure storage fails, try legacy
        const authData = localStorage.getItem("auth");
        if (authData) {
          try {
            const parsed = JSON.parse(authData);
            token = parsed.token || parsed.accessToken;
          } catch {
            // Continue without token
          }
        }
      }
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { message: text || `HTTP error! status: ${response.status}` };
    }

    if (!response.ok) {
      return await handleErrorResponse(response, data, token);
    }

    return { data };
  } catch (error) {
    return handleNetworkError(error);
  }
}

/**
 * Handle error responses with proper error messages
 */
async function handleErrorResponse(
  response: Response,
  data: any,
  token: string | null
): Promise<ApiResponse<never>> {
  let errorMessage = data.message || data.error || `HTTP error! status: ${response.status}`;
  
  // Handle validation errors (400)
  if (response.status === 400) {
    if (Array.isArray(data.message)) {
      errorMessage = data.message.join(", ");
    } else if (typeof data.message === 'string') {
      errorMessage = data.message;
    }
    if (data.message?.includes("Admin") || data.message?.includes("role")) {
      errorMessage = data.message;
    }
  }
  
  // Handle unauthorized errors (401) - token expired or invalid
  if (response.status === 401) {
    if (typeof window !== "undefined") {
      const currentPath = window.location.pathname;
      if (!currentPath.includes("/login") && !currentPath.includes("/signup")) {
        const { tokenStorage } = await import("@/lib/tokenStorage");
        tokenStorage.clearAll();
        if (token) {
          window.location.href = "/login";
        }
      }
    }
    errorMessage = data.message || "Session expired. Please login again.";
  }
  
  // Handle conflict errors (409) - like email already exists
  if (response.status === 409) {
    errorMessage = data.message || "This email is already registered.";
  }

  return { error: errorMessage };
}

/**
 * Handle network errors
 */
function handleNetworkError(error: unknown): ApiResponse<never> {
  if (error instanceof TypeError && error.message === "Failed to fetch") {
    return {
      error: "Unable to connect to server. Please check your internet connection and ensure the backend server is running.",
    };
  }
  return {
    error: error instanceof Error ? error.message : "An unexpected error occurred",
  };
}

/**
 * Build query string from filters object
 */
export function buildQueryString(filters: Record<string, any>): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, value.toString());
    }
  });
  return params.toString();
}

