/**
 * Feature Flag Sync (Roblox runtime)
 *
 * Loads feature flag overrides from a DataStore and invalidates/reloads on
 * MessagingService events.
 */

import { createLogger } from "@broblox/core";
import { applyRemoteFeatureFlagSnapshot, type RemoteFeatureFlagSnapshot } from "./overrides";

const logger = createLogger("FeatureFlags.Sync");

declare const game: {
  GetService(name: "DataStoreService"): DataStoreService;
  GetService(name: "MessagingService"): MessagingService;
  GetService(name: "HttpService"): HttpService;
};

type RuntimeEnvironment = "development" | "staging" | "production";

export type FeatureFlagSyncConfig = {
  datastoreName?: string;
  scope?: string;
  environment: RuntimeEnvironment;
  entryKeyPrefix?: string;
  topic?: string;
};

type SyncMessage = {
  environment?: RuntimeEnvironment;
  updatedAt?: number;
};

interface DataStoreService {
  GetDataStore(name: string, scope?: string): DataStore;
}

interface DataStore {
  GetAsync(key: string): LuaTuple<[unknown, unknown]>;
}

interface MessagingService {
  SubscribeAsync(
    topic: string,
    callback: (message: { Data: unknown; Sent: number }) => void
  ): RBXScriptConnection;
}

interface HttpService {
  JSONDecode(input: string): unknown;
}

class FeatureFlagSyncService {
  private static instance: FeatureFlagSyncService | undefined;

  private readonly store: DataStore;
  private readonly messaging: MessagingService;
  private readonly http: HttpService;

  private readonly environment: RuntimeEnvironment;
  private readonly entryKey: string;
  private readonly topic: string;

  private connection: RBXScriptConnection | undefined;

  private constructor(cfg: FeatureFlagSyncConfig) {
    const datastoreName = cfg.datastoreName ?? "TestParkFeatureFlags";
    const entryKeyPrefix = cfg.entryKeyPrefix ?? "featureflags_";

    this.environment = cfg.environment;
    this.entryKey = `${entryKeyPrefix}${cfg.environment}`;
    this.topic = cfg.topic ?? "FeatureFlagsSync";

    const dss = game.GetService("DataStoreService");
    this.store = dss.GetDataStore(datastoreName, cfg.scope);

    this.messaging = game.GetService("MessagingService");
    this.http = game.GetService("HttpService");

    this.subscribe();
    this.refresh();

    logger.info(`FeatureFlags sync enabled (${this.environment})`);
  }

  static init(cfg: FeatureFlagSyncConfig): FeatureFlagSyncService {
    if (!FeatureFlagSyncService.instance) {
      FeatureFlagSyncService.instance = new FeatureFlagSyncService(cfg);
    }
    return FeatureFlagSyncService.instance;
  }

  static getInstance(): FeatureFlagSyncService | undefined {
    return FeatureFlagSyncService.instance;
  }

  refresh(): void {
    const [ok, rawOrErr, _keyInfo] = pcall(() => this.store.GetAsync(this.entryKey));

    if (!ok) {
      logger.warn(`Failed to load feature flags (key=${this.entryKey}): ${tostring(rawOrErr)}`);
      return;
    }

    const raw = rawOrErr as unknown;

    if (raw === undefined) {
      logger.debug(`No feature flag snapshot found (key=${this.entryKey})`);
      return;
    }

    if (typeOf(raw) !== "table") {
      logger.warn(`Invalid feature flag snapshot type: ${typeOf(raw)}`);
      return;
    }

    const snapshot = raw as RemoteFeatureFlagSnapshot;
    if (snapshot.flags === undefined || typeOf(snapshot.flags as unknown) !== "table") {
      logger.warn("Invalid feature flag snapshot payload (missing flags)");
      return;
    }

    applyRemoteFeatureFlagSnapshot(snapshot);
    logger.debug(`Applied feature flag snapshot (key=${this.entryKey})`);
  }

  private subscribe(): void {
    if (this.connection) return;

    const [ok, connOrErr] = pcall(() =>
      this.messaging.SubscribeAsync(this.topic, (message) => {
        const raw = message.Data;
        let decoded: SyncMessage | undefined;

        if (typeOf(raw) === "string") {
          try {
            decoded = this.http.JSONDecode(raw as string) as SyncMessage;
          } catch (err) {
            logger.warn(`Failed to decode feature flag sync message: ${tostring(err)}`);
            return;
          }
        } else if (typeOf(raw) === "table") {
          decoded = raw as SyncMessage;
        }

        if (!decoded) return;

        if (decoded.environment && decoded.environment !== this.environment) {
          return;
        }

        this.refresh();
      })
    );

    if (!ok) {
      logger.warn(`Failed to subscribe to feature flag updates: ${tostring(connOrErr)}`);
      return;
    }

    this.connection = connOrErr as RBXScriptConnection;
  }
}

/**
 * Initialize cross-server feature flag propagation.
 */
export function initFeatureFlagSync(cfg: FeatureFlagSyncConfig): void {
  FeatureFlagSyncService.init(cfg);
}

/**
 * Force a refresh from DataStore (if sync was initialized).
 */
export function refreshFeatureFlags(): void {
  FeatureFlagSyncService.getInstance()?.refresh();
}
