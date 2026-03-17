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
