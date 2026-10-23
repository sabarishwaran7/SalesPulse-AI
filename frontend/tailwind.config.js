/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          light: '#fbfaf6',
          DEFAULT: '#f5f4ee',
          warm: '#f2eee3',
        },
        sunshine: {
          400: '#fdd867',
          500: '#fbc743',
          600: '#f5b525',
        },
        darkpill: {
          DEFAULT: '#1c1d22',
          card: '#19191d',
          hover: '#282930',
        },
        cardborder: '#ece8db',
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Outfit', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', '"Plus Jakarta Sans"', 'sans-serif'],
      },
      borderRadius: {
        '2.5xl': '20px',
        '3xl': '24px',
        '4xl': '30px',
      }
    },
  },
  plugins: [],
}
