"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDateTime } from "@/lib/utils";
import { Bell, CheckCheck, Trash2, Loader2, Package, CreditCard, BarChart3, Settings, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Notification, NotificationCategory } from "@/types";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  stock: <Package className="w-4 h-4" />,
  credit: <CreditCard className="w-4 h-4" />,
  sales: <BarChart3 className="w-4 h-4" />,
  system: <Settings className="w-4 h-4" />,
  production: <Package className="w-4 h-4" />,
  staff: <Bell className="w-4 h-4" />,
};

const TYPE_COLORS: Record<string, string> = {
  info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  alert: "bg-red-500/10 text-red-400 border-red-500/20",
  success: "bg-green-500/10 text-green-400 border-green-500/20",
};

const CATEGORIES = ["all", "stock", "credit", "sales", "production", "staff", "system"] as const;

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("all");
  const [unreadCount, setUnreadCount] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== "all") params.set("category", category);
      const res = await fetch(`/api/notifications?${params}`);
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unread_count ?? 0);
    } catch {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAllRead = async () => {
    setActionLoading(true);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mark_all_read: true }),
      });
      toast.success("All notifications marked as read");
      fetchNotifications();
    } catch {
      toast.error("Failed to mark as read");
    } finally {
      setActionLoading(false);
    }
  };

  const markRead = async (id: string) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const deleteNotification = async (id: string) => {
    try {
      await fetch(`/api/notifications?id=${id}`, { method: "DELETE" });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      toast.error("Failed to delete notification");
    }
  };

  const clearRead = async () => {
    setActionLoading(true);
    try {
      await fetch("/api/notifications", { method: "DELETE" });
      toast.success("Read notifications cleared");
      fetchNotifications();
    } catch {
      toast.error("Failed to clear notifications");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            Notifications
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white text-xs font-bold">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            System alerts, SMS logs, and business events
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={actionLoading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground hover:border-blue-500/50 transition-all text-sm"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
          <button
            onClick={clearRead}
            disabled={actionLoading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-all text-sm"
          >
            <Trash2 className="w-4 h-4" />
            Clear read
          </button>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all border",
              category === cat
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-card text-muted-foreground border-border hover:border-blue-500/50"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => !notification.is_read && markRead(notification.id)}
              className={cn(
                "bg-card border rounded-xl p-4 transition-all cursor-pointer group",
                notification.is_read
                  ? "border-border opacity-60"
                  : "border-blue-500/30 hover:border-blue-500/50"
              )}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 mt-0.5",
                    TYPE_COLORS[notification.type] ?? TYPE_COLORS.info
                  )}
                >
                  {notification.category
                    ? CATEGORY_ICONS[notification.category] ?? <Info className="w-4 h-4" />
                    : <Bell className="w-4 h-4" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        notification.is_read ? "text-muted-foreground" : "text-foreground"
                      )}
                    >
                      {notification.title}
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!notification.is_read && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-destructive transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {notification.message}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] text-muted-foreground">
                      {formatDateTime(notification.created_at)}
                    </span>
                    {notification.category && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground capitalize">
                        {notification.category}
                      </span>
                    )}
                    {notification.sent_via?.includes("sms") && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
                        SMS sent
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
