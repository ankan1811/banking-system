import { prisma } from '../lib/db.js';
import { createContact } from './razorpay.service.js';
import { plaidClient } from '../lib/plaid.js';
import { clearAccountCache } from './bank.service.js';
import { clearSuggestionsCache } from './challenges.service.js';
import type { SignUpParams } from '@shared/types';

export const getUserInfo = async (userId: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return null;

    return {
      ...user,
      name: `${user.firstName} ${user.lastName}`,
    };
  } catch (error) {
    console.error('Error getting user info:', error);
    return null;
  }
};

export const createUser = async (userData: SignUpParams) => {
  const razorpayContactId = await createContact({
    name: `${userData.firstName} ${userData.lastName}`,
    email: userData.email,
  });

  if (!razorpayContactId) throw new Error('Error creating Razorpay contact');

  const newUser = await prisma.user.create({
    data: {
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      address1: userData.address1,
      country: userData.country,
      city: userData.city,
      state: userData.state,
      postalCode: userData.postalCode,
      dateOfBirth: userData.dateOfBirth,
      ssn: userData.ssn,
      razorpayContactId,
    },
  });

  return {
    ...newUser,
    name: `${newUser.firstName} ${newUser.lastName}`,
  };
};

export const createBankAccount = async (data: {
  userId: string;
  bankId: string;
  accountId: string;
  accessToken: string;
  shareableId: string;
}) => {
  const bankAccount = await prisma.bank.create({
    data: {
      userId: data.userId,
      bankId: data.bankId,
      accountId: data.accountId,
      accessToken: data.accessToken,
      shareableId: data.shareableId,
    },
  });

  return bankAccount;
};

export const getBanks = async (userId: string) => {
  const banks = await prisma.bank.findMany({
    where: { userId },
  });

  return banks;
};

export const getBank = async (documentId: string) => {
  const bank = await prisma.bank.findUnique({
    where: { id: documentId },
  });

  return bank;
};

export const getBankByAccountId = async (accountId: string) => {
  const bank = await prisma.bank.findFirst({
    where: { accountId },
  });

  return bank || null;
};

// ─── Profile Management ─────────────────────────────────────

export const updateProfile = async (
  userId: string,
  data: {
    firstName?: string;
    lastName?: string;
    address1?: string;
    country?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  }
) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data,
  });
  return { ...user, name: `${user.firstName} ${user.lastName}` };
};

export const disconnectBank = async (userId: string, bankId: string) => {
  const bank = await prisma.bank.findFirst({ where: { id: bankId, userId } });
  if (!bank) throw new Error('Bank not found');

  // Revoke Plaid access token (best-effort)
  try {
    await plaidClient.itemRemove({ access_token: bank.accessToken });
  } catch (err) {
    console.error('Plaid itemRemove error (continuing):', err);
  }

  await prisma.bank.delete({ where: { id: bankId } });
  clearAccountCache(bankId, userId);
  clearSuggestionsCache(bankId);
};

export const deleteUser = async (userId: string) => {
  // Remove all Plaid items first (best-effort)
  const banks = await getBanks(userId);
  for (const bank of banks) {
    try {
      await plaidClient.itemRemove({ access_token: bank.accessToken });
    } catch {
      // continue even if Plaid cleanup fails
    }
  }

  // Cascade deletes all child records (banks, budgets, goals, alerts, notes, etc.)
  await prisma.user.delete({ where: { id: userId } });
};
