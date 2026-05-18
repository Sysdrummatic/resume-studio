import { colors } from "./app/styles/colors";

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: colors.brand,
        dark: colors.dark,
        light: colors.light,
        semantic: colors.semantic,
      },
      textColor: {
        app: colors.text.darkApp,
        doc: colors.text.lightDoc,
      },
      borderRadius: {
        'button': '12px',
        'bento': '16px',
        'card': '20px',
      },
      boxShadow: {
        'glass': '0 16px 34px rgba(0,0,0,0.28)',
      }
    },
  },
  plugins: [],
};
