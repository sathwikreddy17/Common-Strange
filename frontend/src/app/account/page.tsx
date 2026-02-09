"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

type User = {
  id: number;
  username: string;
  email: string;
  display_name: string;
  role: string;
  is_staff: boolean;
  date_joined: string;
};

type Profile = {
  username: string;
  email: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  email_notifications: boolean;
  created_at: string;
};

type SavedArticle = {
  id: number;
  article_id: number;
  article_title: string;
  article_slug: string;
  article_dek: string;
  created_at: string;
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

export default function AccountPage() {
  const router = useRouter();
  const { logout: authLogout } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [savedArticles, setSavedArticles] = useState<SavedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"profile" | "saved" | "settings">("profile");

  // Profile edit state
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    display_name: "",
    bio: "",
    email_notifications: true,
  });
  const [saving, setSaving] = useState(false);

  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  async function fetchUserData() {
    setLoading(true);
    try {
      // Fetch current user
      const userRes = await fetch("/v1/auth/me/", { credentials: "include" });
      if (!userRes.ok) {
        router.push("/login");
        return;
      }
      const userData = await userRes.json();
      if (!userData.user) {
        router.push("/login");
        return;
      }
      setUser(userData.user);

      // Fetch profile
      const profileRes = await fetch("/v1/auth/profile/", { credentials: "include" });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData.profile);
        setProfileForm({
          display_name: profileData.profile?.display_name || "",
          bio: profileData.profile?.bio || "",
          email_notifications: profileData.profile?.email_notifications ?? true,
        });
      }

      // Fetch saved articles
      const savedRes = await fetch("/v1/auth/saved-articles/", { credentials: "include" });
      if (savedRes.ok) {
        const savedData = await savedRes.json();
        setSavedArticles(savedData.saved_articles || []);
      }
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const csrfToken = await getCSRFToken();
      const res = await fetch("/v1/auth/profile/", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        body: JSON.stringify(profileForm),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setEditingProfile(false);
      }
    } catch {
      // Handle error
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError("Passwords do not match");
      return;
    }

    try {
      const csrfToken = await getCSRFToken();
      const res = await fetch("/v1/auth/change-password/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        body: JSON.stringify({
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
        }),
      });

      if (res.ok) {
        setPasswordSuccess(true);
        setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
        setShowPasswordChange(false);
      } else {
        const data = await res.json();
        setPasswordError(data.detail || "Failed to change password");
      }
    } catch {
      setPasswordError("Network error");
    }
  }

  async function handleLogout() {
    await authLogout();
    router.push("/");
  }

  async function removeSavedArticle(articleId: number) {
    const csrfToken = await getCSRFToken();
    const res = await fetch(`/v1/auth/saved-articles/${articleId}/`, {
      method: "DELETE",
      credentials: "include",
      headers: { "X-CSRFToken": csrfToken },
    });
    if (res.ok || res.status === 204) {
      setSavedArticles((prev) => prev.filter((a) => a.article_id !== articleId));
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-500">Loading...</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  const roleColors: Record<string, string> = {
    admin: "bg-purple-100 text-purple-800",
    publisher: "bg-blue-100 text-blue-800",
    editor: "bg-green-100 text-green-800",
    writer: "bg-yellow-100 text-yellow-800",
    reader: "bg-zinc-100 text-zinc-800",
  };

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* Navigation */}
        <div className="mb-6">
          <Link href="/" className="text-sm text-stone-600 hover:underline">
            ← Back to Home
          </Link>
        </div>
        
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-stone-900">
                {profile?.display_name || user.username}
              </h1>
              <p className="mt-1 text-stone-600">@{user.username}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${roleColors[user.role] || roleColors.reader}`}>
                  {user.role}
                </span>
                {user.is_staff && (
                  <Link
                    href="/editor"
                    className="text-sm text-stone-600 hover:text-stone-900"
                  >
                    → Editor Dashboard
                  </Link>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href="/"
                className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-100"
              >
                Home
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-100"
              >
                Log out
              </button>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="border-b border-stone-200 mb-6">
          <nav className="flex gap-6">
            {(["profile", "saved", "settings"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-stone-900 text-stone-900"
                    : "border-transparent text-stone-500 hover:text-stone-700"
                }`}
              >
                {tab === "profile" && "Profile"}
                {tab === "saved" && `Saved Articles (${savedArticles.length})`}
                {tab === "settings" && "Settings"}
              </button>
            ))}
          </nav>
        </div>

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <section className="rounded-xl border border-stone-200 bg-white p-6">
            {editingProfile ? (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700">Display Name</label>
                  <input
                    type="text"
                    value={profileForm.display_name}
                    onChange={(e) => setProfileForm((f) => ({ ...f, display_name: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700">Bio</label>
                  <textarea
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm((f) => ({ ...f, bio: e.target.value }))}
                    rows={4}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-4 py-2"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="email_notifications"
                    checked={profileForm.email_notifications}
                    onChange={(e) => setProfileForm((f) => ({ ...f, email_notifications: e.target.checked }))}
                  />
                  <label htmlFor="email_notifications" className="text-sm text-stone-700">
                    Receive email notifications
                  </label>
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white hover:bg-stone-800 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingProfile(false)}
                    className="text-sm text-stone-600 hover:text-stone-900"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div className="flex justify-between mb-4">
                  <h2 className="text-lg font-medium">Profile Information</h2>
                  <button
                    onClick={() => setEditingProfile(true)}
                    className="text-sm text-stone-600 hover:text-stone-900"
                  >
                    Edit
                  </button>
                </div>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm text-stone-500">Email</dt>
                    <dd className="text-stone-900">{user.email}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-stone-500">Display Name</dt>
                    <dd className="text-stone-900">{profile?.display_name || "Not set"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-stone-500">Bio</dt>
                    <dd className="text-stone-900">{profile?.bio || "No bio yet"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-stone-500">Member since</dt>
                    <dd className="text-stone-900">
                      {new Date(user.date_joined).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </section>
        )}

        {/* Saved Articles Tab */}
        {activeTab === "saved" && (
          <section>
            {savedArticles.length === 0 ? (
              <div className="rounded-xl border border-stone-200 bg-white p-8 text-center">
                <p className="text-stone-600">No saved articles yet.</p>
                <Link href="/" className="mt-2 inline-block text-sm text-stone-900 hover:underline">
                  Browse articles →
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {savedArticles.map((saved) => (
                  <div
                    key={saved.id}
                    className="rounded-xl border border-stone-200 bg-white p-5 flex justify-between items-start"
                  >
                    <div>
                      <Link
                        href={`/${saved.article_slug}`}
                        className="font-medium text-stone-900 hover:underline"
                      >
                        {saved.article_title}
                      </Link>
                      {saved.article_dek && (
                        <p className="mt-1 text-sm text-stone-600 line-clamp-2">
                          {saved.article_dek}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-stone-400">
                        Saved {new Date(saved.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => removeSavedArticle(saved.article_id)}
                      className="text-sm text-stone-500 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <section className="space-y-6">
            <div className="rounded-xl border border-stone-200 bg-white p-6">
              <h2 className="text-lg font-medium mb-4">Change Password</h2>
              
              {passwordSuccess && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                  Password changed successfully!
                </div>
              )}

              {showPasswordChange ? (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  {passwordError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      {passwordError}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-stone-700">Current Password</label>
                    <input
                      type="password"
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm((f) => ({ ...f, current_password: e.target.value }))}
                      required
                      className="mt-1 w-full rounded-lg border border-stone-300 px-4 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700">New Password</label>
                    <input
                      type="password"
                      value={passwordForm.new_password}
                      onChange={(e) => setPasswordForm((f) => ({ ...f, new_password: e.target.value }))}
                      required
                      minLength={8}
                      className="mt-1 w-full rounded-lg border border-stone-300 px-4 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700">Confirm New Password</label>
                    <input
                      type="password"
                      value={passwordForm.confirm_password}
                      onChange={(e) => setPasswordForm((f) => ({ ...f, confirm_password: e.target.value }))}
                      required
                      minLength={8}
                      className="mt-1 w-full rounded-lg border border-stone-300 px-4 py-2"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white hover:bg-stone-800"
                    >
                      Update Password
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPasswordChange(false)}
                      className="text-sm text-stone-600 hover:text-stone-900"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowPasswordChange(true)}
                  className="text-sm text-stone-900 hover:underline"
                >
                  Change your password →
                </button>
              )}
            </div>

            <div className="rounded-xl border border-red-200 bg-red-50 p-6">
              <h2 className="text-lg font-medium text-red-900 mb-2">Danger Zone</h2>
              <p className="text-sm text-red-700 mb-4">
                Once you delete your account, there is no going back.
              </p>
              <button
                className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm text-red-700 hover:bg-red-100"
                disabled
              >
                Delete Account (Contact admin)
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
