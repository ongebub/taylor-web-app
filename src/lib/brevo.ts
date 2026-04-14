/**
 * Thin wrapper around the Brevo (formerly Sendinblue) transactional + contacts
 * APIs. All requests use the `BREVO_API_KEY` env var. Functions are designed
 * to be best-effort — they return an `ok` flag and an error string rather than
 * throwing, so a single failing recipient can't abort a whole batch.
 */

const BREVO_BASE = "https://api.brevo.com/v3";

type BrevoResult = { ok: boolean; error?: string };

function apiKey(): string | null {
  return process.env.BREVO_API_KEY || null;
}

async function brevoFetch(
  path: string,
  init: RequestInit
): Promise<{ ok: boolean; status: number; json: unknown; text: string }> {
  const key = apiKey();
  if (!key) {
    return { ok: false, status: 0, json: null, text: "BREVO_API_KEY not set" };
  }
  const res = await fetch(`${BREVO_BASE}${path}`, {
    ...init,
    headers: {
      "api-key": key,
      "content-type": "application/json",
      accept: "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // non-JSON response, leave json null
  }
  return { ok: res.ok, status: res.status, json, text };
}

export async function sendTransactionalEmail(opts: {
  to: { email: string; name?: string };
  subject: string;
  htmlContent: string;
  textContent?: string;
  sender?: { email: string; name?: string };
}): Promise<BrevoResult> {
  const sender = opts.sender || {
    email: "info@taylorext.com",
    name: "Taylor Exteriors & Construction",
  };

  const { ok, status, text } = await brevoFetch("/smtp/email", {
    method: "POST",
    body: JSON.stringify({
      sender,
      to: [opts.to],
      subject: opts.subject,
      htmlContent: opts.htmlContent,
      ...(opts.textContent ? { textContent: opts.textContent } : {}),
    }),
  });

  if (!ok) {
    return { ok: false, error: `Brevo email ${status}: ${text.slice(0, 300)}` };
  }
  return { ok: true };
}

/**
 * Upsert a contact and (optionally) add it to a list. Brevo returns 400
 * "Contact already exist" when creating a duplicate — we treat that as success
 * and fall back to updating the contact to make sure the list membership sticks.
 */
export async function upsertContactToList(opts: {
  email: string;
  firstName?: string;
  listId: number;
}): Promise<BrevoResult> {
  const create = await brevoFetch("/contacts", {
    method: "POST",
    body: JSON.stringify({
      email: opts.email,
      attributes: opts.firstName ? { FIRSTNAME: opts.firstName } : undefined,
      listIds: [opts.listId],
      updateEnabled: true,
    }),
  });

  if (create.ok) return { ok: true };

  // updateEnabled:true should handle duplicates, but as a safety net
  // fall back to an explicit list add if the create failed.
  const add = await brevoFetch(`/contacts/lists/${opts.listId}/contacts/add`, {
    method: "POST",
    body: JSON.stringify({ emails: [opts.email] }),
  });

  if (add.ok) return { ok: true };

  return {
    ok: false,
    error: `Brevo contact ${create.status}/${add.status}: ${create.text.slice(0, 200)}`,
  };
}
