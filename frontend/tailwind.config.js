/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        daluzed: {
          bg: '#FDF8ED',
          dark: '#432A2B',
          pink: '#F3D9DD',
          red: '#EB6073',
        }
      },
      fontFamily: {
        crushed: ['Crushed', 'sans-serif'],
        montserrat: ['Montserrat', 'sans-serif'],
      }
    },
  },
  plugins: [],
}