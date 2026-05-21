import type { PrismaClient } from '@prisma/client';
import type { TelegramLinkAccount, TelegramSendSolution } from '@karcoz/shared';

export type TelegramAuditAction =
  | 'TELEGRAM_LINK_STARTED'
  | 'TELEGRAM_ACCOUNT_LINKED'
  | 'TELEGRAM_SOLUTION_SENT'
  | 'TELEGRAM_IMAGE_SOLVED'
  | 'TELEGRAM_ACCOUNT_UNLINKED';

export function createTelegramService(prisma: PrismaClient) {
  async function linkAccount(
    userId: string,
    telegramChatId: string,
    telegramUsername?: string,
    displayName?: string
  ) {
    // Check if already linked to another user
    const existing = await prisma.telegramAccount.findUnique({
      where: { telegramChatId },
    });

    if (existing && existing.userId !== userId) {
      throw { code: 'ALREADY_LINKED', message: 'This Telegram account is already linked to another user', httpStatus: 409 };
    }

    if (existing && existing.userId === userId) {
      // Re-link if unlinked
      const relinked = await prisma.telegramAccount.update({
        where: { telegramChatId },
        data: {
          isLinked: true,
          unlinkedAt: null,
          linkedAt: new Date(),
          telegramUsername,
          displayName,
        },
      });
      await logAudit(relinked.id, 'TELEGRAM_ACCOUNT_LINKED', { userId, via: 're-link' }, undefined, undefined, telegramChatId);
      return relinked;
    }

    // Create new link
    const account = await prisma.telegramAccount.create({
      data: {
        userId,
        telegramChatId,
        telegramUsername,
        displayName,
        isLinked: true,
      },
    });

    await logAudit(account.id, 'TELEGRAM_ACCOUNT_LINKED', { userId }, undefined, undefined, telegramChatId);
    return account;
  }

  async function unlinkAccount(telegramChatId: string) {
    const account = await prisma.telegramAccount.findUnique({
      where: { telegramChatId },
    });

    if (!account) {
      throw { code: 'NOT_FOUND', message: 'Telegram account not found', httpStatus: 404 };
    }

    const updated = await prisma.telegramAccount.update({
      where: { telegramChatId },
      data: {
        isLinked: false,
        unlinkedAt: new Date(),
      },
    });

    await logAudit(updated.id, 'TELEGRAM_ACCOUNT_UNLINKED', { userId: account.userId }, undefined, undefined, telegramChatId);
    return { success: true };
  }

  async function getAccountStatus(userId: string) {
    const account = await prisma.telegramAccount.findFirst({
      where: { userId, isLinked: true },
    });

    if (!account) {
      return { isLinked: false };
    }

    return {
      isLinked: true,
      telegramChatId: account.telegramChatId,
      telegramUsername: account.telegramUsername,
      displayName: account.displayName,
      linkedAt: account.linkedAt.getTime(),
    };
  }

  async function getAccountByChatId(telegramChatId: string) {
    return prisma.telegramAccount.findUnique({
      where: { telegramChatId },
    });
  }

  async function sendSolution(telegramChatId: string, questionId: string) {
    const account = await prisma.telegramAccount.findUnique({
      where: { telegramChatId },
    });

    if (!account || !account.isLinked) {
      throw { code: 'NOT_LINKED', message: 'Telegram account is not linked', httpStatus: 403 };
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      throw { code: 'NOT_FOUND', message: 'Question not found', httpStatus: 404 };
    }

    await logAudit(
      account.id,
      'TELEGRAM_SOLUTION_SENT',
      { userId: account.userId, questionId },
      undefined,
      undefined,
      telegramChatId
    );

    return {
      success: true,
      question: {
        id: question.id,
        topic: question.topic,
        questionType: question.questionType,
        extractedText: question.extractedText,
        shortAnswer: question.shortAnswer,
        fullExplanation: question.fullExplanation,
        confidenceScore: question.confidenceScore,
      },
    };
  }

  async function handleIncomingImage(
    telegramChatId: string,
    imageBase64: string,
    caption?: string
  ) {
    const account = await prisma.telegramAccount.findUnique({
      where: { telegramChatId },
    });

    if (!account || !account.isLinked) {
      throw { code: 'NOT_LINKED', message: 'Telegram account is not linked', httpStatus: 403 };
    }

    // Update last activity
    await prisma.telegramAccount.update({
      where: { telegramChatId },
      data: { lastActivityAt: new Date() },
    });

    await logAudit(
      account.id,
      'TELEGRAM_IMAGE_SOLVED',
      { userId: account.userId, caption },
      undefined,
      undefined,
      telegramChatId
    );

    return { userId: account.userId, accountId: account.id };
  }

  async function updateLastActivity(telegramChatId: string) {
    await prisma.telegramAccount.update({
      where: { telegramChatId },
      data: { lastActivityAt: new Date() },
    }).catch(() => {});
  }

  async function logAudit(
    telegramAccountId: string | undefined,
    action: TelegramAuditAction,
    details: Record<string, unknown> = {},
    ipAddress?: string,
    userAgent?: string,
    telegramChatId?: string
  ) {
    await prisma.telegramAuditLog.create({
      data: {
        telegramAccountId,
        action,
        details: details as object,
        ipAddress,
        userAgent,
        telegramChatId,
      },
    });
  }

  return {
    linkAccount,
    unlinkAccount,
    getAccountStatus,
    getAccountByChatId,
    sendSolution,
    handleIncomingImage,
    updateLastActivity,
    logAudit,
  };
}