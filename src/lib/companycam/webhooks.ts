/**
 * CompanyCam webhook registration.
 * Shared by scripts/companycam-register-webhooks.ts and the admin API route.
 *
 * CompanyCam supports a single webhook subscription covering multiple events,
 * so we register ONE webhook for all four events we care about.
 */

const BASE_URL = "https://api.companycam.com/v2";

// CompanyCam's valid webhook scopes. `photo.deleted` is NOT a valid event
// (API rejects it with "invalid scope"), so it's excluded here.
export const WEBHOOK_EVENTS = [
  "project.created",
  "project.updated",
  "photo.created",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export type WebhookRegistrationResult = {
  ok: boolean;
  status: number;
  id?: string;
  secret?: string;
  url: string;
  events: string[];
  response: unknown;
  error?: string;
};

/**
 * Dig through a response body to find id / secret fields, regardless of
 * whether CompanyCam wraps the payload in { webhook: {...} } or returns flat.
 */
function extractFields(body: unknown): {
  id?: string;
  secret?: string;
} {
  if (!body || typeof body !== "object") return {};
  const root = body as Record<string, unknown>;

  // Look in root, and also in .webhook / .data in case CompanyCam wraps it
  const sources: Record<string, unknown>[] = [root];
  if (root.webhook && typeof root.webhook === "object") {
    sources.push(root.webhook as Record<string, unknown>);
  }
  if (root.data && typeof root.data === "object") {
    sources.push(root.data as Record<string, unknown>);
  }

  let id: string | undefined;
  let secret: string | undefined;

  for (const source of sources) {
    if (!id) {
      id =
        (source.id as string | undefined) ||
        (source.uuid as string | undefined) ||
        (source.webhook_id as string | undefined);
    }
    if (!secret) {
      secret =
        (source.secret as string | undefined) ||
        (source.token as string | undefined) ||
        (source.signing_secret as string | undefined) ||
        (source.signingSecret as string | undefined);
    }
  }

  return {
    id: id ? String(id) : undefined,
    secret: secret ? String(secret) : undefined,
  };
}

/** Force https:// on a URL — CompanyCam rejects http. */
function forceHttps(url: string): string {
  const trimmed = url.trim().replace(/\/$/, "");
  if (trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("http://")) return "https://" + trimmed.slice(7);
  return "https://" + trimmed;
}

/**
 * Register ONE webhook subscription with CompanyCam covering all the events
 * we care about. Returns the full response (including the signing secret).
 */
export async function registerWebhookSubscription(
  token: string,
  webhookUrl: string
): Promise<WebhookRegistrationResult> {
  const events = [...WEBHOOK_EVENTS];
  const safeUrl = forceHttps(webhookUrl);

  const requestBody = {
    webhook: {
      url: safeUrl,
      events,
      // CompanyCam docs vary between "events" and "scopes" — include both so
      // whichever the API expects is honored. Extra keys are typically ignored.
      scopes: events,
    },
  };

  try {
    const res = await fetch(`${BASE_URL}/webhooks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
      cache: "no-store",
    });

    const rawText = await res.text();
    let body: unknown;
    try {
      body = JSON.parse(rawText);
    } catch {
      body = rawText;
    }

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        url: safeUrl,
        events,
        response: body,
        error: `HTTP ${res.status}`,
      };
    }

    const { id, secret } = extractFields(body);

    return {
      ok: true,
      status: res.status,
      id,
      secret,
      url: safeUrl,
      events,
      response: body,
    };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      url: safeUrl,
      events,
      response: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
