"use client";

/**
 * Notifications Component
 * Displays user notifications with read/unread status
 * Refactored to use services
 */

import { useState, useRef, useEffect } from "react";
import { BellIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { CalendarDaysIcon, UserPlusIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { PillIcon } from "@/components/ui/PillIcon";
import { formatDistanceToNow } from "date-fns";
import { notificationsService } from "@/services";

type Notification = {
  id: string;
  type: "medication" | "session" | "enrollment" | "alert";
  title: string;
  message: string;
  timestamp: Date | string;
  read: boolean;
  link?: string;
};

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await notificationsService.getAll({ limit: 50 });
      if (response.data) {
        setNotifications(response.data.map((n: any) => ({
          id: n.id,
          type: n.type as Notification["type"],
          title: n.title,
          message: n.message,
          timestamp: n.timestamp || n.createdAt,
          read: n.read,
          link: n.link,
        })));
      }
    } catch (error) {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const response = await notificationsService.getUnreadCount();
      if (response.data) {
        setUnreadCount(response.data.count || 0);
      }
    } catch (error) {
      // Error handled silently
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      // Error handled silently
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await notificationsService.remove(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (!notifications.find((n) => n.id === id)?.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      // Error handled silently
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      // Error handled silently
    }
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    const iconClasses = "h-5 w-5";
    switch (type) {
      case "medication":
        return <PillIcon className={iconClasses} />;
      case "session":
        return <CalendarDaysIcon className={iconClasses} />;
      case "enrollment":
        return <UserPlusIcon className={iconClasses} />;
      case "alert":
        return <ExclamationTriangleIcon className={iconClasses} />;
      default:
        return <BellIcon className={iconClasses} />;
    }
  };

  const unreadNotifications = notifications.filter((n) => !n.read);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
        aria-label="Notifications"
      >
        <BellIcon className="h-6 w-6 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 rounded-full text-white text-xs font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Notifications</h3>
            {unreadNotifications.length > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-[#0066cc] hover:text-[#0052a3] font-semibold"
              >
                Mark all as read
              </button>
            )}
          </div>
          <div className="overflow-y-auto max-h-80">
            {loading ? (
              <div className="p-4 text-center text-sm text-gray-500">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                No notifications
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      !notification.read ? "bg-blue-50/50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5 text-[#0066cc]">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">
                              {notification.title}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDistanceToNow(new Date(notification.timestamp), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="h-2 w-2 bg-[#0066cc] rounded-full flex-shrink-0 mt-1"></div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="text-xs text-[#0066cc] hover:text-[#0052a3] font-medium"
                            disabled={notification.read}
                          >
                            {notification.read ? "Read" : "Mark as read"}
                          </button>
                          <button
                            onClick={() => handleRemove(notification.id)}
                            className="text-xs text-red-600 hover:text-red-700 font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
