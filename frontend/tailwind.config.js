/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#f8f4ec',
        line: '#8f9aa7',
        ink: '#111827',
        safety: '#ef7d22',
        safetyDark: '#c75d0c',
        softBlue: '#cfe0f1',
      },
      boxShadow: {
        sheet: '0 20px 60px rgba(15, 23, 42, 0.12)',
      },
      fontFamily: {
        display: ['"Trebuchet MS"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
