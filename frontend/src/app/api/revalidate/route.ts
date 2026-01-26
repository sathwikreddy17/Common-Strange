import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/**
 * API route to trigger cache revalidation after article edits.
 * POST /api/revalidate
 * Body: { slug?: string, path?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, path } = body as { slug?: string; path?: string };

    // Revalidate by slug (article page)
    if (slug) {
      revalidatePath(`/${slug}`);
      // Also revalidate the homepage since it may show this article
      revalidatePath("/");
    }

    // Revalidate a specific path
    if (path) {
      revalidatePath(path);
    }

    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch (error) {
    console.error("Revalidation error:", error);
    return NextResponse.json({ revalidated: false, error: "Invalid request" }, { status: 400 });
  }
}
