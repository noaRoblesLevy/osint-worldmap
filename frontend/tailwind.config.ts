import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        palantir: {
          bg: '#0a0e17',
          panel: '#111827',
          border: '#1e293b',
          accent: '#3b82f6',
          accent2: '#06b6d4',
          danger: '#ef4444',
          warning: '#f59e0b',
          success: '#22c55e',
          text: '#e2e8f0',
          muted: '#64748b',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
