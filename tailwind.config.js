/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#05060a',
          900: '#0a0c14',
          800: '#11141f',
          700: '#1a1e2c',
          600: '#272c3f',
          500: '#3a4055',
          400: '#5b6278',
          300: '#8b91a6',
          200: '#b9bdce',
          100: '#dde0ec',
        },
        blood: {
          900: '#3a0808',
          800: '#560f0f',
          700: '#7a1818',
          600: '#a02222',
          500: '#c93838',
          400: '#e35a5a',
          300: '#f08484',
        },
        toxic: {
          900: '#0a1f1a',
          800: '#0f2e26',
          700: '#16433a',
          600: '#1f5c50',
          500: '#2c7d6c',
          400: '#48a896',
          300: '#7fd0bf',
        },
        amber: {
          900: '#1a1407',
          800: '#2a200a',
          700: '#3f3010',
          600: '#5a4416',
          500: '#7a5c1f',
          400: '#a07c2c',
          300: '#c9a04a',
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 1.2s ease-out forwards',
        'fade-up': 'fadeUp 1s ease-out forwards',
        'flicker': 'flicker 4s linear infinite',
        'pulse-slow': 'pulseSlow 6s ease-in-out infinite',
        'drift': 'drift 18s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '8%': { opacity: '0.65' },
          '9%': { opacity: '1' },
          '20%': { opacity: '0.85' },
          '21%': { opacity: '1' },
          '50%': { opacity: '0.95' },
          '51%': { opacity: '0.7' },
          '52%': { opacity: '1' },
        },
        pulseSlow: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.9' },
        },
        drift: {
          '0%': { transform: 'translateY(0) translateX(0)' },
          '50%': { transform: 'translateY(-20px) translateX(10px)' },
          '100%': { transform: 'translateY(0) translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}
