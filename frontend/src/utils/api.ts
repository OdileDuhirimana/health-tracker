/**
 * Shared helpers for normalizing API list responses.
 *
 * Several backend endpoints return a bare array (`T[]`) while paginated
 * endpoints return `{ data: T[], pagination }`. Rather than repeating an
 * `Array.isArray(...) ? ... : ...` check (often backed by an `any` cast) in
 * every hook and page that consumes these endpoints, centralize the
 * unwrapping logic here.
 */

import { PaginatedResponse } from "@/types";

/**
 * Normalize a list-shaped API response payload into a plain array,
 * regardless of whether the backend returned a bare array or a paginated
 * envelope. Returns an empty array for missing/invalid input so callers can
 * always safely iterate the result.
 */
export function normalizeListResponse<T>(
  data: PaginatedResponse<T> | T[] | undefined | null
): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

/**
 * Extract pagination metadata from a list-shaped API response payload, if
 * present. Bare array responses have no pagination metadata by definition.
 */
export function extractPagination<T>(
  data: PaginatedResponse<T> | T[] | undefined | null
): PaginatedResponse<T>["pagination"] | null {
  if (!data || Array.isArray(data)) return null;
  return data.pagination ?? null;
}
