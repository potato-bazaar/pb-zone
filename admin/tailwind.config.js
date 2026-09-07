/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        uber: {
          black: '#000000',
          dark: '#141414',
          grayDark: '#333333',
          grayMid: '#545454',
          grayLight: '#6B6B6B',
          border: '#E2E2E2',
          borderLight: '#EEEEEE',
          bg: '#F6F6F6',
          white: '#FFFFFF',
          green: '#0E8345',
          greenBg: '#EBF7EE',
          red: '#C62828',
          redBg: '#FCEBEB',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
