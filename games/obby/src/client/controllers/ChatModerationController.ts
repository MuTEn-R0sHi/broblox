import { createChatModerationService } from "@rbx/moderation";

const handle = createChatModerationService();

export const ChatModerationController = handle.Service;
