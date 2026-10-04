import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppNotification } from '../types';
import { useAuth } from './AuthContext';
import { getSupabaseClient } from '../lib/supabase';
import { soundService } from '../utils/sound';

export type NotificationPermissionStatus = 'default' | 'granted' | 'denied' | 'unsupported';

interface InAppToast {
  id: string;
  title: string;
  message: string;
  type: 'booking' | 'payment' | 'message' | 'system';
  link?: string;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  permissionStatus: NotificationPermissionStatus;
  requestPushPermission: () => Promise<boolean>;
  activeToast: InAppToast | null;
  dismissToast: () => void;
  addNotification: (notification: Omit<AppNotification, 'id' | 'created_at' | 'is_read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission as NotificationPermissionStatus;
    }
    return 'unsupported';
  });

  const [activeToast, setActiveToast] = useState<InAppToast | null>(null);

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('timemate_notifications');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return [];
        }
      }
    }
    return [];
  });

  const supabase = getSupabaseClient();

  // Sync notification permission state
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission as NotificationPermissionStatus);
    }
  }, []);

  // Save to persistence
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('timemate_notifications', JSON.stringify(notifications));
    }
  }, [notifications]);

  /**
   * Request browser push notification permissions
   */
  const requestPushPermission = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermissionStatus('unsupported');
      return false;
    }

    try {
      const perm = await Notification.requestPermission();
      setPermissionStatus(perm as NotificationPermissionStatus);

      if (perm === 'granted') {
        soundService.playBookingChime();
        // Send a welcoming confirmation notification
        try {
          new Notification('Time Mate Notifications Enabled', {
            body: 'You will receive instant alerts for real-time messages, booking requests, and updates!',
            icon: '/favicon.ico',
          });
        } catch {
          // Ignored
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  /**
   * Dispatches both in-app toast, audio chime, and native browser push notification
   */
  const addNotification = useCallback((data: Omit<AppNotification, 'id' | 'created_at' | 'is_read'>) => {
    const newNotif: AppNotification = {
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      user_id: data.user_id,
      title: data.title,
      message: data.message,
      type: data.type,
      is_read: false,
      created_at: new Date().toISOString(),
      link: data.link,
    };

    setNotifications((prev) => [newNotif, ...prev]);

    // 1. Play appropriate sound chime
    if (data.type === 'message') {
      soundService.playMessageChime();
    } else {
      soundService.playBookingChime();
    }

    // 2. Trigger In-App Floating Toast
    setActiveToast({
      id: newNotif.id,
      title: data.title,
      message: data.message,
      type: data.type,
      link: data.link,
    });

    // Auto-dismiss toast after 5s
    setTimeout(() => {
      setActiveToast((curr) => (curr?.id === newNotif.id ? null : curr));
    }, 5000);

    // 3. Trigger Native Browser Push Notification (visible even in background tabs)
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      try {
        const notif = new Notification(data.title, {
          body: data.message,
          icon: '/favicon.ico',
          tag: newNotif.id,
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch {
        // Handled silently
      }
    }
  }, []);

  const dismissToast = useCallback(() => {
    setActiveToast(null);
  }, []);

  // Listen to realtime bookings and messages for logged in user
  useEffect(() => {
    if (!user) return;

    // 1. Booking Channel
    const bookingChannel = supabase
      .channel(`user-bookings-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        (payload: any) => {
          const booking = payload.new;
          if (!booking) return;

          if (booking.customer_id === user.id || booking.companion_id === user.id) {
            if (payload.eventType === 'INSERT') {
              if (booking.companion_id === user.id) {
                addNotification({
                  user_id: user.id,
                  title: '✨ New Booking Request',
                  message: `You received a new booking request for ₹${booking.total_price}.`,
                  type: 'booking',
                  link: 'bookings',
                });
              }
            } else if (payload.eventType === 'UPDATE') {
              addNotification({
                user_id: user.id,
                title: '📅 Booking Status Update',
                message: `Booking #${booking.id.slice(0, 8)} status updated to ${booking.booking_status}.`,
                type: 'booking',
                link: 'bookings',
              });
            }
          }
        }
      )
      .subscribe();

    // 2. Global Messages Channel for Notifications
    const messagesChannel = supabase
      .channel(`user-messages-global-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload: any) => {
          const msg = payload.new;
          if (!msg || msg.sender_id === user.id) return;

          // Check if user is participant of conversation
          const { data: conv } = await supabase
            .from('conversations')
            .select('participant_ids')
            .eq('id', msg.conversation_id)
            .maybeSingle();

          if (conv && Array.isArray(conv.participant_ids) && conv.participant_ids.includes(user.id)) {
            addNotification({
              user_id: user.id,
              title: '💬 New Message Received',
              message: msg.content.length > 60 ? msg.content.slice(0, 60) + '...' : msg.content,
              type: 'message',
              link: 'messages',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bookingChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [user, supabase, addNotification]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        permissionStatus,
        requestPushPermission,
        activeToast,
        dismissToast,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
