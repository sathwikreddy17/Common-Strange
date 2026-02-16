"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost, apiDelete } from "../../_shared";

type Props = {
  id: number;
  status: string;
  userRole?: string;
};

type ActionBody = unknown;

export default function WorkflowButtons({ id, status, userRole }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const canDelete = userRole === "editor" || userRole === "publisher" || userRole === "admin";

  async function doAction(action: string, body?: ActionBody, redirectAfter = true) {
    setLoading(action);
    setError(null);
    setSuccess(null);
    try {
      await apiPost(`/v1/editor/articles/${id}/${action}/`, body ?? {});
      setSuccess(`Action '${action}' succeeded.`);
      
      // Redirect to pipeline after successful workflow actions
      if (redirectAfter && action !== "preview_token") {
        setTimeout(() => {
          router.push("/editor/pipeline");
        }, 800);
      }
    } catch {
      setError(`Action '${action}' failed.`);
    } finally {
      setLoading(null);
    }
  }

  async function handleDelete() {
    setLoading("delete");
    setError(null);
    setSuccess(null);
    try {
      await apiDelete(`/v1/editor/articles/${id}/delete/`);
      setSuccess("Article deleted.");
      setTimeout(() => {
        router.push("/editor/articles");
      }, 800);
    } catch {
      setError("Failed to delete article. You may not have permission.");
    } finally {
      setLoading(null);
      setShowDeleteConfirm(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {status === "DRAFT" && (
          <button
            className="rounded-lg bg-blue-700 px-3 py-1 text-sm text-white hover:bg-blue-800 disabled:opacity-50"
            disabled={!!loading}
            onClick={() => doAction("submit")}
          >
            Submit for review
          </button>
        )}
        {status === "IN_REVIEW" && (
          <button
            className="rounded-lg bg-green-700 px-3 py-1 text-sm text-white hover:bg-green-800 disabled:opacity-50"
            disabled={!!loading}
            onClick={() => doAction("approve")}
          >
            Approve
          </button>
        )}
        {(status === "SCHEDULED" || status === "IN_REVIEW") && (
          <button
            className="rounded-lg bg-purple-700 px-3 py-1 text-sm text-white hover:bg-purple-800 disabled:opacity-50"
            disabled={!!loading}
            onClick={() => doAction("publish_now")}
          >
            Publish now
          </button>
        )}
        {status === "SCHEDULED" && (
          <button
            className="rounded-lg bg-yellow-700 px-3 py-1 text-sm text-white hover:bg-yellow-800 disabled:opacity-50"
            disabled={!!loading}
            onClick={() => doAction("preview_token")}
          >
            Get preview token
          </button>
        )}

        {/* Delete button — Editors & Publishers only */}
        {canDelete && (
          <>
            {!showDeleteConfirm ? (
              <button
                className="ml-auto rounded-lg border border-red-300 dark:border-red-800 px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-50 transition-colors"
                disabled={!!loading}
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete article
              </button>
            ) : (
              <div className="ml-auto flex items-center gap-2 rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/50 px-3 py-1.5">
                <span className="text-sm text-red-700 dark:text-red-300">Are you sure?</span>
                <button
                  className="rounded-md bg-red-600 px-3 py-0.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  disabled={!!loading}
                  onClick={handleDelete}
                >
                  {loading === "delete" ? "Deleting…" : "Yes, delete"}
                </button>
                <button
                  className="rounded-md bg-zinc-200 dark:bg-zinc-700 px-3 py-0.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </button>
              </div>
            )}
          </>
        )}
      </div>
      {error ? <div className="text-sm text-red-700 dark:text-red-400">{error}</div> : null}
      {success ? <div className="text-sm text-green-700 dark:text-green-400">{success} Redirecting...</div> : null}
    </div>
  );
}
