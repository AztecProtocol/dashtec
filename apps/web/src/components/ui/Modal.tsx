'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useEffect, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
  fullscreen?: boolean;
  zIndex?: number;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, className = '', fullscreen = false, zIndex = 50 }) => {
  const [isMounted, setIsMounted] = useState(false);

  // Ensure the component is mounted on the client before creating the portal
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Close modal on 'Escape' key press
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  const modalContainerClasses = fullscreen
    ? 'w-screen h-screen rounded-none m-0 flex flex-col'
    : `relative w-full max-w-lg max-h-[90vh] rounded-xl m-4 flex flex-col ${className}`;

  const modalContentClasses = fullscreen
    ? 'p-6 flex-grow flex items-center justify-center'
    : 'p-6 overflow-y-auto custom-scrollbar flex-grow';

  // The full modal JSX including the backdrop and animations
  const modalComponent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className={`fixed inset-0 flex items-center justify-center bg-black/50 p-4 overflow-y-auto custom-scrollbar`}
          style={{ zIndex: zIndex }}
        >
          <motion.div
            initial={{ scale: 0.98 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.98, transition: { duration: 0.15, ease: 'easeOut' } }}
            onClick={(e) => e.stopPropagation()}
            className={`bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 ${modalContainerClasses}`}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors z-10 touch-manipulation"
                aria-label="Close modal"
                type="button"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className={modalContentClasses}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Only render the portal once the component has mounted on the client.
  // This safely avoids SSR errors since `document.body` is a browser-only API.
  return isMounted ? createPortal(modalComponent, document.body) : null;
};