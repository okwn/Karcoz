import { PrismaClient } from '@prisma/client';
export declare class AuthService {
    private prisma;
    constructor(prisma: PrismaClient);
    createMagicLink(email: string, type: 'login' | 'register'): Promise<string>;
    verifyMagicLink(token: string): Promise<{
        userId: string;
        email: string;
    }>;
    createSession(userId: string, ipAddress?: string, userAgent?: string): Promise<{
        token: string;
        expiresAt: Date;
    }>;
    validateSession(token: string): Promise<{
        userId: string;
        sessionId: string;
    } | null>;
    deleteSession(token: string): Promise<void>;
    deleteAllUserSessions(userId: string): Promise<void>;
    createExtensionToken(userId: string, deviceName?: string): Promise<{
        token: string;
        expiresAt: Date;
    }>;
    validateExtensionToken(token: string): Promise<{
        userId: string;
        tokenId: string;
    } | null>;
    revokeExtensionToken(token: string): Promise<void>;
    listExtensionTokens(userId: string): Promise<{
        id: string;
        createdAt: Date;
        expiresAt: Date;
        deviceName: string | null;
        lastUsedAt: Date | null;
    }[]>;
    getUserSettings(userId: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        updatedAt: Date;
        storeHistory: boolean;
        storeImages: boolean;
        maxHistoryItems: number;
        explanationLevel: string;
        resultMode: string;
        telegramEnabled: boolean;
    }>;
    updateUserSettings(userId: string, data: {
        storeHistory?: boolean;
        storeImages?: boolean;
        maxHistoryItems?: number;
        explanationLevel?: string;
        resultMode?: string;
        telegramEnabled?: boolean;
    }): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        updatedAt: Date;
        storeHistory: boolean;
        storeImages: boolean;
        maxHistoryItems: number;
        explanationLevel: string;
        resultMode: string;
        telegramEnabled: boolean;
    }>;
    exportUserData(userId: string): Promise<{
        exportedAt: number;
        userId: string;
        email: string | null;
        questions: {
            id: string;
            sourceUrl: string | null;
            pageTitle: string | null;
            sourceType: string;
            extractedText: string;
            normalizedText: string;
            questionType: string;
            topic: string | null;
            shortAnswer: string | null;
            fullExplanation: string | null;
            confidenceScore: number | null;
            status: string;
            createdAt: number;
            updatedAt: number;
        }[];
        settings: {
            id: string;
            createdAt: Date;
            userId: string;
            updatedAt: Date;
            storeHistory: boolean;
            storeImages: boolean;
            maxHistoryItems: number;
            explanationLevel: string;
            resultMode: string;
            telegramEnabled: boolean;
        } | null;
    }>;
    deleteAllUserHistory(userId: string): Promise<{
        deleted: number;
    }>;
    deleteUserAccount(userId: string): Promise<void>;
}
//# sourceMappingURL=auth.service.d.ts.map