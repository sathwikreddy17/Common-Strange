"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [status, setStatus] = useState<"verifying" | "success" | "error">(() => {
    return token ? "verifying" : "error";
  });
  const [message, setMessage] = useState(() => (token ? "" : "No verification token provided."));

  useEffect(() => {
    if (!token) {
      return;
    }

    async function verifyEmail() {
      try {
        // Get CSRF token
        const csrfRes = await fetch("/v1/auth/csrf/", { credentials: "include" });
        const { csrfToken } = await csrfRes.json();

        const res = await fetch("/v1/auth/verify-email/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken,
          },
          credentials: "include",
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (res.ok) {
          setStatus("success");
          setMessage(data.message || "Email verified successfully!");
        } else {
          setStatus("error");
          setMessage(data.detail || "Verification failed.");
        }
      } catch {
        setStatus("error");
        setMessage("Network error. Please try again.");
      }
    }

    verifyEmail();
  }, [token]);

  if (status === "verifying") {
    return (
      <div className="text-center py-8">
        <div className="inline-block w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 dark:text-zinc-400">Verifying your email...</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="text-center py-8">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2 dark:text-zinc-100">Email Verified!</h2>
        <p className="text-gray-600 mb-6 dark:text-zinc-400">{message}</p>
        <Link
          href="/account"
          className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Go to Account
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center py-8">
      <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
        <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2 dark:text-zinc-100">Verification Failed</h2>
      <p className="text-gray-600 mb-6 dark:text-zinc-400">{message}</p>
      <div className="space-x-4">
        <Link
          href="/account"
          className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Go to Account
        </Link>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600 transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center dark:bg-zinc-950 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-gray-900 dark:text-zinc-100">
            Common Strange
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 dark:bg-zinc-900 dark:shadow-zinc-900/50">
          <Suspense fallback={
            <div className="text-center py-8">
              <div className="inline-block w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
          }>
            <VerifyEmailContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
