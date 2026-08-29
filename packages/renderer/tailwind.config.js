/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--taskjian-background)',
        foreground: 'var(--taskjian-foreground)',
        card: 'var(--taskjian-card)',
        'card-foreground': 'var(--taskjian-card-foreground)',
        popover: 'var(--taskjian-popover)',
        'popover-foreground': 'var(--taskjian-popover-foreground)',
        primary: 'var(--taskjian-primary)',
        'primary-foreground': 'var(--taskjian-primary-foreground)',
        muted: 'var(--taskjian-muted)',
        'muted-foreground': 'var(--taskjian-muted-foreground)',
        border: 'var(--taskjian-border)',
        input: 'var(--taskjian-input)',
        ring: 'var(--taskjian-ring)',
      },
      borderRadius: {
        sm: 'var(--taskjian-radius-small)',
        md: 'var(--taskjian-radius-medium)',
        lg: 'var(--taskjian-radius-large)',
      },
      boxShadow: {
        1: 'var(--taskjian-shadow-1)',
        2: 'var(--taskjian-shadow-2)',
        3: 'var(--taskjian-shadow-3)',
      },
      fontFamily: {
        sans: 'var(--taskjian-font-sans)',
        mono: 'var(--taskjian-font-mono)',
      },
    },
  },
  plugins: [],
};
