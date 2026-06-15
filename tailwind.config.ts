import type { Config } from 'tailwindcss'

const color = (variable: string) => `rgb(var(${variable}) / <alpha-value>)`

const config: Config = {
  content: ['./src/**/*.{ts,tsx,js,jsx}'],
  darkMode: ['class', '[data-theme="modern"]'],
  theme: {
    extend: {
      colors: {
        primary: color('--color-primary'),
        'primary-hover': color('--color-primary-hover'),
        background: color('--color-background'),
        foreground: color('--color-foreground'),
        surface: color('--color-surface'),
        'surface-raised': color('--color-surface-raised'),
        'surface-high': color('--color-surface-high'),
        muted: color('--color-muted'),
        border: color('--color-border'),
        ink: color('--color-ink'),
        input: color('--color-input'),
        success: color('--color-success'),
        error: color('--color-error'),
        ember: {
          50: color('--color-primary-softest'),
          100: color('--color-primary-soft'),
          200: color('--color-primary-muted'),
          300: color('--color-primary-light'),
          400: color('--color-primary'),
          500: color('--color-primary'),
          600: color('--color-primary-strong'),
          700: color('--color-primary-deep'),
          800: color('--color-primary-deeper'),
          900: color('--color-primary-darkest'),
        },
        obsidian: {
          DEFAULT: color('--color-background'),
          50: color('--color-foreground'),
          100: color('--color-foreground-soft'),
          200: color('--color-muted-light'),
          300: color('--color-muted'),
          400: color('--color-muted-dark'),
          500: color('--color-surface-high'),
          600: color('--color-surface-raised'),
          700: color('--color-surface'),
          800: color('--color-background-soft'),
          900: color('--color-background'),
        },
      },
      fontFamily: {
        display: ['var(--font-display)'],
        sans: ['var(--font-body)'],
        mono: ['var(--font-label)'],
      },
      borderRadius: {
        DEFAULT: 'var(--radius-control)',
        sm: 'var(--radius-control)',
        md: 'var(--radius-control)',
        lg: 'var(--radius-control)',
        xl: 'var(--radius-card)',
        '2xl': 'var(--radius-card)',
        full: 'var(--radius-pill)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        button: 'var(--shadow-button)',
        floating: 'var(--shadow-floating)',
      },
    },
  },
  plugins: [],
}

export default config
