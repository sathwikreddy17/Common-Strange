"use client";

import { useCallback, useState } from "react";

export default function ShareActions({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);

  const onShare = useCallback(async () => {
    try {
      // Prefer the native share sheet when available.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nav: any = navigator;
      if (nav?.share) {
        await nav.share({ title, url });
        return;
      }

      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      }
    } catch {
      // ignore
    }
  }, [title, url]);

  return (
    <button
      type="button"
      onClick={onShare}
      className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
      aria-label={copied ? "Copied" : "Share"}
    >
      {copied ? "Copied" : "Share"}
    </button>
  );
}
