"use client";

import { useEffect, useRef } from "react";

export default function ArticleEvents({ slug }: { slug: string }) {
  const sentPageview = useRef(false);
  const sentRead = useRef(false);

  useEffect(() => {
    if (sentPageview.current) return;
    sentPageview.current = true;

    const referrer = typeof document !== "undefined" ? document.referrer : "";
    const path = typeof window !== "undefined" ? window.location.pathname : "";

    // Fire-and-forget; events must never break rendering.
    fetch("/v1/events/pageview/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, path, referrer }),
      keepalive: true,
    }).catch(() => {});
  }, [slug]);

  useEffect(() => {
    const onScroll = () => {
      if (sentRead.current) return;
      if (typeof window === "undefined" || typeof document === "undefined") return;

      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      const viewportH = window.innerHeight || 0;
      const docH = document.documentElement.scrollHeight || 1;

      const readRatio = Math.min(1, (scrollTop + viewportH) / docH);

      // PoC heuristic: consider "read" once the user reaches ~80%.
      if (readRatio >= 0.8) {
        sentRead.current = true;
        fetch("/v1/events/read/", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slug, read_ratio: readRatio }),
          keepalive: true,
        }).catch(() => {});
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => window.removeEventListener("scroll", onScroll);
  }, [slug]);

  return null;
}
