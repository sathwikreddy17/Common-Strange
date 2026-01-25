"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const { register, user, loading } = useAuth();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    password_confirm: "",
    display_name: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      router.push("/");
    }
  }, [loading, user, router]);

  // Show nothing while checking auth or redirecting
  if (loading || user) {
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    if (formData.password !== formData.password_confirm) {
      setError("Passwords do not match");
      setSubmitting(false);
      return;
    }

    const result = await register(formData);

    if (result.success) {
      router.push("/");
    } else {
      setError(result.error || "Registration failed");
    }

    setSubmitting(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-2">
          <Link href="/" className="text-sm text-stone-600 hover:underline">
            ← Back to Home
          </Link>
        </div>
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-serif font-bold tracking-tight text-stone-900">
            Common Strange
          </Link>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
          <h1 className="mb-6 text-2xl font-semibold text-stone-900">Create an account</h1>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-stone-700">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                required
                minLength={3}
                autoComplete="username"
                className="mt-1 block w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 placeholder-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                placeholder="Choose a username"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-stone-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
                className="mt-1 block w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 placeholder-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="display_name" className="block text-sm font-medium text-stone-700">
                Display Name <span className="text-stone-400">(optional)</span>
              </label>
              <input
                id="display_name"
                name="display_name"
                type="text"
                value={formData.display_name}
                onChange={handleChange}
                autoComplete="name"
                className="mt-1 block w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 placeholder-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                placeholder="How should we call you?"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-stone-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={8}
                autoComplete="new-password"
                className="mt-1 block w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 placeholder-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label htmlFor="password_confirm" className="block text-sm font-medium text-stone-700">
                Confirm Password
              </label>
              <input
                id="password_confirm"
                name="password_confirm"
                type="password"
                value={formData.password_confirm}
                onChange={handleChange}
                required
                minLength={8}
                autoComplete="new-password"
                className="mt-1 block w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 placeholder-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                placeholder="Repeat your password"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-stone-900 px-4 py-2.5 text-white font-medium hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-4 text-xs text-stone-500">
            By creating an account, you agree to our terms of service and privacy policy.
          </p>

          <div className="mt-6 text-center text-sm text-stone-600">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-stone-900 hover:underline">
              Sign in
            </Link>
          </div>
        </div>

        <div className="mt-4 text-center text-sm text-stone-500">
          <Link href="/" className="hover:text-stone-700">
            ← Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
