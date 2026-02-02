module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#ff6600',
          25: '#fff5f0',
          50: '#ffede0',
          100: '#ffd6b8',
          200: '#ffb882',
          300: '#ff944d',
          400: '#ff7a26',
          500: '#ff6600',
          600: '#e65c00',
          700: '#cc5200',
          800: '#b34700',
          900: '#993d00',
        },
        'background-light': '#f9fafb',
        'background-dark': '#0f172a',
        'surface-light': '#ffffff',
        'surface-dark': '#1e293b',
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        warning: {
          50: '#fefce8',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
        info: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
        },
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        serif: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'feature': '0 10px 40px -10px rgba(0, 0, 0, 0.1)',
        'card': '0 2px 8px -2px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 8px 24px -4px rgba(0, 0, 0, 0.12)',
      },
      transitionDuration: {
        '250': '250ms',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
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
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      spacing: {
        '4.5': '1.125rem',
        '5.5': '1.375rem',
        '7.5': '1.875rem',
        '15': '3.75rem',
        '18': '4.5rem',
        '22': '5.5rem',
      },
    },
  },
  plugins: [],
};
