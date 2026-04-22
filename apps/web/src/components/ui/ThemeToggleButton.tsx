'use client';

import { useTheme } from '@/context/ThemeContext';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';

export const ThemeToggleButton = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-md hover:bg-white/30 dark:hover:bg-slate-700 transition-colors"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <MoonIcon className="h-6 w-6 text-slate-700 dark:text-white" />
      ) : (
        <SunIcon className="h-6 w-6 text-yellow-500" />
      )}
    </button>
  );
};