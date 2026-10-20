/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './popup.html',
    './devtools.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          500: '#10b981',
          600: '#059669',
          900: '#064e3b',
        },
      },
    },
  },
  plugins: [],
};
