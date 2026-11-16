/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkSlate: "#0F172A",
        vibrantOrange: "#F59E0B",
      },
    },
  },
  plugins: [],
}