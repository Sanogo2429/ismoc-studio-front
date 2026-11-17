import defaultColors from "tailwindcss/colors"

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
        // slate-500 à peine plus foncé (#64748B -> #627288) : contraste AA (4,5:1) des textes secondaires
        // sur le fond gris clair de l'espace client (#F7F8FA), sans changement visible.
        slate: { ...defaultColors.slate, 500: "#627288" },
      },
    },
  },
  plugins: [],
}