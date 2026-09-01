/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontSize: {
        'xs': 'clamp(0.7rem, 0.15vw + 0.65rem, 0.75rem)',
        'sm': 'clamp(0.8rem, 0.17vw + 0.76rem, 0.875rem)',
        'base': 'clamp(1rem, 0.34vw + 0.91rem, 1.125rem)',
        'lg': 'clamp(1.125rem, 0.54vw + 0.98rem, 1.25rem)',
        'xl': 'clamp(1.25rem, 0.8vw + 1.05rem, 1.5rem)',
        '2xl': 'clamp(1.5rem, 1.2vw + 1.2rem, 1.875rem)',
        '3xl': 'clamp(1.875rem, 1.8vw + 1.4rem, 2.25rem)',
        '4xl': 'clamp(2.25rem, 2.5vw + 1.6rem, 3rem)',
        '5xl': 'clamp(3rem, 3.5vw + 2rem, 4rem)',
        '6xl': 'clamp(3.75rem, 5vw + 2.5rem, 5.5rem)',
        '7xl': 'clamp(4.5rem, 7vw + 3rem, 7rem)',
        '8xl': 'clamp(6rem, 10vw + 4rem, 9rem)',
        '9xl': 'clamp(8rem, 12vw + 5rem, 11rem)',
      },
      colors: {
        glow: '#00f3ff',
        dark: '#0a0a0f',
        glass: 'rgba(255, 255, 255, 0.05)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: 1, boxShadow: '0 0 15px rgba(0, 243, 255, 0.2)' },
          '50%': { opacity: .5, boxShadow: '0 0 30px rgba(0, 243, 255, 0.6)' },
        },
        bounce: {
          '0%, 100%': { 
            transform: 'translateY(-15%)',
            animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)'
          },
          '50%': { 
            transform: 'translateY(0)',
            animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)'
          }
        }
      }
    },
  },
  plugins: [],
}
