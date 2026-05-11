"use client";

import { useEffect, useState } from "react";

import { Theme, applyTheme, getStoredTheme, setStoredTheme } from "../lib/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(getStoredTheme());
    setMounted(true);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => {
      if (getStoredTheme() === "system") applyTheme("system");
    };
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  function update(next: Theme) {
    setTheme(next);
    setStoredTheme(next);
  }

  if (!mounted) return null;

  return (
    <div className="inline-flex overflow-hidden rounded border border-slate-300 text-xs dark:border-slate-600">
      {(["light", "system", "dark"] as Theme[]).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => update(t)}
          className={`px-2 py-1 ${
            theme === t
              ? "bg-slate-200 dark:bg-slate-700"
              : "hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          {t === "light" ? "☀" : t === "dark" ? "☾" : "auto"}
        </button>
      ))}
    </div>
  );
}
