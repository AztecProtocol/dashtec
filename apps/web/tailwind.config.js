/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Customizing the 'slate' palette:
        // Lighter shades for light theme (standard Tailwind slate values)
        // Darker shades for dark theme (mapped to image's dark theme colors)
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#303030',  // 0x30
          700: '#202020',
          800: '#101010',
          900: '#000000',
        },
        green: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0', // Good for light text on dark backgrounds
          300: '#86efac', // Good for text on dark backgrounds
          400: '#4ade80', // Bright, good for icons or vibrant text/fills on dark
          500: '#22c55e', // Core success green - vibrant
          600: '#16a34a', // Slightly darker, still strong
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        amber: { // Or 'yellow' if you prefer
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d', // Good for text on dark
          400: '#facc15', // Bright warning
          500: '#f59e0b', // Core warning
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        // New Red Palette (based on Tailwind's default red)
        red: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca', // Good for light text on dark backgrounds
          300: '#fca5a5', // Good for text on dark backgrounds
          400: '#f87171', // Bright, good for icons or vibrant text/fills on dark
          500: '#ef4444', // Core error red - clear and alarming
          600: '#dc2626', // Slightly darker, still strong
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },

        'brand-violet': '#D4A017',       // Warm Gold — primary accent
        'brand-pink': '#EC4899',         // Kept as is. This is already a vibrant pink (Tailwind's pink-500) that works well.
        'accent-purple': '#E5B520',      // Light gold — secondary accent
        'accent-purple-light': '#F0C940',// Softest gold — light accent for dark mode
        'accent-cyan': '#22D3EE',          // Kept as is. This is a bright and effective cyan (Tailwind's cyan-400).
        'accent-blue': '#3B82F6',          // Kept as is. A solid, vibrant blue (Tailwind's blue-500).


        // Note: Your original 'dark-bg', 'dark-card', etc., are now effectively mapped
        // into the 'slate' palette above for use with standard Tailwind classes like dark:bg-slate-800.
        // You can remove the standalone 'dark-bg', 'dark-card' etc. definitions if you wish,
        // as they are redundant if this 'slate' palette is used consistently.
      },
      fontFamily: {
        // Your existing font families
      },
      borderRadius: {
        'card': '0.75rem', //
        'input': '0.5rem',  //
        'sidebar-item-active': '0.375rem',
      },
      boxShadow: {
        // Using Tailwind's default shadow classes like `shadow-lg` is recommended.
        // If you need a custom shadow for dark cards to match the subtle image shadow:
        'dark-card-image': '0 4px 12px rgba(0, 0, 0, 0.25)',
      },
      backgroundImage: {
        'gradient-purple-pink': 'linear-gradient(to right, #7C3AED, #EC4899)',
      },
      animation: {
        'pulse-border': 'pulse-border 1.5s cubic-bezier(0.1, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        'pulse-border': {
          '0%': {
            boxShadow: '0 0 0 0 rgba(var(--ping-color-rgb), 0.7)',
          },
          '70%': {
            boxShadow: '0 0 0 10px rgba(var(--ping-color-rgb), 0)',
          },
          '100%': {
            boxShadow: '0 0 0 0 rgba(var(--ping-color-rgb), 0)',
          },
        },
        'shimmer': {
          '0%': {
            transform: 'translateX(-100%)',
          },
          '100%': {
            transform: 'translateX(100%)',
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};