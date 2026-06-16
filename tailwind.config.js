/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#29ab00',
          'green-dark': '#1e8200',
          'green-light': '#34d400',
        },
        warning: '#FFC20A',
        severe: '#DC2626',
        surface: {
          50: '#f8faf8',
          100: '#f0f4f0',
          200: '#e2e8e2',
          700: '#2d3a2d',
          800: '#1e281e',
          900: '#141c14',
          950: '#0a100a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
