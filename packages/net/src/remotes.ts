// ============================================================================
// Remote Registry
// ============================================================================

export const REMOTES = {
  Handshake: {
    name: "Net_Handshake",
    rateLimit: { windowMs: 60000, maxRequests: 3 },
  },
  DoAction: {
    name: "Intent_DoAction",
    rateLimit: { windowMs: 1000, maxRequests: 5 },
  },
} as const;

export type RemoteName = keyof typeof REMOTES;
