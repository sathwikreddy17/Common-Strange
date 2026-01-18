import { apiGet } from "../_shared";

export type EditorialArticle = {
  id: number;
  title: string;
  slug: string;
  dek: string;
  status: string;
  updated_at: string;
  published_at: string | null;
  publish_at: string | null;
};

export async function fetchEditorialArticles(): Promise<EditorialArticle[]> {
  // Session-auth, returns all articles visible to the user (Writer/Editor/Publisher)
  return apiGet<EditorialArticle[]>("/v1/editor/articles/");
}
