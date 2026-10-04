import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppNotification } from '../types';
import { useAuth } from './AuthContext';
import { getSupabaseClient } from '../lib/supabase';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (notification: Omit<AppNotification, 'id' | 'created_at' | 'is_read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
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

  // Save to persistence
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('timemate_notifications', JSON.stringify(notifications));
    }
  }, [notifications]);

  // Listen to realtime notifications or booking status changes if user is logged in
  useEffect(() => {
    if (!user) return;

    // Listen to changes on bookings table for this user
    const channel = supabase
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

          // Check if this booking involves this user
          if (booking.customer_id === user.id || booking.companion_id === user.id) {
            if (payload.eventType === 'INSERT') {
              if (booking.companion_id === user.id) {
                addNotification({
                  user_id: user.id,
                  title: 'New Booking Request',
                  message: `You have received a new booking request for ₹${booking.total_price}.`,
                  type: 'booking',
                  link: '/bookings',
                });
              }
            } else if (payload.eventType === 'UPDATE') {
              addNotification({
                user_id: user.id,
                title: 'Booking Status Updated',
                message: `Booking #${booking.id.slice(0, 8)} status changed to ${booking.booking_status}.`,
                type: 'booking',
                link: '/bookings',
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase]);

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
  }, []);

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
