"use client";

import { useEffect, useState } from "react";

type SaveArticleButtonProps = {
  articleId: number;
  articleSlug: string;
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

export default function SaveArticleButton({ articleId, articleSlug }: SaveArticleButtonProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (articleId) {
      checkStatus();
    }
  }, [articleId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function checkStatus() {
    if (!articleId) return;
    setLoading(true);
    try {
      // Check if user is logged in
      const userRes = await fetch("/v1/auth/me/", { credentials: "include" });
      if (!userRes.ok) {
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }
      const userData = await userRes.json();
      if (!userData.user) {
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }
      setIsLoggedIn(true);

      // Check if article is saved
      const savedRes = await fetch(`/v1/auth/saved-articles/${articleId}/check/`, {
        credentials: "include",
      });
      if (savedRes.ok) {
        const savedData = await savedRes.json();
        setIsSaved(savedData.is_saved || false);
      }
    } catch {
      setIsLoggedIn(false);
    } finally {
      setLoading(false);
    }
  }

  async function toggleSave() {
    if (!isLoggedIn) {
      // Redirect to login
      window.location.href = `/login?redirect=/${articleSlug}`;
      return;
    }

    setSaving(true);
    const csrfToken = await getCSRFToken();

    try {
      if (isSaved) {
        // Remove from saved
        const res = await fetch(`/v1/auth/saved-articles/${articleId}/`, {
          method: "DELETE",
          credentials: "include",
          headers: { "X-CSRFToken": csrfToken },
        });
        if (res.ok || res.status === 204) {
          setIsSaved(false);
        }
      } else {
        // Add to saved
        const res = await fetch("/v1/auth/saved-articles/", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken,
          },
          body: JSON.stringify({ article_id: articleId }),
        });
        if (res.ok) {
          setIsSaved(true);
        }
      }
    } catch {
      // Handle error
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <button
        disabled
        className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-400"
      >
        •••
      </button>
    );
  }

  return (
    <button
      onClick={toggleSave}
      disabled={saving}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        isSaved
          ? "border-stone-900 bg-stone-900 text-white hover:bg-stone-800"
          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
      } ${saving ? "opacity-50" : ""}`}
      title={isLoggedIn ? (isSaved ? "Remove from saved" : "Save article") : "Sign in to save"}
    >
      {saving ? (
        "•••"
      ) : isSaved ? (
        <>
          <span className="mr-1">✓</span>
          Saved
        </>
      ) : (
        <>
          <span className="mr-1">♡</span>
          {isLoggedIn ? "Save" : "Sign in to save"}
        </>
      )}
    </button>
  );
}
