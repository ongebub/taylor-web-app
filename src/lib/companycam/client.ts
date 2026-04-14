import type { CCPhoto, CCProject } from "./types";

const BASE_URL = "https://api.companycam.com/v2";

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
}

async function ccFetch<T>(
  token: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      ...authHeaders(token),
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `CompanyCam ${init?.method || "GET"} ${path} → ${res.status}: ${body}`
    );
  }

  return res.json() as Promise<T>;
}

/** Returns true if the token is valid. */
export async function checkToken(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/users/current`, {
      headers: authHeaders(token),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Paginated fetch of all projects from CompanyCam. */
export async function listAllProjects(token: string): Promise<CCProject[]> {
  const all: CCProject[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const batch = await ccFetch<CCProject[]>(
      token,
      `/projects?page=${page}&per_page=${perPage}`
    );
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
  }

  return all;
}

/** Paginated fetch of all photos for a given project. */
export async function listProjectPhotos(
  token: string,
  projectId: string
): Promise<CCPhoto[]> {
  const all: CCPhoto[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const batch = await ccFetch<CCPhoto[]>(
      token,
      `/projects/${projectId}/photos?page=${page}&per_page=${perPage}`
    );
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
  }

  return all;
}

/**
 * Pick the best available image URL from a CompanyCam photo payload.
 * Handles both webhook shape (uris is an object of size → url) and
 * API shape (uris is an array of { type, uri }).
 */
export function bestPhotoUrl(photo: CCPhoto): string | null {
  if (photo.photo_url) return photo.photo_url;
  const uris = photo.uris as unknown;
  if (!uris) return null;

  const preferred = ["original", "web", "large", "medium", "thumb", "thumbnail"];

  if (Array.isArray(uris)) {
    for (const type of preferred) {
      const match = uris.find(
        (u: { type?: string; uri?: string; url?: string }) => u.type === type
      );
      if (match) return match.uri || match.url || null;
    }
    const first = uris[0] as { uri?: string; url?: string } | undefined;
    return first?.uri || first?.url || null;
  }

  if (typeof uris === "object") {
    const map = uris as Record<string, string | { uri?: string; url?: string }>;
    for (const type of preferred) {
      const v = map[type];
      if (!v) continue;
      if (typeof v === "string") return v;
      if (v.uri) return v.uri;
      if (v.url) return v.url;
    }
    // Last resort: first value
    for (const v of Object.values(map)) {
      if (typeof v === "string") return v;
      if (v?.uri) return v.uri;
      if (v?.url) return v.url;
    }
  }

  return null;
}
