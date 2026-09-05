/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--canvas)',
        surfaceInset: 'var(--surface-inset)',
        surfaceSubtle: 'var(--surface-subtle)',
        textPrimary: 'var(--text-primary)',
        textSecondary: 'var(--text-secondary)',
        divider: 'var(--divider)',
        borderControl: 'var(--border-control)',
        sidebarBg: 'var(--sidebar-bg)',
        sidebarRowActive: 'var(--sidebar-row-active)',
        sidebarText: 'var(--sidebar-text)',
        sidebarTextMuted: 'var(--sidebar-text-muted)',
        btnPrimary: 'var(--btn-primary)',
        btnPrimaryHover: 'var(--btn-primary-hover)',
        dangerText: 'var(--danger-text)',
        dangerBg: 'var(--danger-bg)',
        warningText: 'var(--warning-text)',
        warningBg: 'var(--warning-bg)',
        sidebarCrit: 'var(--sidebar-status-crit)',
        sidebarWarn: 'var(--sidebar-status-warn)',
        sidebarNorm: 'var(--sidebar-status-norm)',
      },
      fontFamily: {
        sans: ['"Source Sans 3"', '"Segoe UI"', 'sans-serif'],
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
