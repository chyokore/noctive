/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#070A11',
          900: '#0B0F19',
          850: '#0F1626',
          800: '#151D30',
          700: '#1E2942',
          600: '#2A3A5C',
        },
        electric: {
          500: '#3B82F6',
          400: '#60A5FA',
          600: '#2563EB',
          glow: 'rgba(59, 130, 246, 0.15)',
        },
        noctive: {
          approved: '#10B981',
          approvedBg: 'rgba(16, 185, 129, 0.1)',
          warning: '#F59E0B',
          warningBg: 'rgba(245, 158, 11, 0.1)',
          blocked: '#F43F5E',
          blockedBg: 'rgba(244, 63, 94, 0.1)',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
