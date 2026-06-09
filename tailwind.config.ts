import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx,js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ember: {
          50:  '#fdf3ec',
          100: '#f9ddc7',
          200: '#f3bb8a',
          300: '#eb924d',
          400: '#e07020',
          500: '#c2621a',
          600: '#9e4e12',
          700: '#7a3b0d',
          800: '#562808',
          900: '#321703',
        },
        obsidian: {
          DEFAULT: '#120D07',
          50:  '#f5f0ea',
          100: '#e8ddd2',
          200: '#c9b8a4',
          300: '#a89279',
          400: '#876d54',
          500: '#664e37',
          600: '#4a3525',
          700: '#2e1f14',
          800: '#1a110a',
          900: '#120D07',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
