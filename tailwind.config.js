/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      animation: {
        flip: 'flip 0.6s ease-in-out'
      },
      keyframes: {
        flip: {
          '0%':   { transform: 'rotateY(0deg)',  opacity: '0' },
          '50%':  { transform: 'rotateY(90deg)', opacity: '0.5' },
          '100%': { transform: 'rotateY(0deg)',  opacity: '1' }
        }
      }
    }
  },
  plugins: []
}
