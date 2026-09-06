/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        saffron: {
          50: '#fff8ed',
          100: '#ffefd3',
          200: '#ffdba5',
          300: '#ffc06d',
          400: '#ff9a32',
          500: '#ff7e0b',
          600: '#f06100',
          700: '#c74800',
          800: '#9e3904',
          900: '#7f3008',
        },
        forest: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        ink: {
          50: '#f6f7f9',
          100: '#ebeef3',
          200: '#d3d9e3',
          300: '#aab4c6',
          400: '#7c8aa6',
          500: '#57678a',
          600: '#435071',
          700: '#363f5b',
          800: '#262c40',
          900: '#1a1e2c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
