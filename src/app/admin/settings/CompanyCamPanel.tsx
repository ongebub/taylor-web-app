"use client";

import { useState } from "react";

type Props = {
  tokenConfigured: boolean;
  initialConnected: boolean;
  projectCount: number;
  photoCount: number;
  lastImportedAt: string | null;
};

type SyncResult = {
  projectsImported: number;
  projectsSkipped: number;
  photosImported: number;
  photosSkipped: number;
  errors: string[];
};

type RegisterResult = {
  ok: boolean;
  status: number;
  id?: string;
  secret?: string;
  url: string;
  events: string[];
  response: unknown;
  error?: string;
};

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CompanyCamPanel({
  tokenConfigured,
  initialConnected,
  projectCount,
  photoCount,
  lastImportedAt,
}: Props) {
  const [connected] = useState(initialConnected);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [registering, setRegistering] = useState(false);
  const [registerResult, setRegisterResult] = useState<RegisterResult | null>(
    null
  );
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);

  async function handleSync() {
    setSyncing(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/companycam/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Sync failed");
      } else {
        setResult(data.result);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function handleRegisterWebhooks() {
    setRegistering(true);
    setRegisterError(null);
    setRegisterResult(null);
    setSecretCopied(false);
    try {
      const res = await fetch("/api/admin/companycam/register-webhooks", {
        method: "POST",
      });
      const data = (await res.json()) as RegisterResult;
      if (!data.ok) {
        setRegisterError(data.error || `HTTP ${data.status}`);
      }
      setRegisterResult(data);
    } catch (e) {
      setRegisterError(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setRegistering(false);
    }
  }

  async function handleCopySecret(secret: string) {
    try {
      await navigator.clipboard.writeText(secret);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    } catch {
      // Ignore clipboard errors
    }
  }

  const statusColor = connected
    ? "bg-green-500"
    : tokenConfigured
    ? "bg-red-500"
    : "bg-gray-400";
  const statusLabel = connected
    ? "Connected"
    : tokenConfigured
    ? "Token invalid"
    : "Not configured";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-navy">CompanyCam</h2>
          <p className="text-sm text-gray-500 mt-1">
            Projects and photos sync automatically via webhook. Run a full sync
            to back-fill everything from CompanyCam.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5">
          <span className={`h-2 w-2 rounded-full ${statusColor}`} />
          <span className="text-xs font-medium text-gray-700">
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
        <Stat label="Synced projects" value={projectCount.toString()} />
        <Stat label="Synced photos" value={photoCount.toString()} />
        <Stat label="Last import" value={formatDate(lastImportedAt)} />
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSync}
          disabled={!connected || syncing}
          className="inline-flex items-center gap-2 bg-orange hover:bg-orange/90 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition"
        >
          {syncing ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="opacity-25"
                />
                <path
                  fill="currentColor"
                  className="opacity-75"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              Syncing…
            </>
          ) : (
            "Run Full Sync"
          )}
        </button>
        <button
          type="button"
          onClick={handleRegisterWebhooks}
          disabled={!connected || registering}
          className="inline-flex items-center gap-2 bg-navy hover:bg-navy/90 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition"
        >
          {registering ? "Registering…" : "Register Webhooks"}
        </button>
        {!tokenConfigured && (
          <p className="text-xs text-gray-500">
            Set <code className="bg-gray-100 px-1 rounded">COMPANYCAM_API_TOKEN</code> in environment variables to enable.
          </p>
        )}
      </div>

      {/* Webhook registration result */}
      {registerResult && registerResult.ok && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4 text-sm">
          <p className="font-semibold text-green-800 mb-2">
            Webhook registered
          </p>
          <ul className="text-green-700 space-y-1 mb-3">
            {registerResult.id && (
              <li>
                Webhook ID:{" "}
                <code className="bg-white/60 px-1.5 py-0.5 rounded text-xs">
                  {registerResult.id}
                </code>
              </li>
            )}
            <li>
              Events: {registerResult.events.join(", ")}
            </li>
          </ul>
          {registerResult.secret ? (
            <div className="bg-white border border-green-300 rounded-lg p-3 mt-2">
              <p className="text-xs font-semibold text-gray-700 mb-1.5">
                Signing secret — copy this into{" "}
                <code className="bg-gray-100 px-1 rounded">
                  COMPANYCAM_WEBHOOK_SECRET
                </code>{" "}
                in .env.local AND Vercel:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-xs font-mono text-gray-800 truncate">
                  {registerResult.secret}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopySecret(registerResult.secret!)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded text-xs font-semibold transition ${
                    secretCopied
                      ? "bg-green-500 text-white"
                      : "bg-navy hover:bg-navy/90 text-white"
                  }`}
                >
                  {secretCopied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-800 mt-2">
              No secret in response. Full payload logged below — share the
              field name with your developer.
            </div>
          )}
          <details className="mt-3">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
              View full response
            </summary>
            <pre className="mt-2 bg-gray-50 border border-gray-200 rounded p-2 text-xs overflow-x-auto">
              {JSON.stringify(registerResult.response, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {registerError && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          <p className="font-semibold mb-1">Webhook registration failed</p>
          <p>{registerError}</p>
          {registerResult && (
            <details className="mt-2">
              <summary className="text-xs cursor-pointer hover:text-red-900">
                View response
              </summary>
              <pre className="mt-2 bg-white border border-red-200 rounded p-2 text-xs overflow-x-auto">
                {JSON.stringify(registerResult.response, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4 text-sm">
          <p className="font-semibold text-green-800 mb-2">Sync complete</p>
          <ul className="text-green-700 space-y-0.5">
            <li>
              Projects: <strong>{result.projectsImported}</strong> new,{" "}
              {result.projectsSkipped} existing
            </li>
            <li>
              Photos: <strong>{result.photosImported}</strong> new,{" "}
              {result.photosSkipped} existing
            </li>
            {result.errors.length > 0 && (
              <li className="text-amber-700">
                {result.errors.length} errors — check server logs
              </li>
            )}
          </ul>
        </div>
      )}

      {error && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-lg font-semibold text-navy mt-0.5 truncate">{value}</p>
    </div>
  );
}
