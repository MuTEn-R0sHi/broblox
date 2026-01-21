/**
 * Game Server Entry Point
 * Phase 0.5: Minimal bootstrap to verify tooling end-to-end.
 */

import { Players, ReplicatedStorage } from "@rbxts/services";
import { ok, err, ErrorCode, PROTOCOL_VERSION, createPlayerId } from "@rbx/shared-types";
import { createLogger } from "@rbx/core";
import { isFlagEnabled } from "@rbx/config-featureflags";
import { validateDoActionPayload, validateHandshakePayload, REMOTES, RateLimiter } from "@rbx/net";

// ============================================================================
// Bootstrap
// ============================================================================

const logger = createLogger("Server");

// Create remotes folder
const remotesFolder = new Instance("Folder");
remotesFolder.Name = "Remotes";
remotesFolder.Parent = ReplicatedStorage;

// Create rate limiters
const handshakeLimiter = new RateLimiter(REMOTES.Handshake.rateLimit);
const doActionLimiter = new RateLimiter(REMOTES.DoAction.rateLimit);

// Create remotes
const handshakeRemote = new Instance("RemoteFunction");
handshakeRemote.Name = REMOTES.Handshake.name;
handshakeRemote.Parent = remotesFolder;

const doActionRemote = new Instance("RemoteFunction");
doActionRemote.Name = REMOTES.DoAction.name;
doActionRemote.Parent = remotesFolder;

// ============================================================================
// Handlers
// ============================================================================

handshakeRemote.OnServerInvoke = (player: Player, payload: unknown) => {
  // Rate limit
  const rateResult = handshakeLimiter.check(player.UserId);
  if (!rateResult.ok) {
    return rateResult;
  }

  // Validate
  const validated = validateHandshakePayload(payload);
  if (!validated.ok) {
    logger.warn(`Invalid handshake from ${player.Name}`);
    return validated;
  }

  // Check protocol version
  if (validated.value.protocolVersion !== PROTOCOL_VERSION) {
    logger.warn(`Protocol mismatch from ${player.Name}: ${validated.value.protocolVersion}`);
    return err(ErrorCode.ProtocolMismatch);
  }

  logger.info(`Player ${player.Name} connected: build=${validated.value.buildId}`);
  return ok({
    serverVersion: PROTOCOL_VERSION,
    serverTime: os.clock() * 1000,
  });
};

doActionRemote.OnServerInvoke = (player: Player, payload: unknown) => {
  // Rate limit
  const rateResult = doActionLimiter.check(player.UserId);
  if (!rateResult.ok) {
    return rateResult;
  }

  // Check kill-switch
  if (!isFlagEnabled("doAction.enabled")) {
    return err(ErrorCode.FeatureDisabled);
  }

  // Validate
  const validated = validateDoActionPayload(payload);
  if (!validated.ok) {
    return validated;
  }

  logger.debug(`DoAction from ${player.Name}: ${validated.value.actionId}`);
  return ok({
    actionId: validated.value.actionId,
    processedAt: os.clock() * 1000,
    playerId: createPlayerId(player.UserId),
  });
};

// ============================================================================
// Player Lifecycle
// ============================================================================

Players.PlayerRemoving.Connect((player) => {
  handshakeLimiter.reset(player.UserId);
  doActionLimiter.reset(player.UserId);
  logger.debug(`Player left: ${player.Name}`);
});

// ============================================================================
// Startup
// ============================================================================

logger.info(`Server started: protocol=${PROTOCOL_VERSION}`);
