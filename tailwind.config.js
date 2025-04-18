/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        'fira-code': ['Fira Code', 'monospace'],
      },
      colors: {
        'gray-800': '#1f2937',
        'gray-300': '#d1d5db',
        'blue-400': '#60a5fa',
        'blue-600': '#2563eb',
        'blue-700': '#1d4ed8',
        'green-600': '#16a34a',
        'green-700': '#15803d',
        'yellow-500': '#eab308',
      },
    },
  },
  plugins: [],
};