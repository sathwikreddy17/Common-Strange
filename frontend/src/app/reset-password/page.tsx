"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [status, setStatus] = useState<"validating" | "valid" | "invalid" | "loading" | "success" | "error">(() => {
    // If there's no token, start as invalid immediately to avoid calling
    // setState inside the effect body (react-hooks/set-state-in-effect).
    return token ? "validating" : "invalid";
  });
  const [message, setMessage] = useState(() => (token ? "" : "No reset token provided."));

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      return;
    }

    async function validateToken() {
      try {
        const res = await fetch(`/v1/auth/password-reset/validate/?token=${encodeURIComponent(token)}`, {
          credentials: "include",
        });
        const data = await res.json();

        if (data.valid) {
          setStatus("valid");
        } else {
          setStatus("invalid");
          setMessage(data.detail || "This reset link is invalid or has expired.");
        }
      } catch {
        setStatus("invalid");
        setMessage("Could not validate reset link.");
      }
    }

    validateToken();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password !== passwordConfirm) {
      setMessage("Passwords do not match.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      // Get CSRF token
      const csrfRes = await fetch("/v1/auth/csrf/", { credentials: "include" });
      const { csrfToken } = await csrfRes.json();

      const res = await fetch("/v1/auth/password-reset/confirm/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        credentials: "include",
        body: JSON.stringify({
          token,
          password,
          password_confirm: passwordConfirm,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage(data.message || "Password reset successfully!");
        // Redirect to login after 2 seconds
        setTimeout(() => router.push("/login"), 2000);
      } else {
        setStatus("valid"); // Go back to form state
        setMessage(data.detail || data.password?.[0] || "Something went wrong.");
      }
    } catch {
      setStatus("valid");
      setMessage("Network error. Please try again.");
    }
  }

  // Loading state while validating token
  if (status === "validating") {
    return (
      <div className="text-center py-8">
        <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 dark:text-zinc-400">Validating reset link...</p>
      </div>
    );
  }

  // Invalid token state
  if (status === "invalid") {
    return (
      <div className="text-center py-8">
        <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2 dark:text-zinc-100">Invalid Reset Link</h3>
        <p className="text-sm text-gray-600 mb-6 dark:text-zinc-400">{message}</p>
        <Link
          href="/forgot-password"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Request new reset link
        </Link>
      </div>
    );
  }

  // Success state
  if (status === "success") {
    return (
      <div className="text-center py-8">
        <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2 dark:text-zinc-100">Password Reset!</h3>
        <p className="text-sm text-gray-600 mb-6 dark:text-zinc-400">{message}</p>
        <p className="text-sm text-gray-500 dark:text-zinc-500">Redirecting to login...</p>
      </div>
    );
  }

  // Form state (valid token)
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
          {message}
        </div>
      )}

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
          New Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
          placeholder="At least 8 characters"
        />
      </div>

      <div>
        <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
          Confirm New Password
        </label>
        <input
          id="passwordConfirm"
          name="passwordConfirm"
          type="password"
          autoComplete="new-password"
          required
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
          placeholder="Confirm your password"
        />
      </div>

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === "loading" ? (
          <span className="flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Resetting...
          </span>
        ) : (
          "Reset Password"
        )}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 dark:bg-zinc-950 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center text-2xl font-bold text-gray-900 dark:text-zinc-100">
          Common Strange
        </Link>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-zinc-100">
          Set new password
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 dark:bg-zinc-900 dark:shadow-zinc-900/50">
          <Suspense fallback={
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
          }>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
