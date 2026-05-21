import { MockProvider } from '@karcoz/ai-core';
const mockProvider = new MockProvider();
export function createPracticeService(prisma) {
    async function generatePracticeSet(userId, request) {
        const generatedQuestions = [];
        // Use AI provider to generate questions
        if (mockProvider.generatePractice) {
            const result = await mockProvider.generatePractice({
                topic: request.topic,
                count: request.count,
                questionType: 'multiple_choice',
                language: request.language,
                difficulty: request.difficulty,
            });
            generatedQuestions.push(...result);
        }
        else {
            // Fallback: generate mock questions if provider doesn't support it
            generatedQuestions.push(...generateMockQuestions(request));
        }
        // Validate generated questions
        const validQuestions = generatedQuestions.filter(q => {
            return (q.question?.length >= 10 &&
                q.answer?.length >= 1 &&
                (q.options === undefined || (Array.isArray(q.options) && q.options.length >= 2)));
        });
        if (validQuestions.length === 0) {
            throw { code: 'GENERATION_FAILED', message: 'Failed to generate valid practice questions', httpStatus: 500 };
        }
        // Create practice set in database
        const practiceSet = await prisma.practiceSet.create({
            data: {
                topic: request.topic,
                subtopic: request.subtopic,
                difficulty: request.difficulty,
                language: request.language,
                basedOnQuestionId: request.basedOnQuestionId,
                questions: {
                    create: validQuestions.map((q, index) => ({
                        questionText: q.question,
                        options: q.options,
                        correctAnswer: q.answer,
                        explanation: q.explanation ?? '',
                        difficulty: q.difficulty ?? request.difficulty,
                        topic: request.topic,
                        orderIndex: index,
                    })),
                },
            },
        });
        return {
            practiceSetId: practiceSet.id,
            questions: validQuestions.map(q => ({
                questionText: q.question,
                options: q.options,
                correctAnswer: q.answer,
                explanation: q.explanation,
                difficulty: q.difficulty ?? request.difficulty,
                topic: request.topic,
            })),
        };
    }
    async function getPracticeSets(userId) {
        const where = userId ? { attempts: { some: { userId } } } : {};
        const sets = await prisma.practiceSet.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { questions: true, attempts: true },
                },
            },
        });
        return sets.map((s) => ({
            id: s.id,
            topic: s.topic,
            subtopic: s.subtopic,
            difficulty: s.difficulty,
            language: s.language,
            basedOnQuestionId: s.basedOnQuestionId,
            createdAt: s.createdAt,
            questionCount: s._count.questions,
            attemptCount: s._count.attempts,
        }));
    }
    async function getPracticeSet(id, userId) {
        const where = { id };
        if (userId)
            where.attempts = { some: { userId } };
        const set = await prisma.practiceSet.findFirst({
            where,
            include: {
                questions: { orderBy: { orderIndex: 'asc' } },
                attempts: { orderBy: { completedAt: 'desc' }, take: 5 },
            },
        });
        if (!set)
            return null;
        return {
            id: set.id,
            topic: set.topic,
            subtopic: set.subtopic,
            difficulty: set.difficulty,
            language: set.language,
            basedOnQuestionId: set.basedOnQuestionId,
            createdAt: set.createdAt,
            questions: set.questions.map((q) => ({
                id: q.id,
                questionText: q.questionText,
                options: q.options,
                difficulty: q.difficulty,
                topic: q.topic ?? 'General',
                orderIndex: q.orderIndex,
            })),
            recentAttempts: set.attempts.map((a) => ({
                id: a.id,
                score: a.score,
                totalQuestions: a.totalQuestions,
                completedAt: a.completedAt,
                timeSpentMs: a.timeSpentMs,
            })),
        };
    }
    async function submitAttempt(practiceSetId, userId, answers, timeSpentMs) {
        const where = { id: practiceSetId };
        const set = await prisma.practiceSet.findFirst({
            where,
            include: { questions: true },
        });
        if (!set) {
            throw { code: 'NOT_FOUND', message: 'Practice set not found', httpStatus: 404 };
        }
        let correctCount = 0;
        const results = [];
        for (const question of set.questions) {
            const userAnswer = answers.find(a => a.questionId === question.id)?.answer ?? '';
            const isCorrect = userAnswer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
            if (isCorrect)
                correctCount++;
            results.push({
                questionId: question.id,
                correctAnswer: question.correctAnswer,
                userAnswer,
                isCorrect,
                explanation: question.explanation ?? undefined,
            });
        }
        const score = set.questions.length > 0 ? (correctCount / set.questions.length) * 100 : 0;
        const attempt = await prisma.practiceAttempt.create({
            data: {
                practiceSetId,
                userId,
                answers: answers,
                score,
                totalQuestions: set.questions.length,
                timeSpentMs,
            },
        });
        return {
            attemptId: attempt.id,
            score,
            totalQuestions: set.questions.length,
            correctCount,
            results,
        };
    }
    async function getRecommended(count = 3, userId) {
        // Find weak topics from analytics — filter to this user's questions
        const weakTopicsResult = await prisma.$queryRaw `
      SELECT
        COALESCE(NULLIF(topic, ''), 'uncategorized') as topic,
        AVG(COALESCE(confidence_score, 0))::float as "avgConfidence",
        COUNT(*)::int as count
      FROM "Question"
      ${userId ? `WHERE "userId" = ${userId}` : ''}
      GROUP BY topic
      HAVING COUNT(*) >= 1
      ORDER BY "avgConfidence" ASC
      LIMIT 5
    `;
        const recommended = weakTopicsResult.slice(0, count).map((r) => ({
            topic: r.topic,
            reason: r.avgConfidence < 0.6 ? 'Needs review' : r.avgConfidence < 0.75 ? 'Practice recommended' : 'Monitor progress',
            questionCount: Math.min(Math.max(3, Math.ceil(5 * (1 - r.avgConfidence))), 10),
            difficulty: (r.avgConfidence < 0.6 ? 'easy' : r.avgConfidence < 0.75 ? 'medium' : 'medium'),
        }));
        // If not enough recommendations, fill with general topics
        if (recommended.length < count) {
            const generalTopics = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Geography'];
            const existingTopics = new Set(weakTopicsResult.map((w) => w.topic));
            for (const topic of generalTopics) {
                if (recommended.length >= count)
                    break;
                if (!existingTopics.has(topic)) {
                    recommended.push({ topic, reason: 'General practice', questionCount: 5, difficulty: 'medium' });
                }
            }
        }
        return recommended;
    }
    return { generatePracticeSet, getPracticeSets, getPracticeSet, submitAttempt, getRecommended };
}
function generateMockQuestions(request) {
    const topics = {
        Mathematics: [
            {
                question: 'What is the derivative of x²?',
                options: [
                    { label: 'A', value: 'x', order: 0 },
                    { label: 'B', value: '2x', order: 1 },
                    { label: 'C', value: '2', order: 2 },
                    { label: 'D', value: 'x²', order: 3 },
                ],
                answer: 'B',
                explanation: 'Using the power rule: d/dx(xⁿ) = nxⁿ⁻¹. For x², the derivative is 2x.',
            },
            {
                question: 'Solve for x: 2x + 5 = 15',
                options: [
                    { label: 'A', value: 'x = 5', order: 0 },
                    { label: 'B', value: 'x = 10', order: 1 },
                    { label: 'C', value: 'x = 7.5', order: 2 },
                    { label: 'D', value: 'x = 3', order: 3 },
                ],
                answer: 'A',
                explanation: 'Subtract 5 from both sides: 2x = 10. Divide by 2: x = 5.',
            },
        ],
        Physics: [
            {
                question: "What is Newton's Second Law?",
                options: [
                    { label: 'A', value: 'F = ma', order: 0 },
                    { label: 'B', value: 'E = mc²', order: 1 },
                    { label: 'C', value: 'V = IR', order: 2 },
                    { label: 'D', value: 'PV = nRT', order: 3 },
                ],
                answer: 'A',
                explanation: "Newton's Second Law states that Force equals mass times acceleration: F = ma.",
            },
        ],
    };
    const topicQuestions = topics[request.topic] ?? [
        {
            question: `What is the capital of ${request.topic}?`,
            options: [
                { label: 'A', value: 'City A', order: 0 },
                { label: 'B', value: 'City B', order: 1 },
                { label: 'C', value: 'City C', order: 2 },
                { label: 'D', value: 'City D', order: 3 },
            ],
            answer: 'A',
            explanation: `This tests basic knowledge of ${request.topic}.`,
        },
    ];
    return topicQuestions.slice(0, request.count).map(q => ({
        question: q.question,
        questionType: 'multiple_choice',
        options: q.options,
        answer: q.answer,
        explanation: q.explanation,
        difficulty: request.difficulty,
    }));
}
//# sourceMappingURL=practice.service.js.map