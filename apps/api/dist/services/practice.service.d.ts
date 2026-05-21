import type { PrismaClient } from '@prisma/client';
import type { PracticeGenerationRequest, PracticeGenerationResponse } from '@karcoz/shared';
export declare function createPracticeService(prisma: PrismaClient): {
    generatePracticeSet: (userId: string, request: PracticeGenerationRequest) => Promise<PracticeGenerationResponse>;
    getPracticeSets: (userId?: string) => Promise<{
        id: string;
        topic: string;
        subtopic: string | null;
        difficulty: string;
        language: string;
        basedOnQuestionId: string | null;
        createdAt: Date;
        questionCount: number;
        attemptCount: number;
    }[]>;
    getPracticeSet: (id: string, userId?: string) => Promise<{
        id: string;
        topic: string;
        subtopic: string | null;
        difficulty: string;
        language: string;
        basedOnQuestionId: string | null;
        createdAt: Date;
        questions: {
            id: string;
            questionText: string;
            options: {
                label: string;
                value: string;
                order: number;
            }[] | undefined;
            difficulty: string;
            topic: string;
            orderIndex: number;
        }[];
        recentAttempts: {
            id: string;
            score: number;
            totalQuestions: number;
            completedAt: Date;
            timeSpentMs: number | null;
        }[];
    } | null>;
    submitAttempt: (practiceSetId: string, userId: string, answers: {
        questionId: string;
        answer: string;
    }[], timeSpentMs?: number) => Promise<{
        attemptId: string;
        score: number;
        totalQuestions: number;
        correctCount: number;
        results: {
            questionId: string;
            correctAnswer: string;
            userAnswer: string;
            isCorrect: boolean;
            explanation?: string;
        }[];
    }>;
    getRecommended: (count?: number, userId?: string) => Promise<{
        topic: string;
        reason: string;
        questionCount: number;
        difficulty: "easy" | "medium" | "hard";
    }[]>;
};
//# sourceMappingURL=practice.service.d.ts.map