import { prisma } from '../lib/db.js';
import type { CreateTransactionProps } from '@shared/types';

export const createTransaction = async (transaction: CreateTransactionProps) => {
  const newTransaction = await prisma.transaction.create({
    data: {
      channel: 'online',
      category: 'Transfer',
      name: transaction.name,
      amount: parseFloat(transaction.amount),
      senderId: transaction.senderId,
      senderBankId: transaction.senderBankId,
      receiverId: transaction.receiverId,
      receiverBankId: transaction.receiverBankId,
      email: transaction.email,
    },
  });

  return newTransaction;
};

export const getTransactionsByBankId = async (bankId: string) => {
  const senderTransactions = await prisma.transaction.findMany({
    where: { senderBankId: bankId },
  });

  const receiverTransactions = await prisma.transaction.findMany({
    where: { receiverBankId: bankId },
  });

  const transactions = {
    total: senderTransactions.length + receiverTransactions.length,
    documents: [...senderTransactions, ...receiverTransactions],
  };

  return transactions;
};

export const getTransferAdjustments = async (bankIds: string[]): Promise<Map<string, number>> => {
  const adjustments = new Map<string, number>();
  if (bankIds.length === 0) return adjustments;

  const [sentGroups, receivedGroups] = await Promise.all([
    prisma.transaction.groupBy({
      by: ['senderBankId'],
      where: { senderBankId: { in: bankIds } },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ['receiverBankId'],
      where: { receiverBankId: { in: bankIds } },
      _sum: { amount: true },
    }),
  ]);

  for (const g of sentGroups) {
    const amt = g._sum.amount ? parseFloat(g._sum.amount.toString()) : 0;
    adjustments.set(g.senderBankId, (adjustments.get(g.senderBankId) || 0) - amt);
  }
  for (const g of receivedGroups) {
    const amt = g._sum.amount ? parseFloat(g._sum.amount.toString()) : 0;
    adjustments.set(g.receiverBankId, (adjustments.get(g.receiverBankId) || 0) + amt);
  }

  return adjustments;
};
