"use client";

import { useState } from "react";
import { apiPost } from "../../_shared";

type Props = {
  id: number;
  status: string;
};

export default function WorkflowButtons({ id, status }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function doAction(action: string, body?: any) {
    setLoading(action);
    setError(null);
    setSuccess(null);
    try {
      await apiPost(`/v1/editor/articles/${id}/${action}/`, body ?? {});
      setSuccess(`Action '${action}' succeeded.`);
    } catch (e) {
      setError(`Action '${action}' failed.`);
    } finally {
      setLoading(null);
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
      </div>
      {error ? <div className="text-sm text-red-700">{error}</div> : null}
      {success ? <div className="text-sm text-green-700">{success}</div> : null}
    </div>
  );
}
