"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type User = {
  id: number;
  username: string;
  email: string;
  role: string;
  groups: string[];
  is_active: boolean;
  is_staff: boolean;
  date_joined: string;
  last_login: string | null;
};

async function getCSRFToken(): Promise<string> {
  try {
    const res = await fetch("/v1/auth/csrf/", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      return data.csrfToken || "";
    }
  } catch {
    // Ignore
  }
  return "";
}

export default function EditorUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Create user form
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "writer",
    display_name: "",
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch("/v1/auth/admin/users/", {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("Not authorized. Publisher role required.");
        }
        if (res.status === 401) {
          throw new Error("Not authenticated. Please log in.");
        }
        throw new Error("Failed to fetch users");
      }
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    try {
      const csrfToken = await getCSRFToken();
      const res = await fetch("/v1/auth/admin/users/create/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        body: JSON.stringify(createForm),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || JSON.stringify(data));
      }

      setShowCreate(false);
      setCreateForm({
        username: "",
        email: "",
        password: "",
        role: "writer",
        display_name: "",
      });
      fetchUsers();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setCreating(false);
    }
  }

  async function updateUserRole(userId: number, role: string) {
    try {
      const csrfToken = await getCSRFToken();
      const res = await fetch(`/v1/auth/admin/users/${userId}/`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        body: JSON.stringify({ role }),
      });

      if (!res.ok) {
        throw new Error("Failed to update role");
      }

      fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update");
    }
  }

  async function toggleUserActive(userId: number, isActive: boolean) {
    try {
      const csrfToken = await getCSRFToken();
      const res = await fetch(`/v1/auth/admin/users/${userId}/`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        body: JSON.stringify({ is_active: isActive }),
      });

      if (!res.ok) {
        throw new Error("Failed to update status");
      }

      fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update");
    }
  }

  const roleColors: Record<string, string> = {
    admin: "bg-purple-100 text-purple-800",
    publisher: "bg-blue-100 text-blue-800",
    editor: "bg-green-100 text-green-800",
    writer: "bg-yellow-100 text-yellow-800",
    reader: "bg-zinc-100 text-zinc-800",
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">User Management</h1>
            <p className="mt-2 text-zinc-600">Manage staff accounts and roles (Publisher only)</p>
          </div>

          <nav className="flex items-center gap-4 text-sm">
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-white font-medium hover:bg-zinc-800 transition-colors"
            >
              + Create User
            </button>
            <Link className="text-zinc-700 hover:underline" href="/editor">
              Editor
            </Link>
          </nav>
        </div>
      </header>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
          <div className="mt-3">
            <Link href="/login" className="font-medium underline">
              Go to Login
            </Link>
          </div>
        </div>
      ) : loading ? (
        <div className="text-center py-12 text-zinc-500">Loading users...</div>
      ) : (
        <div className="rounded-xl border border-zinc-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-zinc-700">User</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-700">Role</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-700">Status</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-700">Joined</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-900">{user.username}</div>
                    <div className="text-zinc-500">{user.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${roleColors[user.role] || roleColors.reader}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.is_active ? (
                      <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Disabled
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {new Date(user.date_joined).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={user.role}
                        onChange={(e) => updateUserRole(user.id, e.target.value)}
                        className="text-xs border border-zinc-300 rounded px-2 py-1"
                      >
                        <option value="reader">Reader</option>
                        <option value="writer">Writer</option>
                        <option value="editor">Editor</option>
                        <option value="publisher">Publisher</option>
                      </select>
                      <button
                        onClick={() => toggleUserActive(user.id, !user.is_active)}
                        className={`text-xs px-2 py-1 rounded ${
                          user.is_active
                            ? "bg-red-100 text-red-700 hover:bg-red-200"
                            : "bg-green-100 text-green-700 hover:bg-green-200"
                        }`}
                      >
                        {user.is_active ? "Disable" : "Enable"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create User Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h2 className="text-xl font-semibold mb-4">Create Staff Account</h2>
            
            {createError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700">Username</label>
                <input
                  type="text"
                  value={createForm.username}
                  onChange={(e) => setCreateForm((f) => ({ ...f, username: e.target.value }))}
                  required
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700">Email</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                  required
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700">Password</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                  required
                  minLength={8}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700">Display Name</label>
                <input
                  type="text"
                  value={createForm.display_name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, display_name: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700">Role</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900"
                >
                  <option value="writer">Writer</option>
                  <option value="editor">Editor</option>
                  <option value="publisher">Publisher</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-white font-medium hover:bg-zinc-800 disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Account"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-zinc-600 hover:text-zinc-900"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Hierarchy Info */}
      <section className="mt-8 rounded-xl border border-blue-100 bg-blue-50 p-5">
        <h3 className="font-medium text-blue-900 mb-3">Role Hierarchy</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div>
            <strong>Reader:</strong> Can read articles, save favorites, follow topics
          </div>
          <div>
            <strong>Writer:</strong> Can create and edit draft articles
          </div>
          <div>
            <strong>Editor:</strong> Can review and approve articles, upload media
          </div>
          <div>
            <strong>Publisher:</strong> Can publish articles, manage users, curate homepage
          </div>
        </div>
      </section>
    </main>
  );
}
