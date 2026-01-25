"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Props = {
  articleId: number;
};

export default function EditArticleLink({ articleId }: Props) {
  const [isStaff, setIsStaff] = useState(false);

  useEffect(() => {
    // Check if user is staff
    fetch("/v1/auth/me/", { credentials: "include" })
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data?.user?.is_staff) {
          setIsStaff(true);
        }
      })
      .catch(() => {
        // Ignore
      });
  }, []);

  if (!isStaff || !articleId) return null;

  return (
    <Link
      href={`/editor/articles/${articleId}`}
      className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
    >
      ✏️ Edit
    </Link>
  );
}
