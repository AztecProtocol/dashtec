'use client';

import { motion } from 'framer-motion';
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import React from 'react';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationProps {
  message: string;
  type: NotificationType;
  onClose: () => void;
  duration?: number;
}

// Defines the visual properties for each notification type for a consistent look
const typeInfo = {
  success: {
    Icon: CheckCircleIcon,
    title: 'Success',
    iconColor: 'text-green-500',
    iconBg: 'bg-green-100 dark:bg-green-500/10',
    progressBar: 'bg-green-500',
  },
  error: {
    Icon: XCircleIcon,
    title: 'Error',
    iconColor: 'text-red-500',
    iconBg: 'bg-red-100 dark:bg-red-500/10',
    progressBar: 'bg-red-500',
  },
  warning: {
    Icon: ExclamationTriangleIcon,
    title: 'Warning',
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-100 dark:bg-amber-500/10',
    progressBar: 'bg-amber-500',
  },
  info: {
    Icon: InformationCircleIcon,
    title: 'Information',
    iconColor: 'text-sky-500',
    iconBg: 'bg-sky-100 dark:bg-sky-500/10',
    progressBar: 'bg-sky-500',
  },
};

export const Notification: React.FC<NotificationProps> = ({ message, type, onClose, duration }) => {
  const { Icon, title, iconColor, iconBg, progressBar } = typeInfo[type];

  // The component now handles its own dismissal via a timeout
  React.useEffect(() => {
    if (duration && duration !== Infinity) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 350, damping: 30 } }}
      exit={{ opacity: 0, scale: 0.9, x: 50, transition: { duration: 0.25, ease: 'easeOut' } }}
      className="relative w-full max-w-sm overflow-hidden rounded-xl bg-white dark:bg-slate-800 shadow-2xl ring-1 ring-slate-900/10 dark:ring-slate-50/10"
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${iconBg}`}>
              <Icon className={`h-6 w-6 ${iconColor}`} aria-hidden="true" />
            </div>
          </div>
          <div className="ml-4 flex-1 pt-0.5">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{title}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{message}</p>
          </div>
          <div className="ml-4 flex flex-shrink-0">
            <button
              onClick={onClose}
              className="inline-flex rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-violet"
            >
              <span className="sr-only">Close</span>
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Sleek Progress Bar at the bottom */}
      {duration && duration !== Infinity && (
        <div className="absolute bottom-0 left-0 right-0 h-1 w-full bg-black/5 dark:bg-white/5">
          <motion.div
            className={`h-full ${progressBar}`}
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: duration / 1000, ease: "linear" }}
          />
        </div>
      )}
    </motion.div>
  );
};