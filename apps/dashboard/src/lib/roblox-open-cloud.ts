type OpenCloudConfig = {
  apiKey: string;
  universeId: number;
};

export type OpenCloudDataStoreRef = {
  /** Standard DataStore name (not the scope). */
  datastoreName: string;
  /** Optional scope (defaults to "global" in Open Cloud). */
  scope?: string;
};

export type OpenCloudModerationBridgeConfig = {
  enabled: boolean;
  datastoreName: string;
  scope?: string;
  banTopic: string;
  muteTopic: string;
};

export type OpenCloudFeatureFlagsBridgeConfig = {
  enabled: boolean;
  datastoreName: string;
  scope?: string;
  topic: string;
  entryKeyPrefix: string;
};

const OPEN_CLOUD_BASE_URL = "https://apis.roblox.com";

function getOpenCloudConfig(): OpenCloudConfig | null {
  const apiKey = process.env.ROBLOX_OPEN_CLOUD_API_KEY?.trim();
  const universeIdRaw = process.env.ROBLOX_UNIVERSE_ID?.trim();

  if (!apiKey || !universeIdRaw) return null;

  const universeId = Number(universeIdRaw);
  if (!Number.isInteger(universeId) || universeId <= 0) return null;

  return { apiKey, universeId };
}

export function getOpenCloudModerationBridgeConfig(): OpenCloudModerationBridgeConfig {
  const enabled = process.env.MODERATION_OPEN_CLOUD_ENABLED?.trim() === "true";

  return {
    enabled,
    datastoreName: process.env.ROBLOX_MODERATION_DATASTORE_NAME?.trim() || "StarterModeration",
    scope: process.env.ROBLOX_MODERATION_DATASTORE_SCOPE?.trim() || undefined,
    banTopic: process.env.ROBLOX_MODERATION_BAN_TOPIC?.trim() || "ModBanSync",
    muteTopic: process.env.ROBLOX_MODERATION_MUTE_TOPIC?.trim() || "ModMuteSync",
  };
}

export function getOpenCloudFeatureFlagsBridgeConfig(): OpenCloudFeatureFlagsBridgeConfig {
  const enabled = process.env.FEATUREFLAGS_OPEN_CLOUD_ENABLED?.trim() === "true";

  return {
    enabled,
    datastoreName: process.env.ROBLOX_FEATUREFLAGS_DATASTORE_NAME?.trim() || "StarterFeatureFlags",
    scope: process.env.ROBLOX_FEATUREFLAGS_DATASTORE_SCOPE?.trim() || undefined,
    topic: process.env.ROBLOX_FEATUREFLAGS_TOPIC?.trim() || "FeatureFlagsSync",
    entryKeyPrefix: process.env.ROBLOX_FEATUREFLAGS_ENTRY_KEY_PREFIX?.trim() || "featureflags_",
  };
}

class OpenCloudError extends Error {
  status: number;
  body: string;

  constructor(message: string, opts: { status: number; body: string }) {
    super(message);
    this.name = "OpenCloudError";
    this.status = opts.status;
    this.body = opts.body;
  }
}

async function openCloudFetch(path: string, init: RequestInit): Promise<Response> {
  const cfg = getOpenCloudConfig();
  if (!cfg) {
    throw new Error(
      "Roblox Open Cloud is not configured (set ROBLOX_OPEN_CLOUD_API_KEY and ROBLOX_UNIVERSE_ID)"
    );
  }

  const headers = new Headers(init.headers);
  headers.set("x-api-key", cfg.apiKey);
  headers.set("accept", "application/json");

  return fetch(`${OPEN_CLOUD_BASE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}

type DataStoreGetResult<T> = { found: true; value: T; version: string | null } | { found: false };

export async function getStandardDataStoreEntry<T>(opts: {
  universeIdOverride?: number;
  datastore: OpenCloudDataStoreRef;
  entryKey: string;
}): Promise<DataStoreGetResult<T>> {
  const cfg = getOpenCloudConfig();
  if (!cfg) {
    throw new Error(
      "Roblox Open Cloud is not configured (set ROBLOX_OPEN_CLOUD_API_KEY and ROBLOX_UNIVERSE_ID)"
    );
  }
  const universeId = opts.universeIdOverride ?? cfg.universeId;

  const params = new URLSearchParams({
    datastoreName: opts.datastore.datastoreName,
    entryKey: opts.entryKey,
  });
  if (opts.datastore.scope) params.set("scope", opts.datastore.scope);

  const res = await openCloudFetch(
    `/datastores/v1/universes/${universeId}/standard-datastores/datastore/entries/entry?${params.toString()}`,
    { method: "GET" }
  );

  if (res.status === 204) return { found: false };

  if (!res.ok) {
    const body = await res.text();
    throw new OpenCloudError("Failed to get DataStore entry", { status: res.status, body });
  }

  const version = res.headers.get("roblox-entry-version");
  const value = (await res.json()) as T;
  return { found: true, value, version };
}

export async function setStandardDataStoreEntry(opts: {
  universeIdOverride?: number;
  datastore: OpenCloudDataStoreRef;
  entryKey: string;
  value: unknown;
  matchVersion?: string | null;
  exclusiveCreate?: boolean;
}): Promise<void> {
  const cfg = getOpenCloudConfig();
  if (!cfg) {
    throw new Error(
      "Roblox Open Cloud is not configured (set ROBLOX_OPEN_CLOUD_API_KEY and ROBLOX_UNIVERSE_ID)"
    );
  }
  const universeId = opts.universeIdOverride ?? cfg.universeId;

  const params = new URLSearchParams({
    datastoreName: opts.datastore.datastoreName,
    entryKey: opts.entryKey,
  });
  if (opts.datastore.scope) params.set("scope", opts.datastore.scope);
  if (opts.matchVersion) params.set("matchVersion", opts.matchVersion);
  if (opts.exclusiveCreate !== undefined)
    params.set("exclusiveCreate", String(opts.exclusiveCreate));

  const res = await openCloudFetch(
    `/datastores/v1/universes/${universeId}/standard-datastores/datastore/entries/entry?${params.toString()}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(opts.value),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new OpenCloudError("Failed to set DataStore entry", { status: res.status, body });
  }
}

export async function updateStandardDataStoreEntry<TIn, TOut>(opts: {
  universeIdOverride?: number;
  datastore: OpenCloudDataStoreRef;
  entryKey: string;
  update: (current: TIn | undefined) => TOut;
}): Promise<void> {
  const existing = await getStandardDataStoreEntry<TIn>({
    universeIdOverride: opts.universeIdOverride,
    datastore: opts.datastore,
    entryKey: opts.entryKey,
  });

  const nextValue = opts.update(existing.found ? existing.value : undefined);

  await setStandardDataStoreEntry({
    universeIdOverride: opts.universeIdOverride,
    datastore: opts.datastore,
    entryKey: opts.entryKey,
    value: nextValue,
    matchVersion: existing.found ? existing.version : undefined,
  });
}

export async function publishMessagingService(opts: {
  universeIdOverride?: number;
  topic: string;
  message: string;
}): Promise<void> {
  const cfg = getOpenCloudConfig();
  if (!cfg) {
    throw new Error(
      "Roblox Open Cloud is not configured (set ROBLOX_OPEN_CLOUD_API_KEY and ROBLOX_UNIVERSE_ID)"
    );
  }
  const universeId = opts.universeIdOverride ?? cfg.universeId;

  const res = await openCloudFetch(
    `/messaging-service/v1/universes/${universeId}/topics/${encodeURIComponent(opts.topic)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: opts.message }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new OpenCloudError("Failed to publish MessagingService message", {
      status: res.status,
      body,
    });
  }
}

// ---------------------------------------------------------------------------
// Ordered DataStore — Leaderboards
// ---------------------------------------------------------------------------

export interface OrderedDataStoreEntry {
  path: string;
  id: string;
  value: number;
}

interface OrderedDataStoreListResponse {
  orderedDataStoreEntries: OrderedDataStoreEntry[];
  nextPageToken?: string;
}

/**
 * Read entries from an OrderedDataStore via the Open Cloud v2 API.
 *
 * @see https://create.roblox.com/docs/cloud/reference/OrderedDataStore
 */
export async function getOrderedDataStoreEntries(opts: {
  universeIdOverride?: number;
  datastoreName: string;
  scope?: string;
  maxPageSize?: number;
  orderBy?: "desc" | "asc";
  pageToken?: string;
}): Promise<{ entries: OrderedDataStoreEntry[]; nextPageToken?: string }> {
  const cfg = getOpenCloudConfig();
  if (!cfg) {
    throw new Error(
      "Roblox Open Cloud is not configured (set ROBLOX_OPEN_CLOUD_API_KEY and ROBLOX_UNIVERSE_ID)"
    );
  }
  const universeId = opts.universeIdOverride ?? cfg.universeId;
  const scope = opts.scope ?? "global";
  const maxPageSize = opts.maxPageSize ?? 25;
  const orderBy = opts.orderBy === "asc" ? "" : "desc";

  const params = new URLSearchParams({
    max_page_size: String(maxPageSize),
  });
  if (orderBy) params.set("order_by", orderBy);
  if (opts.pageToken) params.set("page_token", opts.pageToken);

  const path = `/ordered-data-stores/v1/universes/${universeId}/orderedDataStores/${encodeURIComponent(opts.datastoreName)}/scopes/${encodeURIComponent(scope)}/entries?${params.toString()}`;

  const res = await openCloudFetch(path, { method: "GET" });

  if (!res.ok) {
    const body = await res.text();
    throw new OpenCloudError("Failed to read OrderedDataStore entries", {
      status: res.status,
      body,
    });
  }

  const data = (await res.json()) as OrderedDataStoreListResponse;

  return {
    entries: data.orderedDataStoreEntries ?? [],
    nextPageToken: data.nextPageToken,
  };
}

export function summarizeOpenCloudError(error: unknown): string {
  if (error instanceof OpenCloudError) {
    const body = error.body.length > 500 ? `${error.body.slice(0, 497)}...` : error.body;
    return `Open Cloud error (${error.status}): ${body}`;
  }

  if (error instanceof Error) return error.message;
  return "Unknown error";
}
