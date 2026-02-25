/**
 * Chat Moderation Service Factory
 *
 * Creates a Service that suppresses chat messages from muted players
 * using the modern TextChatService filtering hook.
 *
 * Reads the `rbx.moderation.muted` attribute set by
 * ModerationEnforcementService.
 */

import { Service, createLogger } from "@rbx/core";

const MUTED_ATTRIBUTE = "rbx.moderation.muted";

export interface ChatModerationHandle {
  /** The Service to register with Application.register(). */
  Service: Service;
}

/**
 * Create a chat moderation service that blanks messages from muted players.
 *
 * @example
 * ```ts
 * const handle = createChatModerationService();
 * export const ChatModerationService = handle.Service;
 * ```
 */
export function createChatModerationService(): ChatModerationHandle {
  const Players = game.GetService("Players") as Players;
  const TextChatService = game.GetService("TextChatService") as TextChatService;
  const logger = createLogger("ChatModerationService");

  const ChatModerationService: Service = {
    onInit() {
      TextChatService.OnIncomingMessage = (message) => {
        const source = message.TextSource;
        if (!source) return undefined;

        const player = Players.GetPlayerByUserId(source.UserId);
        if (!player) return undefined;

        const isMuted = player.GetAttribute(MUTED_ATTRIBUTE) === true;
        if (!isMuted) return undefined;

        const props = new Instance("TextChatMessageProperties");
        props.Text = "";
        props.PrefixText = "";
        return props;
      };

      logger.info("Chat moderation enabled (muted players cannot chat)");
    },
  };

  return { Service: ChatModerationService };
}
