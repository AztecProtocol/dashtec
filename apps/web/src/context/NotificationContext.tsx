'use client';

import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Notification } from '@/components/ui/Notification';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface NotificationData {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number;
}

interface NotificationContextType {
  addNotification: (message: string, type: NotificationType, duration?: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // The duration default is set here, but the countdown logic is in the UI component
  const addNotification = useCallback((message: string, type: NotificationType, duration = 1500) => {
    const id = new Date().toISOString() + Math.random();
    setNotifications((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      {/* This container renders the stack of notifications */}
      <div className="fixed top-5 right-5 z-[100] w-full max-w-sm space-y-3">
        <AnimatePresence>
          {notifications.map((n) => (
            <Notification
              key={n.id}
              message={n.message}
              type={n.type}
              duration={n.duration}
              onClose={() => removeNotification(n.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};