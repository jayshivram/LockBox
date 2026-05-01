/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Sora', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        vault: {
          bg: '#070B14',
          surface: '#0D1321',
          card: '#111827',
          border: '#1F2937',
          accent: '#F0B429',
          'accent-dim': '#D4931A',
          gold: '#F0B429',
          'gold-muted': '#B8860B',
          text: '#E8EDF5',
          muted: '#6B7280',
          danger: '#EF4444',
          success: '#22C55E',
          warning: '#F59E0B',
          info: '#3B82F6',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s infinite',
        'spin-slow': 'spin 8s linear infinite',
        'totp-tick': 'totpTick 1s linear',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        totpTick: {
          '0%': { strokeDashoffset: '0' },
          '100%': { strokeDashoffset: '100' },
        },
      },
    },
  },
  plugins: [],
}
