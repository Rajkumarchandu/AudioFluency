import { useState, useEffect } from "react";
import StudentLayout from "../../components/layout/student/StudentLayout";
import { useAuth } from "../../context/AuthContext";
import {
  getNotifications,
  markAsRead,
  markAllRead,
  deleteNotification,
} from "../../services/notificationService";

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.studentId) fetchNotifications();
  }, [user]);

  async function fetchNotifications() {
    setLoading(true);
    try {
      const data = await getNotifications(user.studentId);
      setNotifications(data);
    } catch (e) {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkRead(id) {
    await markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  }

  async function handleMarkAllRead() {
    await markAllRead(user.studentId);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  async function handleDelete(id) {
    await deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <StudentLayout>
      <div className="space-y-6">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white">🔔 Notifications</h1>
            <p className="text-slate-400 mt-1">
              {unread > 0 ? `${unread} unread` : "All caught up!"}
            </p>
          </div>
          <div className="flex gap-3">
            {unread > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="px-4 py-2 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 hover:bg-purple-600/40 text-sm transition"
              >
                ✓ Mark all read
              </button>
            )}
            <button
              onClick={fetchNotifications}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 text-sm transition"
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* NOTIFICATIONS LIST */}
        {loading ? (
          <div className="text-center py-20 text-slate-500">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
            <div className="text-5xl mb-4">🔔</div>
            <p className="text-slate-400">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 rounded-2xl border flex items-start gap-4 transition ${
                  n.is_read
                    ? "bg-white/5 border-white/10"
                    : "bg-purple-500/5 border-purple-500/30"
                }`}
              >
                {/* UNREAD DOT */}
                <div className="pt-1 flex-shrink-0">
                  {!n.is_read ? (
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                  ) : (
                    <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                  )}
                </div>

                {/* CONTENT */}
                <div className="flex-1">
                  <p
                    className={`text-sm ${
                      n.is_read ? "text-slate-400" : "text-white"
                    }`}
                  >
                    {n.message}
                  </p>
                  <p className="text-slate-600 text-xs mt-1">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>

                {/* ACTIONS */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!n.is_read && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="text-xs px-2 py-1 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-400 hover:bg-purple-600/40 transition"
                    >
                      Mark read
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(n.id)}
                    className="text-xs px-2 py-1 rounded-lg bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/40 transition"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}