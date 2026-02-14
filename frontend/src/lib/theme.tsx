"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function getSystemPreference(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }): React.JSX.Element {
  // Lazy initializer: read persisted theme synchronously to avoid a
  // flash-of-wrong-theme and the lint warning about calling setState inside
  // an effect.
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    const stored = localStorage.getItem("cs-theme") as Theme | null;
    return stored && ["light", "dark", "system"].includes(stored) ? stored : "system";
  });

  // Track system preference as state so we can react to changes without
  // calling setState inside an effect body (which violates
  // react-hooks/set-state-in-effect).
  const [systemPref, setSystemPref] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    return getSystemPreference();
  });

  // Listen for OS-level colour-scheme changes and update `systemPref`.
  // The setState call is inside the *event handler*, not the effect body,
  // so it satisfies the lint rule.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      setSystemPref(e.matches ? "dark" : "light");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Derive resolvedTheme synchronously — no separate state needed.
  const resolvedTheme: "light" | "dark" =
    theme === "system" ? systemPref : theme;

  // Apply the resolved theme to the DOM.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme);
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem("cs-theme", t);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
