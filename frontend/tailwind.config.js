/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0f17",
        panel: "#111826",
        stroke: "#1f2837",
        accent: "#00e5ff",
        accent2: "#38bdf8"
      },
      fontFamily: {
        ui: ['ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Inter', 'Arial', 'sans-serif']
      }
    }
  },
  plugins: []
}
