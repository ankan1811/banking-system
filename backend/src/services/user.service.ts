import { prisma } from '../lib/db.js';
import { createContact } from './razorpay.service.js';
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
