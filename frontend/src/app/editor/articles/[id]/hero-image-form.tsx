"use client";

import { useState, useRef } from "react";

type HeroImage = {
  id: number;
  thumb: string | null;
  medium: string | null;
  large: string | null;
  original: string | null;
  width: number | null;
  height: number | null;
  alt: string;
};

type HeroImageFormProps = {
  articleId: number;
  currentHeroImage?: HeroImage | null;
  onUpdate?: () => void;
};

async function getCSRFToken(): Promise<string> {
  try {
    const res = await fetch("/v1/auth/csrf/", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      return data.csrfToken || "";
    }
  } catch {
    // Ignore
  }
  return "";
}

type MediaAsset = {
  id: number;
  thumb_url?: string;
  medium_url?: string;
  large_url?: string;
};

export default function HeroImageForm({ articleId, currentHeroImage, onUpdate }: HeroImageFormProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState<MediaAsset | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Show current hero image URL
  const currentImageUrl = currentHeroImage 
    ? (currentHeroImage.large || currentHeroImage.medium || currentHeroImage.original)
    : null;

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      // First, upload the image
      const csrfToken = await getCSRFToken();
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/v1/editor/media/upload/", {
        method: "POST",
        credentials: "include",
        headers: {
          "X-CSRFToken": csrfToken,
        },
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload image");
      }

      const uploadData = await uploadRes.json();
      const media = uploadData.media as MediaAsset;
      setUploadedMedia(media);

      // Then, update the article with the new hero_media
      const updateRes = await fetch(`/v1/editor/articles/${articleId}/`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        body: JSON.stringify({ hero_media: media.id }),
      });

      if (!updateRes.ok) {
        throw new Error("Failed to update article");
      }

      setSuccess(true);
      onUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-zinc-900">Hero Image</h3>
      
      {/* Show current hero image */}
      {currentImageUrl && !uploadedMedia && (
        <div className="rounded-lg border border-zinc-200 p-3">
          <p className="text-sm text-zinc-600 mb-2">Current hero image:</p>
          <img
            src={currentImageUrl}
            alt={currentHeroImage?.alt || "Hero image"}
            className="w-full max-w-md rounded-lg"
          />
        </div>
      )}

      {uploadedMedia && (
        <div className="rounded-lg border border-zinc-200 p-3">
          <p className="text-sm text-green-700 mb-2">✓ Image uploaded (ID: {uploadedMedia.id})</p>
          {uploadedMedia.medium_url && (
            <img
              src={uploadedMedia.medium_url}
              alt="Hero preview"
              className="w-full max-w-md rounded-lg"
            />
          )}
        </div>
      )}

      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          disabled={uploading}
          className="block w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-zinc-900 file:text-white hover:file:bg-zinc-800 file:cursor-pointer disabled:opacity-50"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Upload an image to use as the article hero. Recommended: 1600x900 or larger.
        </p>
      </div>

      {uploading && (
        <p className="text-sm text-zinc-600">Uploading and processing...</p>
      )}

      {error && (
        <p className="text-sm text-red-700">{error}</p>
      )}

      {success && (
        <p className="text-sm text-green-700">Hero image updated!</p>
      )}
    </div>
  );
}
