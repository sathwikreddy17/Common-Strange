"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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

type PageMeta = {
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

async function getCSRFToken(): Promise<string> {
  try {
    const res = await fetch("/v1/auth/csrf/", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      return data.csrfToken || "";
    }
  } catch {
    /* ignore */
  }
  return "";
}

const ROLE_META: Record<string, { label: string; color: string; darkColor: string; bg: string; darkBg: string; icon: string }> = {
  publisher: {
    label: "Publisher",
    color: "text-blue-700",
    darkColor: "dark:text-blue-300",
    bg: "bg-blue-50 border-blue-200",
    darkBg: "dark:bg-blue-950/40 dark:border-blue-800",
    icon: "👑",
  },
  editor: {
    label: "Editor",
    color: "text-emerald-700",
    darkColor: "dark:text-emerald-300",
    bg: "bg-emerald-50 border-emerald-200",
    darkBg: "dark:bg-emerald-950/40 dark:border-emerald-800",
    icon: "✏️",
  },
  writer: {
    label: "Writer",
    color: "text-amber-700",
    darkColor: "dark:text-amber-300",
    bg: "bg-amber-50 border-amber-200",
    darkBg: "dark:bg-amber-950/40 dark:border-amber-800",
    icon: "📝",
  },
  reader: {
    label: "Reader",
    color: "text-zinc-600",
    darkColor: "dark:text-zinc-400",
    bg: "bg-zinc-50 border-zinc-200",
    darkBg: "dark:bg-zinc-800/60 dark:border-zinc-700",
    icon: "📖",
  },
};

const BADGE_COLORS: Record<string, string> = {
  publisher: "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200",
  editor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200",
  writer: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200",
  reader: "bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300",
  admin: "bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200",
};

const PAGE_SIZE = 25;

/* ------------------------------------------------------------------ */
/*  Avatar – colourful initial circle                                  */
/* ------------------------------------------------------------------ */
function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const hue = [...name].reduce((h, c) => h + c.charCodeAt(0), 0) % 360;
  return (
    <div
      className="flex-shrink-0 rounded-full flex items-center justify-center font-semibold text-white"
      style={{ width: size, height: size, backgroundColor: `hsl(${hue}, 55%, 55%)`, fontSize: size * 0.42 }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

/* ================================================================== */
/*  Page Component                                                     */
/* ================================================================== */

export default function EditorUsersPage() {
  /* ---------- staff (always fully loaded) ---------- */
  const [staff, setStaff] = useState<User[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);

  /* ---------- readers (paginated) ---------- */
  const [readers, setReaders] = useState<User[]>([]);
  const [readerMeta, setReaderMeta] = useState<PageMeta>({ total: 0, page: 1, page_size: PAGE_SIZE, pages: 1 });
  const [readersLoading, setReadersLoading] = useState(true);
  const [readerSearch, setReaderSearch] = useState("");
  const [readerPage, setReaderPage] = useState(1);

  /* ---------- global ---------- */
  const [error, setError] = useState<string | null>(null);

  /* ---------- create user modal ---------- */
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ username: "", email: "", password: "", role: "writer", display_name: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  /* ---------- debounce ref ---------- */
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---- fetch staff (writer / editor / publisher) ---- */
  const fetchStaff = useCallback(async () => {
    setStaffLoading(true);
    try {
      const res = await fetch("/v1/auth/admin/users/?role=staff&page_size=100", { credentials: "include" });
      if (!res.ok) throw new Error(res.status === 403 ? "Not authorized. Publisher role required." : res.status === 401 ? "Not authenticated. Please log in." : "Failed to fetch staff");
      const data = await res.json();
      setStaff(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load staff");
    } finally {
      setStaffLoading(false);
    }
  }, []);

  /* ---- fetch readers (paginated, searchable) ---- */
  const fetchReaders = useCallback(async (page: number, search: string) => {
    setReadersLoading(true);
    try {
      const params = new URLSearchParams({ role: "reader", page: String(page), page_size: String(PAGE_SIZE) });
      if (search) params.set("search", search);
      const res = await fetch(`/v1/auth/admin/users/?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch readers");
      const data = await res.json();
      setReaders(data.users || []);
      setReaderMeta({ total: data.total, page: data.page, page_size: data.page_size, pages: data.pages });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load readers");
    } finally {
      setReadersLoading(false);
    }
  }, []);

  /* ---- initial load ---- */
  useEffect(() => { fetchStaff(); fetchReaders(1, ""); }, [fetchStaff, fetchReaders]);

  /* ---- reader page change ---- */
  useEffect(() => { fetchReaders(readerPage, readerSearch); }, [readerPage, fetchReaders, readerSearch]);

  /* ---- debounced reader search ---- */
  function handleReaderSearch(value: string) {
    setReaderSearch(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setReaderPage(1);
    }, 350);
  }

  /* ---- mutations ---- */
  async function updateUserRole(userId: number, role: string) {
    try {
      const csrfToken = await getCSRFToken();
      const res = await fetch(`/v1/auth/admin/users/${userId}/`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken }, body: JSON.stringify({ role }) });
      if (!res.ok) throw new Error("Failed to update role");
      fetchStaff();
      fetchReaders(readerPage, readerSearch);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update");
    }
  }

  async function toggleUserActive(userId: number, isActive: boolean) {
    try {
      const csrfToken = await getCSRFToken();
      const res = await fetch(`/v1/auth/admin/users/${userId}/`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken }, body: JSON.stringify({ is_active: isActive }) });
      if (!res.ok) throw new Error("Failed to update status");
      fetchStaff();
      fetchReaders(readerPage, readerSearch);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update");
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const csrfToken = await getCSRFToken();
      const res = await fetch("/v1/auth/admin/users/create/", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken }, body: JSON.stringify(createForm) });
      if (!res.ok) { const data = await res.json(); throw new Error(data.detail || JSON.stringify(data)); }
      setShowCreate(false);
      setCreateForm({ username: "", email: "", password: "", role: "writer", display_name: "" });
      fetchStaff();
      fetchReaders(1, readerSearch);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setCreating(false);
    }
  }

  /* ---- derived counts ---- */
  const staffByRole = { publisher: staff.filter((u) => u.role === "publisher"), editor: staff.filter((u) => u.role === "editor"), writer: staff.filter((u) => u.role === "writer") };

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      {/* ---- Header ---- */}
      <header className="mb-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white">User Management</h1>
            <p className="mt-1 text-zinc-500 dark:text-zinc-400">Manage staff and readers across the platform</p>
          </div>
          <nav className="flex items-center gap-3 text-sm">
            <button onClick={() => setShowCreate(true)} className="rounded-lg bg-zinc-900 dark:bg-white dark:text-zinc-900 px-4 py-2 text-white font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors">+ Create Staff</button>
            <Link className="text-zinc-500 dark:text-zinc-400 hover:underline" href="/editor">Editor</Link>
          </nav>
        </div>
      </header>

      {/* ---- Error state ---- */}
      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-800 dark:text-red-300 mb-8">
          {error}
          <div className="mt-2"><Link href="/login" className="font-medium underline">Go to Login →</Link></div>
        </div>
      )}

      {/* ---- Stats strip ---- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        {[
          { label: "Total Users", value: staff.length + readerMeta.total, icon: "👥" },
          { label: "Staff", value: staff.length, icon: "🛡️" },
          { label: "Readers", value: readerMeta.total, icon: "📖" },
          { label: "Active", value: staff.filter((u) => u.is_active).length + readerMeta.total, icon: "✅" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 p-4 text-center">
            <div className="text-xl mb-1">{s.icon}</div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">{staffLoading ? "…" : s.value}</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ================================================================ */}
      {/*  STAFF SECTION                                                    */}
      {/* ================================================================ */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
          🛡️ Staff Members
          <span className="text-xs font-normal text-zinc-400 dark:text-zinc-500">Writers · Editors · Publishers</span>
        </h2>

        {staffLoading ? (
          <div className="text-center py-8 text-zinc-400 dark:text-zinc-500">Loading staff…</div>
        ) : staff.length === 0 ? (
          <div className="text-center py-8 text-zinc-400 dark:text-zinc-500">No staff members yet. <button onClick={() => setShowCreate(true)} className="underline">Create one</button></div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(["publisher", "editor", "writer"] as const).flatMap((role) =>
              staffByRole[role].map((user) => {
                const meta = ROLE_META[role];
                return (
                  <div key={user.id} className={`rounded-xl border p-4 flex items-start gap-3 ${meta.bg} ${meta.darkBg} transition-colors`}>
                    <Avatar name={user.username} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-900 dark:text-white truncate">{user.username}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${BADGE_COLORS[role]}`}>{meta.icon} {meta.label}</span>
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{user.email}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <select value={user.role} onChange={(e) => updateUserRole(user.id, e.target.value)} className="text-xs border border-zinc-300 dark:border-zinc-600 rounded-md px-2 py-1 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          <option value="reader">Reader</option>
                          <option value="writer">Writer</option>
                          <option value="editor">Editor</option>
                          <option value="publisher">Publisher</option>
                        </select>
                        <button onClick={() => toggleUserActive(user.id, !user.is_active)} className={`text-xs px-2 py-1 rounded-md font-medium transition-colors ${user.is_active ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900/70" : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900/70"}`}>
                          {user.is_active ? "Disable" : "Enable"}
                        </button>
                        {!user.is_active && <span className="text-[10px] text-red-500 font-medium">DISABLED</span>}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </section>

      {/* ================================================================ */}
      {/*  READERS SECTION (paginated + searchable)                        */}
      {/* ================================================================ */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
            📖 Readers
            <span className="text-xs font-normal rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 px-2 py-0.5">{readerMeta.total.toLocaleString()}</span>
          </h2>

          {/* search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            <input
              type="text"
              placeholder="Search by name or email…"
              value={readerSearch}
              onChange={(e) => handleReaderSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 w-64 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-600"
            />
          </div>
        </div>

        {readersLoading ? (
          <div className="text-center py-12 text-zinc-400 dark:text-zinc-500">Loading readers…</div>
        ) : readers.length === 0 ? (
          <div className="text-center py-12 text-zinc-400 dark:text-zinc-500">
            {readerSearch ? `No readers matching "${readerSearch}"` : "No readers yet — they'll appear here when they register."}
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-700">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">User</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Joined</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {readers.map((user) => (
                    <tr key={user.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={user.username} size={32} />
                          <div className="min-w-0">
                            <div className="font-medium text-zinc-900 dark:text-white truncate">{user.username}</div>
                            <div className="text-zinc-400 dark:text-zinc-500 text-xs truncate">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {user.is_active ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" /> Disabled
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 text-xs">
                        {new Date(user.date_joined).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <select value={user.role} onChange={(e) => updateUserRole(user.id, e.target.value)} className="text-xs border border-zinc-300 dark:border-zinc-600 rounded-md px-2 py-1 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                            <option value="reader">Reader</option>
                            <option value="writer">Writer</option>
                            <option value="editor">Editor</option>
                            <option value="publisher">Publisher</option>
                          </select>
                          <button onClick={() => toggleUserActive(user.id, !user.is_active)} className={`text-xs px-2 py-1 rounded-md font-medium transition-colors ${user.is_active ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300" : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300"}`}>
                            {user.is_active ? "Disable" : "Enable"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ---- Pagination ---- */}
            {readerMeta.pages > 1 && (
              <div className="flex items-center justify-between mt-4 text-sm">
                <span className="text-zinc-400 dark:text-zinc-500">
                  Showing {(readerMeta.page - 1) * readerMeta.page_size + 1}–{Math.min(readerMeta.page * readerMeta.page_size, readerMeta.total)} of {readerMeta.total.toLocaleString()}
                </span>
                <div className="flex items-center gap-1">
                  <button disabled={readerMeta.page <= 1} onClick={() => setReaderPage(1)} className="px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title="First page">⟨⟨</button>
                  <button disabled={readerMeta.page <= 1} onClick={() => setReaderPage((p) => p - 1)} className="px-3 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">Prev</button>

                  {/* page numbers */}
                  {Array.from({ length: readerMeta.pages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === readerMeta.pages || Math.abs(p - readerMeta.page) <= 2)
                    .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === "…" ? (
                        <span key={`e${i}`} className="px-1 text-zinc-400">…</span>
                      ) : (
                        <button key={p} onClick={() => setReaderPage(p)} className={`w-8 h-8 rounded-md text-xs font-medium transition-colors ${p === readerMeta.page ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>{p}</button>
                      )
                    )}

                  <button disabled={readerMeta.page >= readerMeta.pages} onClick={() => setReaderPage((p) => p + 1)} className="px-3 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">Next</button>
                  <button disabled={readerMeta.page >= readerMeta.pages} onClick={() => setReaderPage(readerMeta.pages)} className="px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title="Last page">⟩⟩</button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* ================================================================ */}
      {/*  CREATE USER MODAL                                               */}
      {/* ================================================================ */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl border border-zinc-200 dark:border-zinc-700">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-1">Create Staff Account</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">Readers register themselves — this form is for staff.</p>

            {createError && (
              <div className="mb-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-300">{createError}</div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              {[
                { label: "Username", name: "username", type: "text", required: true },
                { label: "Email", name: "email", type: "email", required: true },
                { label: "Password", name: "password", type: "password", required: true, minLength: 8 },
                { label: "Display Name", name: "display_name", type: "text", required: false },
              ].map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">{field.label}</label>
                  <input
                    type={field.type}
                    value={createForm[field.name as keyof typeof createForm]}
                    onChange={(e) => setCreateForm((f) => ({ ...f, [field.name]: e.target.value }))}
                    required={field.required}
                    minLength={field.minLength}
                    className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-zinc-900 dark:text-white bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-600"
                  />
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Role</label>
                <select value={createForm.role} onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))} className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-zinc-900 dark:text-white bg-white dark:bg-zinc-800">
                  <option value="writer">Writer</option>
                  <option value="editor">Editor</option>
                  <option value="publisher">Publisher</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={creating} className="flex-1 rounded-lg bg-zinc-900 dark:bg-white dark:text-zinc-900 px-4 py-2 text-white font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-50 transition-colors">
                  {creating ? "Creating…" : "Create Account"}
                </button>
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- Role Hierarchy Info ---- */}
      <section className="mt-10 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 p-5">
        <h3 className="font-medium text-zinc-700 dark:text-zinc-300 mb-3 text-sm">Role Hierarchy</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-zinc-600 dark:text-zinc-400">
          {(["reader", "writer", "editor", "publisher"] as const).map((role) => {
            const meta = ROLE_META[role];
            const descs: Record<string, string> = {
              reader: "Can read articles, save favorites, follow topics",
              writer: "Can create and edit draft articles",
              editor: "Can review and approve articles, upload media",
              publisher: "Can publish articles, manage users, curate homepage",
            };
            return (
              <div key={role} className="flex items-start gap-2">
                <span>{meta.icon}</span>
                <span><strong className={`${meta.color} ${meta.darkColor}`}>{meta.label}:</strong> {descs[role]}</span>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
