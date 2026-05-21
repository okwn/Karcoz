import type { PrismaClient } from '@prisma/client';
export type TelegramAuditAction = 'TELEGRAM_LINK_STARTED' | 'TELEGRAM_ACCOUNT_LINKED' | 'TELEGRAM_SOLUTION_SENT' | 'TELEGRAM_IMAGE_SOLVED' | 'TELEGRAM_ACCOUNT_UNLINKED';
export declare function createTelegramService(prisma: PrismaClient): {
    linkAccount: (userId: string, telegramChatId: string, telegramUsername?: string, displayName?: string) => Promise<{
        id: string;
        createdAt: Date;
        userId: string | null;
        telegramChatId: string;
        telegramUsername: string | null;
        displayName: string | null;
        isLinked: boolean;
        linkedAt: Date;
        unlinkedAt: Date | null;
        lastActivityAt: Date;
    }>;
    unlinkAccount: (telegramChatId: string) => Promise<{
        success: boolean;
    }>;
    getAccountStatus: (userId: string) => Promise<{
        isLinked: boolean;
        telegramChatId?: undefined;
        telegramUsername?: undefined;
        displayName?: undefined;
        linkedAt?: undefined;
    } | {
        isLinked: boolean;
        telegramChatId: string;
        telegramUsername: string | null;
        displayName: string | null;
        linkedAt: number;
    }>;
    getAccountByChatId: (telegramChatId: string) => Promise<{
        id: string;
        createdAt: Date;
        userId: string | null;
        telegramChatId: string;
        telegramUsername: string | null;
        displayName: string | null;
        isLinked: boolean;
        linkedAt: Date;
        unlinkedAt: Date | null;
        lastActivityAt: Date;
    } | null>;
    sendSolution: (telegramChatId: string, questionId: string) => Promise<{
        success: boolean;
        question: {
            id: string;
            topic: string | null;
            questionType: string;
            extractedText: string;
            shortAnswer: string | null;
            fullExplanation: string | null;
            confidenceScore: number | null;
        };
    }>;
    handleIncomingImage: (telegramChatId: string, imageBase64: string, caption?: string) => Promise<{
        userId: string | null;
        accountId: string;
    }>;
    updateLastActivity: (telegramChatId: string) => Promise<void>;
    logAudit: (telegramAccountId: string | undefined, action: TelegramAuditAction, details?: Record<string, unknown>, ipAddress?: string, userAgent?: string, telegramChatId?: string) => Promise<void>;
};
//# sourceMappingURL=telegram.service.d.ts.map