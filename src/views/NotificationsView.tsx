import React from 'react';
import {
  Bell,
  BellRing,
  CheckCheck,
  Clock,
  MessageSquare,
  Shield,
  Trash2,
  Volume2,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { soundService } from '../utils/sound';

interface NotificationsViewProps {
  onNavigateTab?: (tab: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ onNavigateTab }) => {
  const {
    notifications,
    unreadCount,
    permissionStatus,
    requestPushPermission,
    markAsRead,
    markAllAsRead,
    clearAll,
  } = useNotifications();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-white">
      {/* Push Notification Access Banner */}
      <div className="mb-6 p-4 rounded-3xl border border-pink-500/30 bg-gradient-to-r from-pink-950/40 via-zinc-900 to-zinc-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_0_15px_rgba(255,45,141,0.15)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-pink-600 text-white flex items-center justify-center shadow-[0_0_10px_rgba(255,45,141,0.4)] shrink-0">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-xs sm:text-sm text-white flex items-center gap-2">
              <span>Push Notifications &amp; Sound Alerts</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize border ${
                  permissionStatus === 'granted'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : permissionStatus === 'denied'
                    ? 'bg-red-500/20 text-red-300 border-red-500/30'
                    : 'bg-pink-500/20 text-pink-300 border-pink-500/30'
                }`}
              >
                {permissionStatus === 'granted'
                  ? 'Active & Enabled'
                  : permissionStatus === 'denied'
                  ? 'Blocked'
                  : 'Disabled'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Get notified immediately on new messages and bookings even when TimeMate is in another tab.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {permissionStatus !== 'granted' ? (
            <button
              onClick={requestPushPermission}
              className="w-full sm:w-auto px-4 py-2 bg-pink-600 hover:bg-pink-500 active:opacity-90 text-white font-bold text-xs rounded-xl shadow-[0_0_10px_rgba(255,45,141,0.3)] transition-all cursor-pointer"
            >
              Allow Notifications
            </button>
          ) : (
            <button
              onClick={() => soundService.playBookingChime()}
              className="w-full sm:w-auto px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Volume2 className="w-3.5 h-3.5 text-pink-400" />
              <span>Test Sound</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            Activity Feed
            {unreadCount > 0 && (
              <span className="text-xs bg-pink-500 text-white font-bold px-2 py-0.5 rounded-full shadow-[0_0_8px_#ff2d8d]">
                {unreadCount} unread
              </span>
            )}
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Realtime updates for your active bookings, messages, and account events.
          </p>
        </div>

        {notifications.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={markAllAsRead}
              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-xl border border-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5 text-pink-400" />
              <span>Mark All Read</span>
            </button>
            <button
              onClick={clearAll}
              className="p-1.5 text-zinc-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
              title="Clear all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-[#121214] rounded-3xl border border-zinc-800 p-12 text-center shadow-xs">
          <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 text-zinc-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-white text-base">No notifications</h3>
          <p className="text-xs text-zinc-400 mt-1">
            You are all caught up! Real events regarding your bookings and messages will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                markAsRead(n.id);
                if (n.link && onNavigateTab) {
                  const tab = n.link.replace('/', '');
                  onNavigateTab(tab);
                }
              }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                n.is_read
                  ? 'bg-[#121214] border-zinc-800/80 opacity-70'
                  : 'bg-[#16141a] border-pink-500/30 shadow-[0_0_10px_rgba(255,45,141,0.1)]'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  n.type === 'booking'
                    ? 'bg-pink-600 text-white shadow-[0_0_8px_rgba(255,45,141,0.3)]'
                    : n.type === 'message'
                    ? 'bg-purple-600 text-white'
                    : 'bg-amber-600 text-white'
                }`}
              >
                {n.type === 'booking' ? (
                  <Bell className="w-4 h-4" />
                ) : n.type === 'message' ? (
                  <MessageSquare className="w-4 h-4" />
                ) : (
                  <Shield className="w-4 h-4" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-white truncate">{n.title}</h4>
                  <span className="text-[10px] text-zinc-500">
                    {new Date(n.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed">{n.message}</p>
              </div>

              {!n.is_read && (
                <span className="w-2 h-2 rounded-full bg-pink-500 shrink-0 mt-1.5 shadow-[0_0_6px_#ff2d8d]" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
