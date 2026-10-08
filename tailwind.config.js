/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tac: {
          ink: {
            900: '#171717',
            800: '#212329',
            700: '#2A2B44',
            600: '#3A3C58',
            500: '#565873',
            400: '#7C7E93',
            300: '#A9AAB8',
          },
          gold: {
            950: '#2B1D07',
            900: '#8A5C12',
            800: '#AA721A',
            700: '#AD8D40',
            600: '#C09A4E',
            500: '#CAAE74',
            400: '#DCC79B',
            300: '#EFE3CA',
          },
          stone: {
            100: '#FFFFFF',
            200: '#F7F5F3',
            300: '#EBE7E3',
            400: '#D3CDC6',
            500: '#B6AEA5',
            600: '#8C837A',
          },
          circuit: {
            cyan: '#38B6FF',
            blue: '#1B3A8C',
            magenta: '#F045C8',
            violet: '#5B2B8E',
          },
        }
      },
      fontFamily: {
        display: ['Montserrat', 'Helvetica', 'Arial', 'sans-serif'],
        body: ['Open Sans', 'Segoe UI', 'Helvetica', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        'xs': '2px',
        'sm': '4px',
        'md': '6px',
        'lg': '10px',
      },
      boxShadow: {
        'tac-xs': '0 1px 2px rgba(23,23,23,.06)',
        'tac-sm': '0 2px 6px rgba(23,23,23,.08)',
        'tac-md': '0 6px 18px rgba(23,23,23,.10)',
        'tac-lg': '0 16px 40px rgba(23,23,23,.14)',
        'tac-gold': '0 6px 20px rgba(170,114,26,.28)',
      }
    },
  },
  plugins: [],
}
