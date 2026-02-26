import { createChatModerationService } from "@broblox/moderation";

const handle = createChatModerationService();

export const ChatModerationService = handle.Service;
