import { createChatModerationService } from "@broblox/moderation";

const handle = createChatModerationService();

export const ChatModerationController = handle.Service;
