import React from 'react';
import {
  Bell,
  CheckCheck,
  Clock,
  MessageSquare,
  Shield,
  Trash2,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

interface NotificationsViewProps {
  onNavigateTab?: (tab: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ onNavigateTab }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            Notifications &amp; Activity
            {unreadCount > 0 && (
              <span className="text-xs bg-red-500 text-white font-bold px-2 py-0.5 rounded-full">
                {unreadCount} unread
              </span>
            )}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Realtime updates for your active bookings, messages, and account events.
          </p>
        </div>

        {notifications.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={markAllAsRead}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
            >
              <CheckCheck className="w-3.5 h-3.5 text-indigo-600" />
              Mark All Read
            </button>
            <button
              onClick={clearAll}
              className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              title="Clear all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center shadow-xs">
          <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-gray-900 text-base">No notifications</h3>
          <p className="text-xs text-gray-500 mt-1">
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
                  ? 'bg-white border-gray-200 opacity-80'
                  : 'bg-indigo-50/50 border-indigo-200 shadow-xs'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  n.type === 'booking'
                    ? 'bg-indigo-600 text-white'
                    : n.type === 'message'
                    ? 'bg-blue-600 text-white'
                    : 'bg-amber-500 text-white'
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
                  <h4 className="font-bold text-xs text-gray-900 truncate">{n.title}</h4>
                  <span className="text-[10px] text-gray-400">
                    {new Date(n.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{n.message}</p>
              </div>

              {!n.is_read && (
                <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1.5" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
