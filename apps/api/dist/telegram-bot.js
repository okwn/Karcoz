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
import { PrismaClient } from '@prisma/client';
import { createTelegramService } from './services/telegram.service.js';
import { createSolveService } from './services/solve.service.js';
import { validateEnv } from './config/env.js';
// Validate environment before starting — fail fast in production
validateEnv();
const prisma = new PrismaClient();
const telegramService = createTelegramService(prisma);
const solveService = createSolveService(prisma);
class KarcozTelegramBot {
    constructor(botToken, appBaseUrl = 'http://localhost:3100') {
        this.offset = 0;
        this.running = false;
        this.appBaseUrl = appBaseUrl;
        this.config = {
            botToken,
            apiBase: `https://api.telegram.org/bot${botToken}`,
        };
    }
    buildUrl(path) {
        return `${this.appBaseUrl.replace(/\/$/, '')}${path}`;
    }
    async start() {
        console.log('[TELEGRAM_BOT] Starting KARÇÖZ bot...');
        this.running = true;
        await this.poll();
    }
    async stop() {
        this.running = false;
        console.log('[TELEGRAM_BOT] Stopped');
    }
    async poll() {
        while (this.running) {
            try {
                await this.getUpdates();
            }
            catch (err) {
                console.error('[TELEGRAM_BOT] Poll error:', err);
                await sleep(5000);
            }
        }
    }
    async getUpdates() {
        const url = `${this.config.apiBase}/getUpdates?offset=${this.offset}&timeout=10`;
        const res = await fetch(url);
        if (!res.ok)
            throw new Error(`Telegram API error: ${res.status}`);
        const data = await res.json();
        if (!data.ok || !data.result.length)
            return;
        for (const update of data.result) {
            await this.handleUpdate(update);
            this.offset = update.update_id + 1;
        }
    }
    async handleUpdate(update) {
        const msg = update.message;
        if (!msg)
            return;
        const chatId = msg.chat.id.toString();
        const text = msg.text;
        const from = msg.from;
        const username = from?.username;
        await telegramService.updateLastActivity(chatId);
        if (text?.startsWith('/')) {
            const command = text.slice(1).toLowerCase().split(' ')[0];
            await this.handleCommand(command, chatId, username);
        }
        else if (msg.photo && msg.photo.length > 0) {
            await this.handlePhoto(chatId, msg.photo, msg.caption, username);
        }
    }
    async handleCommand(command, chatId, username) {
        switch (command) {
            case 'start':
                await this.sendHelp(chatId);
                break;
            case 'help':
                await this.sendHelp(chatId);
                break;
            case 'link':
                await this.handleLink(chatId, username);
                break;
            case 'unlink':
                await this.handleUnlink(chatId);
                break;
            case 'solve':
                await this.sendMessage(chatId, '📷 *Solve a Question*\n\nSend me a photo of your question and I\'ll solve it for you! You can also paste question text directly.');
                break;
            case 'history':
                await this.sendMessage(chatId, '📜 *Your History*\n\nView your complete study history on the KARÇÖZ dashboard:\n\n👉 ' + this.buildUrl('/history') + '\n\nAll your solved questions and progress are saved there.');
                break;
            case 'practice':
                await this.sendMessage(chatId, '🎯 *Practice Mode*\n\nStart a practice session to reinforce your knowledge:\n\n👉 ' + this.buildUrl('/practice') + '\n\nChoose a topic, difficulty, and number of questions.');
                break;
            case 'status':
                await this.handleStatus(chatId);
                break;
            default:
                await this.sendMessage(chatId, '❓ Unknown command. Use /help to see available commands.');
        }
    }
    async handlePhoto(chatId, photo, caption, username) {
        const account = await telegramService.getAccountByChatId(chatId);
        if (!account?.isLinked) {
            await this.sendMessage(chatId, '⚠️ Your Telegram is not linked to KARÇÖZ.\n\nUse /link to connect your account first.');
            return;
        }
        await this.sendMessage(chatId, '🧠 Processing your question image...');
        try {
            // Get file path from file_id
            const fileRes = await fetch(`${this.config.apiBase}/getFile?file_id=${photo[photo.length - 1].file_id}`);
            const fileData = await fileRes.json();
            if (!fileData.ok || !fileData.result)
                throw new Error('Could not get file');
            // Download photo
            const photoUrl = `https://api.telegram.org/file/bot${this.config.botToken}/${fileData.result.file_path}`;
            const photoRes = await fetch(photoUrl);
            const buffer = await photoRes.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');
            // Solve via API
            const result = await solveService.solveFromImage({ imageBase64: base64, sourceType: 'upload', pageTitle: `Telegram:${chatId}`, explanationLevel: 'standard', resultMode: 'full' }, { requestId: `tg_${Date.now()}`, ipAddress: 'telegram', userAgent: 'telegram-bot' });
            const answer = result.solution.shortAnswer;
            const explanation = result.solution.fullExplanation?.slice(0, 500) ?? '';
            await this.sendMessage(chatId, `✅ *Solved!*\n\n` +
                `📝 *Answer:* ${answer}\n\n` +
                `💡 *Explanation:*\n${explanation}\n\n` +
                `🔗 [View full solution](${this.buildUrl('/questions/' + result.questionId)})\n` +
                `📚 [Practice similar questions](${this.buildUrl('/practice')})`);
        }
        catch (err) {
            console.error('[TELEGRAM_BOT] Solve error:', err);
            await this.sendMessage(chatId, '❌ Sorry, I couldn\'t solve that question. Please try again or use the dashboard.');
        }
    }
    async handleLink(chatId, username) {
        const account = await telegramService.getAccountByChatId(chatId);
        if (account?.isLinked) {
            await this.sendMessage(chatId, `✅ *Already Linked*\n\n` +
                `Chat ID: \`${chatId}\`\n` +
                `Username: @${username ?? 'unknown'}\n\n` +
                `Your Telegram is connected to KARÇÖZ. Use /unlink to disconnect.`);
        }
        else {
            await this.sendMessage(chatId, `🔗 *Link Your Telegram*\n\n` +
                `To link your Telegram account:\n\n` +
                `1. Open KARÇÖZ dashboard → Settings\n` +
                `2. Find "Telegram Integration"\n` +
                `3. Enter your chat ID: \`${chatId}\`\n\n` +
                `Then return here and use /link to confirm.`);
        }
    }
    async handleUnlink(chatId) {
        const account = await telegramService.getAccountByChatId(chatId);
        if (!account || !account.isLinked) {
            await this.sendMessage(chatId, 'ℹ️ Your Telegram is not currently linked to KARÇÖZ.');
            return;
        }
        await telegramService.unlinkAccount(chatId);
        await this.sendMessage(chatId, '🔓 *Unlinked*\n\nYour Telegram has been disconnected from KARÇÖZ. Use /link to reconnect anytime.');
    }
    async handleStatus(chatId) {
        const account = await telegramService.getAccountByChatId(chatId);
        if (account?.isLinked) {
            await this.sendMessage(chatId, `✅ *KARÇÖZ Linked*\n\n` +
                `Chat ID: \`${chatId}\`\n` +
                `Linked: ${new Date(account.linkedAt).toLocaleDateString()}\n\n` +
                `Available: /history · /practice · /solve`);
        }
        else {
            await this.sendMessage(chatId, '❌ Not linked. Use /link to connect.');
        }
    }
    async sendHelp(chatId) {
        await this.sendMessage(chatId, `📚 *KARÇÖZ Study Bot*\n\n` +
            `Your AI study assistant. Send a question image and get an instant solution.\n\n` +
            `*Commands:*\n` +
            `/start — Welcome message\n` +
            `/help — Show this help\n` +
            `/link — Link your Telegram account\n` +
            `/unlink — Unlink your account\n` +
            `/solve — Get solving instructions\n` +
            `/history — View your study history\n` +
            `/practice — Start a practice session\n` +
            `/status — Check link status\n\n` +
            `*Quick Use:*\n` +
            `Just send me a photo of your question!`);
    }
    async sendMessage(chatId, text) {
        try {
            const res = await fetch(`${this.config.apiBase}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text,
                    parse_mode: 'Markdown',
                    disable_web_page_preview: true,
                }),
            });
            if (!res.ok) {
                console.error('[TELEGRAM_BOT] Send failed:', res.status, await res.text());
            }
        }
        catch (err) {
            console.error('[TELEGRAM_BOT] Send error:', err);
        }
    }
}
// Run bot if executed directly
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_BASE_URL = process.env.APP_BASE_URL ?? 'http://localhost:3100';
function buildUrl(path) {
    return `${APP_BASE_URL.replace(/\/$/, '')}${path}`;
}
if (!BOT_TOKEN) {
    console.warn('[TELEGRAM_BOT] TELEGRAM_BOT_TOKEN not set — bot not starting');
    console.warn('Set TELEGRAM_BOT_TOKEN env var to start the bot');
}
else {
    const bot = new KarcozTelegramBot(BOT_TOKEN, APP_BASE_URL);
    bot.start().catch(console.error);
    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log('[TELEGRAM_BOT] Shutting down...');
        await bot.stop();
        await prisma.$disconnect();
        process.exit(0);
    });
}
export { KarcozTelegramBot };
//# sourceMappingURL=telegram-bot.js.map