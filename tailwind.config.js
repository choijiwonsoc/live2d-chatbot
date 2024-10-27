// tailwind.config.js

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bengkod: "#03026B",
      },
      fontFamily: {
        sniglet: ["Sniglet", "system-ui"],
      },
    },
  },
  plugins: [],
};
