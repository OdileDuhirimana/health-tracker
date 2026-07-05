/**
 * Notifications Service
 * Handles all notification-related API calls
 */

import { apiRequest, buildQueryString } from "./api-client";
import { Notification } from "@/types";

export const notificationsService = {
  /**
   * Get all notifications with optional filters
   */
  getAll: (filters?: { read?: boolean; limit?: number }) => {
    const queryString = filters ? buildQueryString(filters) : "";
    return apiRequest<Notification[]>(`/notifications?${queryString}`);
  },

  /**
   * Get unread notifications count
   */
  getUnreadCount: () => apiRequest<{ count: number }>("/notifications/unread/count"),

  /**
   * Mark notification as read
   */
  markAsRead: (id: string) => apiRequest<Notification>(`/notifications/${id}/read`, { method: "PATCH" }),

  /**
   * Mark all notifications as read
   */
  markAllAsRead: () => apiRequest<{ count: number }>("/notifications/read-all", { method: "PATCH" }),

  /**
   * Delete notification
   */
  remove: (id: string) => apiRequest<{ id: string }>(`/notifications/${id}`, { method: "DELETE" }),
};

