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
        accent:        "#4F46E5",
        "accent-hover":"#4338CA",
        "accent-light":"#818CF8",
        success:       "#10B981",
        danger:        "#EF4444",
        warning:       "#F59E0B",
        muted:         "var(--muted)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
