import type { Config } from 'tailwindcss';
import themePreset from '@edro/theme/tailwind-preset';

const config: Config = {
  presets: [themePreset],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/shared/src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/dist/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#9f86e3',
        'primary-dark': '#7b61c4',
        secondary: '#3d0a6e',
        'background-light': '#fdfaff',
        'background-dark': '#1a1025',
        'surface-light': '#ffffff',
        'surface-dark': '#2a1f36',
      },
      fontFamily: {
        display: ['Lexend', 'sans-serif'],
        sora: ['Sora', 'sans-serif'],
        body: ['Manrope', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 4px 20px -2px rgba(61, 10, 110, 0.05)',
        glow: '0 0 15px rgba(159, 134, 227, 0.4)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
