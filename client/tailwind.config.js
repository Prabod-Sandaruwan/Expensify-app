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
        brand: {
          500: '#22C55E',
          600: '#16A34A'
        },
        accent: {
          500: '#2563EB',
          600: '#1D4ED8'
        },
        danger: {
          500: '#EF4444',
          600: '#DC2626'
        }
      }
    },
  },
  plugins: [],
}
