/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        industrial: {
          950: '#0b0f17',
          900: '#111827',
          800: '#1f2937',
          700: '#374151',
          600: '#4b5563',
          500: '#6b7280',
          accent: '#0284c7', // Sky-600
          teal: '#0d9488',   // Teal-600
          amber: '#d97706',  // Amber-600
        }
      }
    },
  },
  plugins: [],
}
