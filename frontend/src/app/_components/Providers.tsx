"use client";

import { AuthProvider } from "@/lib/auth";
import type { ReactNode } from "react";

/**
 * Client-side providers wrapped around the entire app.
 * This is the single place to add context providers (auth, theme, etc.).
 */
export function Providers({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
