import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    borderRadius: {
      none: '0px',
      xs: '0px',
      sm: '0px',
      DEFAULT: '0px',
      md: '0px',
      lg: '0px',
      xl: '0px',
      '2xl': '0px',
      '3xl': '0px',
      full: '0px',
    },
    extend: {
      colors: {
        background: '#05070b',
        card: '#0b111a',
        border: '#1b2638',
        accent: '#1274de',
        accentSoft: '#4ea1ff',
        muted: '#9aa4b2',
      },
      boxShadow: {
        soft: '0 10px 40px rgba(0,0,0,0.28)',
      },
      backgroundImage: {
        grid: 'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
      },
      backgroundSize: {
        grid: '24px 24px',
      },
    },
  },
  plugins: [],
}

export default config
