import { Service, createLogger } from "@rbx/core";
import { Players, TextChatService } from "@rbxts/services";

const logger = createLogger("ChatModerationService");

const MUTED_ATTRIBUTE = "rbx.moderation.muted";

export const ChatModerationService: Service = {
  onInit() {
    // TextChatService filtering (works with the modern chat system).
    // If a muted player sends a message, we blank it out.
    TextChatService.OnIncomingMessage = (message) => {
      const source = message.TextSource;
      if (!source) return;

      const player = Players.GetPlayerByUserId(source.UserId);
      if (!player) return;

      const isMuted = player.GetAttribute(MUTED_ATTRIBUTE) === true;
      if (!isMuted) return;

      const props = new Instance("TextChatMessageProperties");
      props.Text = "";
      props.PrefixText = "";
      return props;
    };

    logger.info("Chat moderation enabled (muted players cannot chat)");
  },
};
