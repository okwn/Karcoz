import { createTelegramService } from '../services/telegram.service.js';
import { requireSession } from '../middleware/session-auth.js';
import { TelegramLinkAccountSchema, TelegramSendSolutionSchema, } from '@karcoz/shared';
function generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
export function registerTelegramRoutes(app, prisma) {
    const telegramService = createTelegramService(prisma);
    // POST /api/telegram/link-account
    app.post('/api/telegram/link-account', { preHandler: requireSession }, async (request, reply) => {
        const requestId = generateRequestId();
        const parsed = TelegramLinkAccountSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({
                error: {
                    code: 'INVALID_REQUEST',
                    message: 'Invalid request body',
                    details: parsed.error.flatten(),
                    requestId,
                },
            });
        }
        // For linking, we use a simple userId from header or query
        // In production, this would come from session/JWT auth
        const userId = request.headers['x-user-id'] || 'anonymous';
        const { telegramChatId, telegramUsername, displayName } = parsed.data;
        try {
            const account = await telegramService.linkAccount(userId, telegramChatId, telegramUsername, displayName);
            return reply.status(200).send({
                success: true,
                linked: true,
                telegramChatId: account.telegramChatId,
                displayName: account.displayName,
            });
        }
        catch (err) {
            if (err?.code === 'ALREADY_LINKED') {
                return reply.status(409).send({ error: { code: err.code, message: err.message } });
            }
            console.error('[TELEGRAM/LINK] Unexpected error:', err);
            return reply.status(500).send({
                error: { code: 'INTERNAL_ERROR', message: 'Failed to link account', requestId },
            });
        }
    });
    // POST /api/telegram/unlink-account
    app.post('/api/telegram/unlink-account', { preHandler: requireSession }, async (request, reply) => {
        const requestId = generateRequestId();
        const body = request.body;
        if (!body?.telegramChatId) {
            return reply.status(400).send({
                error: { code: 'INVALID_REQUEST', message: 'telegramChatId is required', requestId },
            });
        }
        try {
            const result = await telegramService.unlinkAccount(body.telegramChatId);
            return reply.status(200).send(result);
        }
        catch (err) {
            if (err?.code === 'NOT_FOUND') {
                return reply.status(404).send({ error: { code: 'NOT_FOUND', message: err.message } });
            }
            console.error('[TELEGRAM/UNLINK] Unexpected error:', err);
            return reply.status(500).send({
                error: { code: 'INTERNAL_ERROR', message: 'Failed to unlink account', requestId },
            });
        }
    });
    // GET /api/telegram/status
    app.get('/api/telegram/status', { preHandler: requireSession }, async (request, reply) => {
        const userId = request.headers['x-user-id'] || 'anonymous';
        try {
            const status = await telegramService.getAccountStatus(userId);
            return reply.status(200).send(status);
        }
        catch (err) {
            console.error('[TELEGRAM/STATUS] Error:', err);
            return reply.status(500).send({
                error: { code: 'INTERNAL_ERROR', message: 'Failed to get status' },
            });
        }
    });
    // POST /api/telegram/send-solution
    app.post('/api/telegram/send-solution', async (request, reply) => {
        const requestId = generateRequestId();
        const parsed = TelegramSendSolutionSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({
                error: {
                    code: 'INVALID_REQUEST',
                    message: 'Invalid request body',
                    details: parsed.error.flatten(),
                    requestId,
                },
            });
        }
        try {
            const result = await telegramService.sendSolution(parsed.data.telegramChatId, parsed.data.questionId);
            return reply.status(200).send(result);
        }
        catch (err) {
            if (err?.code === 'NOT_LINKED' || err?.code === 'NOT_FOUND') {
                return reply.status(err.httpStatus || 404).send({ error: { code: err.code, message: err.message } });
            }
            console.error('[TELEGRAM/SEND-SOLUTION] Error:', err);
            return reply.status(500).send({
                error: { code: 'INTERNAL_ERROR', message: 'Failed to send solution', requestId },
            });
        }
    });
    // POST /api/telegram/webhook — receives updates from Telegram
    app.post('/api/telegram/webhook', async (request, reply) => {
        const body = request.body;
        // Handle Telegram Update
        if (body.message) {
            const msg = body.message;
            const chat = msg.chat;
            const chatId = chat?.id?.toString() ?? '';
            const text = msg.text;
            const photo = msg.photo;
            const caption = msg.caption;
            if (!chatId) {
                return reply.status(200).send({ ok: true }); // Silent reject
            }
            // Update last activity
            await telegramService.updateLastActivity(chatId);
            // Text commands
            if (text) {
                const command = text.trim().toLowerCase();
                if (command === '/start' || command === '/help') {
                    await sendTelegramMessage(chatId, '📚 *KARÇÖZ Study Bot*\n\n' +
                        'Your AI study assistant. Send me a question image and I\'ll solve it!\n\n' +
                        '*Commands:*\n' +
                        '/start - Show welcome message\n' +
                        '/help - Show help\n' +
                        '/link - Get your link code\n' +
                        '/solve - Solve a question\n' +
                        '/history - Your recent questions\n' +
                        '/practice - Start a practice session\n' +
                        '/unlink - Unlink this account\n\n' +
                        'Or simply send me a question image!');
                }
                else if (command === '/link') {
                    const account = await telegramService.getAccountByChatId(chatId);
                    if (account?.isLinked) {
                        await sendTelegramMessage(chatId, '✅ Your Telegram is already linked to KARÇÖZ.');
                    }
                    else {
                        await sendTelegramMessage(chatId, '🔗 *Link your Telegram*\n\n' +
                            'Open the KARÇÖZ extension, go to Settings, and enter your Telegram chat ID: `' + chatId + '`');
                    }
                }
                else if (command === '/unlink') {
                    await telegramService.unlinkAccount(chatId);
                    await sendTelegramMessage(chatId, '🔓 Your Telegram has been unlinked from KARÇÖZ.');
                }
                else if (command === '/solve') {
                    await sendTelegramMessage(chatId, '📷 Send me a question image and I\'ll solve it for you!');
                }
                else if (command === '/history') {
                    await sendTelegramMessage(chatId, '📜 Your history is available on the KARÇÖZ dashboard at ' + (process.env.APP_BASE_URL ?? 'http://localhost:3100') + '/history');
                }
                else if (command === '/practice') {
                    await sendTelegramMessage(chatId, '🎯 Start a practice session at ' + (process.env.APP_BASE_URL ?? 'http://localhost:3100') + '/practice');
                }
                else if (text.startsWith('/')) {
                    await sendTelegramMessage(chatId, 'Unknown command. Try /help');
                }
            }
            // Photo handling
            if (photo && photo.length > 0) {
                const fileId = photo[photo.length - 1].file_id;
                // For a real bot we'd download the photo — here we just acknowledge
                await sendTelegramMessage(chatId, '📷 Image received! I\'ll solve this question for you.\n\n' +
                    'Note: Photo solving is available via the dashboard. ' +
                    'Open ' + (process.env.APP_BASE_URL ?? 'http://localhost:3100') + ' and use the scan feature for full image solving.');
                await telegramService.handleIncomingImage(chatId, fileId, caption);
            }
        }
        return reply.status(200).send({ ok: true });
    });
}
// Placeholder for actual Telegram Bot API calls
// In production, use node-telegram-bot-api or similar
async function sendTelegramMessage(chatId, text) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
        console.warn('[TELEGRAM] BOT_TOKEN not set, message not sent:', text.slice(0, 50));
        return;
    }
    try {
        const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: 'Markdown',
            }),
        });
        if (!res.ok) {
            console.error('[TELEGRAM] Send failed:', res.status);
        }
    }
    catch (err) {
        console.error('[TELEGRAM] Send error:', err);
    }
}
//# sourceMappingURL=telegram.routes.js.map