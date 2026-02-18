/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#f0f404',
        secondary: '#3b82f6',
        danger: '#ef4444',
      }
    },
  },
  plugins: [],
}