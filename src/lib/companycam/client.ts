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

/** Pick the best available image URL from a CompanyCam photo payload. */
export function bestPhotoUrl(photo: CCPhoto): string | null {
  if (photo.photo_url) return photo.photo_url;
  if (!photo.uris || photo.uris.length === 0) return null;

  const preferredOrder = ["original", "web", "large", "medium", "thumbnail"];
  for (const type of preferredOrder) {
    const match = photo.uris.find((u) => u.type === type);
    if (match) return match.uri || match.url || null;
  }
  return photo.uris[0]?.uri || photo.uris[0]?.url || null;
}
