/**
 * Notifications Service
 * Handles all notification-related API calls
 */

import { apiRequest, buildQueryString } from "./api-client";

export const notificationsService = {
  /**
   * Get all notifications with optional filters
   */
  getAll: (filters?: { read?: boolean; limit?: number }) => {
    const queryString = filters ? buildQueryString(filters) : "";
    return apiRequest<any[]>(`/notifications?${queryString}`);
  },
  
  /**
   * Get unread notifications count
   */
  getUnreadCount: () => apiRequest<{ count: number }>("/notifications/unread/count"),
  
  /**
   * Mark notification as read
   */
  markAsRead: (id: string) => apiRequest<any>(`/notifications/${id}/read`, { method: "PATCH" }),
  
  /**
   * Mark all notifications as read
   */
  markAllAsRead: () => apiRequest<any>("/notifications/read-all", { method: "PATCH" }),
  
  /**
   * Delete notification
   */
  remove: (id: string) => apiRequest<any>(`/notifications/${id}`, { method: "DELETE" }),
};

