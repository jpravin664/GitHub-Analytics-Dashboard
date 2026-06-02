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
      }
    }
  },
  plugins: []
};
