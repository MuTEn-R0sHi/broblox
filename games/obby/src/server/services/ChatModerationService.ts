import { createChatModerationService } from "@rbx/moderation";

const handle = createChatModerationService();

export const ChatModerationService = handle.Service;
