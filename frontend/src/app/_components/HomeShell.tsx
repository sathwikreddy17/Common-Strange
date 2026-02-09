"use client";

import { useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
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
  const { user } = useAuth();

  // Map AuthProvider's User type to the Header's UserData type
  const userData: UserData | null = user
    ? {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        role: user.role,
        is_staff: user.is_staff,
      }
    : null;

  return (
    <div className="min-h-screen bg-white">
      <Header
        onMenuOpen={() => setMenuOpen(true)}
        onSearchOpen={() => setSearchOpen(true)}
        user={userData}
      />
      <MobileMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} user={userData} />
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {children}
    </div>
  );
}
