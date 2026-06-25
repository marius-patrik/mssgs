/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        whatsapp: '#25D366',
        telegram: '#0088cc',
        instagram: '#E4405F',
        imessage: '#34C759',
      },
    },
  },
  plugins: [],
};
