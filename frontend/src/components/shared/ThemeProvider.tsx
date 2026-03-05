"use client";

import { useEffect } from "react";
import { useAppStore } from "@/stores/appStore";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  // On mount: read saved preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("kuaicha-theme") as "dark" | "light" | null;
    if (saved && saved !== theme) {
      setTheme(saved);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync theme class to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  return <>{children}</>;
}
