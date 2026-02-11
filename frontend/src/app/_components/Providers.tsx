"use client";

import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import type { ReactNode } from "react";

/**
 * Client-side providers wrapped around the entire app.
 * This is the single place to add context providers (auth, theme, etc.).
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}
