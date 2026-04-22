'use client'; // This component uses client-side hooks

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import React, { useState, useEffect } from 'react';

export default function PageTransitionWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Page content with smooth transition */}
      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          initial={{
            opacity: 0,
            filter: 'blur(4px)',
          }}
          animate={{
            opacity: 1,
            filter: 'blur(0px)',
          }}
          exit={{
            opacity: 0,
            filter: 'blur(4px)',
          }}
          transition={{
            duration: 0.2,
            ease: 'easeOut',
          }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </>
  );
}