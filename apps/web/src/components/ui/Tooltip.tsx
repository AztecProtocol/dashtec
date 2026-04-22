'use client';

import React, { ReactNode, useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Z_INDEX } from '@/utils/constants';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  className?: string;
  zIndex?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, className, zIndex }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (isVisible && tooltipRef.current && triggerRef.current) {
      const tooltip = tooltipRef.current;
      const trigger = triggerRef.current;

      const tooltipRect = tooltip.getBoundingClientRect();
      const triggerRect = trigger.getBoundingClientRect();

      let top = triggerRect.top - tooltipRect.height - 8;
      let left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);

      if (left < 8) {
        left = 8;
      }
      if (left + tooltipRect.width > window.innerWidth - 8) {
        left = window.innerWidth - tooltipRect.width - 8;
      }
      if (top < 8) {
        top = triggerRect.bottom + 8;
      }

      tooltip.style.top = `${top}px`;
      tooltip.style.left = `${left}px`;
    }
  }, [isVisible]);

  const tooltipElement = isVisible && mounted ? (
    <div
      ref={tooltipRef}
      className="fixed max-w-sm p-3 bg-slate-800 text-white text-xs rounded-lg shadow-lg dark:bg-slate-900 border border-slate-700 animate-fade-in whitespace-normal break-words leading-relaxed"
      style={{ zIndex: zIndex || Z_INDEX.TOOLTIP }}
    >
      {content}
    </div>
  ) : null;

  return (
    <>
      <div
        ref={triggerRef}
        className={`relative flex items-center ${className}`}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {mounted && tooltipElement && createPortal(tooltipElement, document.body)}
    </>
  );
};