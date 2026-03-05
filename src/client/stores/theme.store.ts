import { create } from "zustand";

type Theme = "light" | "dark" | "system";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", isDark);
  } else {
    root.classList.toggle("dark", theme === "dark");
  }
}

export const useThemeStore = create<ThemeState>((set) => {
  const stored = (localStorage.getItem("theme") as Theme) || "system";
  applyTheme(stored);

  return {
    theme: stored,
    setTheme: (theme) => {
      localStorage.setItem("theme", theme);
      applyTheme(theme);
      set({ theme });
    },
  };
});
