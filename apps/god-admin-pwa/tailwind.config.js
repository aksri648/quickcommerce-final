/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        god: {
          dark: '#090d16',
          panel: '#111827',
          accent: '#6366f1',
        },
      },
    },
  },
  plugins: [],
};
