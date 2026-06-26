/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Semantic accents reused across charts and the UI.
        epf: '#2563eb',      // blue  — EPF
        personal: '#16a34a', // green — personal savings
        wealth: '#7c3aed',   // violet — total wealth
        expense: '#dc2626',  // red   — expenses
      },
    },
  },
  plugins: [],
};
