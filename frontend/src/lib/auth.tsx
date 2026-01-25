"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";

export type User = {
  id: number;
  username: string;
  email: string;
  display_name: string;
  role: "reader" | "writer" | "editor" | "publisher" | "admin";
  is_staff: boolean;
  date_joined: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
};

type RegisterData = {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
  display_name?: string;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

async function getCSRFToken(): Promise<string> {
  try {
    const res = await fetch("/v1/auth/csrf/", {
      credentials: "include",
    });
    if (res.ok) {
      const data = await res.json();
      return data.csrfToken || "";
    }
  } catch {
    // Ignore
  }
  return "";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/v1/auth/me/", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user || null);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (username: string, password: string) => {
    const csrfToken = await getCSRFToken();
    try {
      const res = await fetch("/v1/auth/login/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, error: data.detail || "Login failed" };
      }
    } catch {
      return { success: false, error: "Network error" };
    }
  };

  const logout = async () => {
    const csrfToken = await getCSRFToken();
    try {
      await fetch("/v1/auth/logout/", {
        method: "POST",
        credentials: "include",
        headers: {
          "X-CSRFToken": csrfToken,
        },
      });
    } catch {
      // Ignore
    }
    setUser(null);
  };

  const register = async (data: RegisterData) => {
    const csrfToken = await getCSRFToken();
    try {
      const res = await fetch("/v1/auth/register/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        body: JSON.stringify(data),
      });

      const responseData = await res.json();

      if (res.ok) {
        setUser(responseData.user);
        return { success: true };
      } else {
        // Format validation errors
        const errors = Object.entries(responseData)
          .map(([key, value]) => {
            if (Array.isArray(value)) {
              return `${key}: ${value.join(", ")}`;
            }
            return `${key}: ${value}`;
          })
          .join("; ");
        return { success: false, error: errors || "Registration failed" };
      }
    } catch {
      return { success: false, error: "Network error" };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
