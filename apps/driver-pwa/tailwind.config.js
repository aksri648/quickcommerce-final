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
        driver: {
          dark: '#0f172a',
          emerald: '#10b981',
          amber: '#f59e0b',
        },
      },
    },
  },
  plugins: [],
};
