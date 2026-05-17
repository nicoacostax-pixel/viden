/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // CSS-variable driven — swap between light/dark via ThemeProvider
        background:    "var(--background)",
        surface:       "var(--surface)",
        "surface-alt": "var(--surface-alt)",
        border:        "var(--border)",
        foreground:    "var(--foreground)",
        // Fixed — same in both modes (opacity modifiers like /10 need hex)
        accent:        "#3D8A56",
        "accent-hover":"#2E6E42",
        "accent-light":"#5CB87A",
        success:       "#2EA855",
        danger:        "#EF4444",
        warning:       "#D97706",
        muted:         "var(--muted)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
