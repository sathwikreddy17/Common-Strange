"use client";

import { useState } from "react";

export function NewsletterCTA() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
      setEmail("");
    }
  }

  return (
    <section className="border-y border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 py-16">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <h2 className="font-serif text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          Stay curious.
        </h2>
        <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
          Get the best of Common Strange delivered to your inbox. No spam, ever.
        </p>

        {submitted ? (
          <p className="mt-8 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            Thanks for subscribing! 🎉
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 flex gap-3 sm:mx-auto sm:max-w-md">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="flex-1 rounded-sm border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-zinc-900 dark:focus:border-zinc-400 transition-colors"
              required
            />
            <button
              type="submit"
              className="rounded-sm bg-zinc-900 dark:bg-zinc-100 px-6 py-3 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
            >
              Subscribe
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
