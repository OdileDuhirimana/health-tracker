import { ApiErrorPayload, ApiResponse } from "@/types";

/**
 * Resolve the backend API base URL.
 *
 * In development/test, falling back to the local backend is convenient and
 * safe. In production, silently falling back to localhost would mean a
 * misconfigured deployment (missing NEXT_PUBLIC_API_URL) quietly points at
 * a developer's machine instead of the real API — failing every request in
 * a confusing way. We fail fast and loud instead.
 *
 * Deliberately called lazily, at request time, from within `apiRequest()` —
 * NOT evaluated once at module load. `next build` evaluates this module
 * (transitively, via any page/layout that imports a service built on
 * `apiRequest`) while prerendering pages, in a `NODE_ENV=production`
 * process that has no reason to have `NEXT_PUBLIC_API_URL` set (that env
 * var is only guaranteed present in an actual deployment's build/runtime
 * environment, e.g. Vercel). Throwing eagerly at module load previously
 * crashed `next build` itself for anyone building locally, in CI, or in any
 * environment without that var set — a worse failure than the one this
 * check exists to prevent. Deferring the check to actual request time means
 * the build succeeds, and the loud failure still happens the moment the
 * deployed app tries to make its first real API call with a missing
 * configuration — which is the scenario this is actually guarding against.
 */
function resolveApiBaseUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL;
  if (configuredUrl) {
    return configuredUrl;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not set. This environment variable is required in production " +
        "and must point to the deployed backend API URL."
    );
  }

  return "http://localhost:3001";
}

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
    
    const response = await fetch(`${resolveApiBaseUrl()}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    let data: T | ApiErrorPayload;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = (await response.json()) as T | ApiErrorPayload;
    } else {
      const text = await response.text();
      data = { message: text || `HTTP error! status: ${response.status}` };
    }

    if (!response.ok) {
      return await handleErrorResponse(response, data as ApiErrorPayload, token);
    }

    return { data: data as T };
  } catch (error) {
    return handleNetworkError(error);
  }
}

/**
 * Handle error responses with proper error messages
 */
async function handleErrorResponse(
  response: Response,
  data: ApiErrorPayload,
  token: string | null
): Promise<ApiResponse<never>> {
  // `message` from the backend may be a single string (most endpoints) or
  // an array of strings (class-validator aggregated validation errors).
  // Normalize to a single displayable string up front so the rest of this
  // function can work with a plain `string | undefined`.
  const normalizedMessage = Array.isArray(data.message)
    ? data.message.join(", ")
    : data.message;

  let errorMessage =
    normalizedMessage || data.error || `HTTP error! status: ${response.status}`;

  // Handle validation errors (400) - surface the backend's message verbatim
  // (e.g. role/permission validation errors) rather than a generic fallback.
  if (response.status === 400 && normalizedMessage) {
    errorMessage = normalizedMessage;
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
    errorMessage = normalizedMessage || "Session expired. Please login again.";
  }

  // Handle conflict errors (409) - like email already exists
  if (response.status === 409) {
    errorMessage = normalizedMessage || "This email is already registered.";
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
 * Build a URL query string from a filters object.
 *
 * Generic over `T extends object` (rather than a `Record<string, ...>`
 * shape) so the various filter interfaces (`PatientFilters`,
 * `ProgramFilters`, etc.) can be passed directly without needing an
 * explicit index signature.
 */
export function buildQueryString<T extends object>(filters: T): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, String(value));
    }
  });
  return params.toString();
}

