// tailwind.config.js
const defaultTheme = require('tailwindcss/defaultTheme')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'grid-pattern': `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      },
      boxShadow: {
        'glow-red': '0 0 20px 0 rgba(239, 68, 68, 0.4)',
        'glow-blue': '0 0 20px 0 rgba(59, 130, 246, 0.4)',
        'glow-green': '0 0 20px 0 rgba(34, 197, 94, 0.4)',
        'glow-purple': '0 0 20px 0 rgba(168, 85, 247, 0.4)',
      },
      keyframes: {
        'fade-in-scale': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in-scale': 'fade-in-scale 0.3s ease-out forwards',
      },
    }
  },
  plugins: [],
};
