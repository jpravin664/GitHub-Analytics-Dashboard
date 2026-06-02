/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        gh: {
          dark: '#0d1117',
          card: '#161b22',
          border: '#30363d',
          accent: '#58a6ff',
          green: '#3fb950',
          orange: '#d29922',
          purple: '#bc8cff',
          red: '#f85149',
          muted: '#8b949e',
          text: '#e6edf3',
        }
      },
      // 👇 Add this block to increase font sizes
      fontSize: {
        'xs': ['0.995rem', { lineHeight: '1.25rem' }],   // was 0.75rem
        'sm': ['1.1rem', { lineHeight: '1.5rem' }],        // was 0.875rem
        'base': ['1.125rem', { lineHeight: '1.75rem' }], // was 1rem
        'lg': ['1.35rem', { lineHeight: '1.75rem' }],    // was 1.125rem
        'xl': ['1.6rem', { lineHeight: '2rem' }],        // was 1.25rem
        '2xl': ['1.975rem', { lineHeight: '2.25rem' }],  // was 1.5rem
        // You can also scale larger sizes similarly
      }
    }
  },
  plugins: []
};