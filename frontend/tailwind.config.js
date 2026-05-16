/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#7C3AED',
        'primary-hover': '#6D28D9',
        'dark-bg': '#0F1117',
        'dark-card': '#1A1D27',
        'dark-border': '#2D3748',
        'dark-text': '#E2E8F0',
        'dark-muted': '#94A3B8',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}