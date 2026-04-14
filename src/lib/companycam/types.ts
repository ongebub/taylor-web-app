/**
 * Minimal CompanyCam payload types.
 * Based on the v2 API and webhook event shapes. Only fields we actually use.
 */

export type CCAddress = {
  street_address_1?: string | null;
  street_address_2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
};

export type CCProject = {
  id: string;
  name: string;
  address?: CCAddress | null;
  status?: string | null;
  created_at?: number | string;
  updated_at?: number | string;
};

export type CCPhotoUri = {
  type: string; // "original" | "web" | "thumbnail" etc.
  uri: string;
  url?: string;
};

export type CCPhoto = {
  id: string;
  project_id?: string | null;
  // API returns an array; webhook returns an object keyed by size.
  uris?: CCPhotoUri[] | Record<string, string | { uri?: string; url?: string }>;
  photo_url?: string;
  captured_at?: number | string | null;
  description?: string | null;
};

export type CCWebhookEvent = {
  type: string; // e.g. "project.created", "photo.created"
  created_at?: number | string;
  // Different CompanyCam events wrap the object under different keys,
  // so accept all the common variants.
  project?: CCProject;
  photo?: CCPhoto;
  event_object?: CCProject | CCPhoto;
  data?: CCProject | CCPhoto;
};
