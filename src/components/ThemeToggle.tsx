"use client";

import { useTheme } from "@/providers/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      aria-label="Cambiar tema"
      className="p-2 rounded-lg border border-border bg-surface-alt hover:border-accent transition-colors text-base leading-none select-none"
      title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
