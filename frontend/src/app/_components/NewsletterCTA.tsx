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
    <section className="border-y border-zinc-200 bg-zinc-50 py-16">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <h2 className="font-serif text-3xl font-bold text-zinc-900">
          Stay curious.
        </h2>
        <p className="mt-3 text-lg text-zinc-600">
          Get the best of Common Strange delivered to your inbox. No spam, ever.
        </p>

        {submitted ? (
          <p className="mt-8 text-sm font-medium text-emerald-700">
            Thanks for subscribing! 🎉
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 flex gap-3 sm:mx-auto sm:max-w-md">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="flex-1 rounded-sm border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-900 transition-colors"
              required
            />
            <button
              type="submit"
              className="rounded-sm bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
            >
              Subscribe
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
