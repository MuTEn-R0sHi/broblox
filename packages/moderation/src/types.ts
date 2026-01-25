/**
 * Moderation Types
 */

// ============================================================================
// Ban Types
// ============================================================================

export type BanType = "TEMPORARY" | "PERMANENT";

export type BanStatus = "ACTIVE" | "EXPIRED" | "REVOKED" | "APPEALED";

export interface BanRecord {
  /** Unique ban ID */
  id: string;
  /** Roblox UserId */
  playerId: number;
  /** Cached player name */
  playerName?: string;
  /** Ban type */
  type: BanType;
  /** Current status */
  status: BanStatus;
  /** Reason shown to player */
  reason: string;
  /** Internal note for moderators */
  internalNote?: string;
  /** Duration in hours (null = permanent) */
  durationHours?: number;
  /** Expiry timestamp (Unix seconds) */
  expiresAt?: number;
  /** Who issued the ban */
  moderatorId: string;
  /** When ban was created (Unix seconds) */
  createdAt: number;
  /** When ban was revoked */
  revokedAt?: number;
  /** Who revoked the ban */
  revokedById?: string;
  /** Revocation reason */
  revokeReason?: string;
}

export interface BanCheckResult {
  isBanned: boolean;
  ban?: BanRecord;
  message: string;
}

export interface CreateBanInput {
  playerId: number;
  playerName?: string;
  type: BanType;
  reason: string;
  internalNote?: string;
  durationHours?: number;
  moderatorId: string;
}

// ============================================================================
// Mute Types
// ============================================================================

export type MuteType = "chat" | "voice" | "all";

export interface MuteRecord {
  /** Unique mute ID */
  id: string;
  /** Roblox UserId */
  playerId: number;
  /** Mute type */
  type: MuteType;
  /** Is currently active */
  isActive: boolean;
  /** Reason */
  reason: string;
  /** Duration in minutes */
  durationMinutes: number;
  /** Expiry timestamp (Unix seconds) */
  expiresAt: number;
  /** Who issued the mute */
  moderatorId: string;
  /** When mute was created (Unix seconds) */
  createdAt: number;
}

export interface MuteCheckResult {
  isMuted: boolean;
  mute?: MuteRecord;
  expiresIn?: number; // seconds until expiry
}

export interface CreateMuteInput {
  playerId: number;
  type: MuteType;
  reason: string;
  durationMinutes: number;
  moderatorId: string;
}

// ============================================================================
// Service Configuration
// ============================================================================

export interface ModerationConfig {
  /** DataStore name for moderation records */
  datastoreName?: string;
  /** Seconds between dashboard sync checks */
  syncInterval?: number;
  /** MessagingService topic for cross-server sync */
  messagingTopic?: string;
  /** Custom ban check handler */
  onBanCheck?: (player: Player, ban: BanRecord) => void;
  /** Custom mute notification handler */
  onMuteCheck?: (player: Player, mute: MuteRecord) => void;
  /** Whether to log moderation actions */
  enableLogging?: boolean;
}

export const DEFAULT_MODERATION_CONFIG: Required<ModerationConfig> = {
  datastoreName: "PlayerModeration",
  syncInterval: 60,
  messagingTopic: "moderation",
  onBanCheck: () => {},
  onMuteCheck: () => {},
  enableLogging: true,
};

// ============================================================================
// Sync Types
// ============================================================================

export type ModerationSyncAction = "ban.create" | "ban.revoke" | "mute.create" | "mute.expire";

export interface ModerationSyncMessage {
  action: ModerationSyncAction;
  playerId: number;
  data?: BanRecord | MuteRecord;
  timestamp: number;
}
