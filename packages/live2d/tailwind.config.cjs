/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,vue,js,ts,jsx,tsx}"],
  theme: {},
  darkMode: ["class"],
  plugins: [require("@formkit/themes/tailwindcss")],
};