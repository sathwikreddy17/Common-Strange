"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Header, type UserData } from "./Header";
import { MobileMenu } from "./MobileMenu";
import { SearchOverlay } from "./SearchOverlay";

/**
 * Client shell for the homepage. Provides interactive elements
 * (header with menu/search toggles, mobile menu overlay, search overlay)
 * while all heavy content is rendered server-side and passed as children.
 */
export function HomeShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    // Fetch current user client-side (cookie-based auth)
    fetch("/v1/auth/me/", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null));
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Header
        onMenuOpen={() => setMenuOpen(true)}
        onSearchOpen={() => setSearchOpen(true)}
        user={user}
      />
      <MobileMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} user={user} />
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {children}
    </div>
  );
}
