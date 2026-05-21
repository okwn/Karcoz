/**
 * KARÇÖZ Telegram Bot Service
 *
 * Standalone bot process that handles Telegram commands and messages.
 * Run separately from the main API server.
 *
 * Commands:
 *   /start        — Welcome message + link instructions
 *   /help         — Show all available commands
 *   /link         — Show link code / check link status
 *   /unlink       — Unlink this Telegram from KARÇÖZ
 *   /solve        — Prompt to send a question image
 *   /history      — Link to web dashboard history
 *   /practice     — Link to practice dashboard
 *
 * Safety: This bot ONLY acts on explicit user commands.
 * No automatic forwarding, no background capture.
 */
declare class KarcozTelegramBot {
    private config;
    private appBaseUrl;
    private offset;
    private running;
    constructor(botToken: string, appBaseUrl?: string);
    private buildUrl;
    start(): Promise<void>;
    stop(): Promise<void>;
    private poll;
    private getUpdates;
    private handleUpdate;
    private handleCommand;
    private handlePhoto;
    private handleLink;
    private handleUnlink;
    private handleStatus;
    private sendHelp;
    private sendMessage;
}
export { KarcozTelegramBot };
//# sourceMappingURL=telegram-bot.d.ts.map