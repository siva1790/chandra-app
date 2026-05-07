/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        chandra: {
          // ── Backgrounds ──────────────────────────────────
          'bg-primary':    '#0B1020',  // Main app background
          'bg-surface':    '#151B2F',  // Cards, sheets
          'bg-elevated':   '#1D2440',  // Hover states, elevated cards

          // ── Brand ────────────────────────────────────────
          'gold':          '#DDBB6A',  // Primary CTA bg — dark text 10.5:1 ✅
          'gold-hover':    '#E8C87A',
          'gold-active':   '#C9A85A',
          'indigo-cta':    '#3D4ECC',  // Secondary CTA bg — white text 6.3:1 ✅
          'indigo-hover':  '#4A5BD6',
          'indigo-active': '#3040B8',
          'indigo-deco':   '#5B6CFF',  // Decorative only — NOT button bg
          'focus':         '#8EA8FF',  // Focus ring — 8.5:1 on bg-primary ✅

          // ── Text ─────────────────────────────────────────
          'text-primary':   '#F5F7FA',  // 18.4:1 on bg-primary ✅
          'text-secondary': '#B5BDD1',  // 10.4:1 on bg-primary ✅
          'text-disabled':  '#70778B',  // Disabled states ONLY (exempt from AA)
          'text-inverse':   '#0B1020',  // Dark text on gold/light backgrounds

          // ── Semantic ─────────────────────────────────────
          'success': '#4FAF7C',  // 7.1:1 on bg-primary ✅
          'warning': '#D99036',  // 7.5:1 on bg-primary ✅
          'error':   '#D45C5C',  // 5.1:1 on bg-primary ✅
        },
      },
    },
  },
  plugins: [],
}
