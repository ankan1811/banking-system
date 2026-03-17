export type SignUpParams = {
  firstName: string;
  lastName: string;
  address1: string;
  city: string;
  state: string;
  postalCode: string;
  dateOfBirth: string;
  ssn: string;
  email: string;
};

export type User = {
  id: string;
  email: string;
  razorpayContactId: string;
  firstName: string;
  lastName: string;
  name: string;
  address1: string;
  city: string;
  state: string;
  postalCode: string;
  dateOfBirth: string;
  ssn: string;
};

export type Account = {
  id: string;
  availableBalance: number;
  currentBalance: number;
  officialName: string;
  mask: string;
  institutionId: string;
  name: string;
  type: string;
  subtype: string;
  bankRecordId: string;
  shareableId: string;
};

export type Transaction = {
  id: string;
  name: string;
  paymentChannel: string;
  type: string;
  accountId: string;
  amount: number;
  pending: boolean;
  category: string;
  date: string;
  image: string;
  createdAt: string;
  channel: string;
  senderBankId: string;
  receiverBankId: string;
};

export type Bank = {
  id: string;
  accountId: string;
  bankId: string;
  accessToken: string;
  razorpayFundAccountId: string;
  userId: string;
  shareableId: string;
};

export type TransferParams = {
  senderBankId: string;
  receiverBankId: string;
  amount: string;
};

export type AICategory =
  | 'Food & Dining'
  | 'Transport'
  | 'Shopping'
  | 'Entertainment'
  | 'Bills & Utilities'
  | 'Health'
  | 'Education'
  | 'Income'
  | 'Transfers'
  | 'Other';

export type SpendingInsight = {
  summary: string;
  monthComparison: {
    category: string;
    currentAmount: number;
    previousAmount: number;
    changePercent: number;
  }[];
  topCategories: {
    category: string;
    amount: number;
    transactionCount: number;
  }[];
  anomalies: string[];
  savingsTips: string[];
  generatedAt: string;
};

export type ChatMessage = {
  role: 'user' | 'model';
  content: string;
};

export type ChatResponse = {
  reply: string;
};

export type CreateTransactionProps = {
  name: string;
  amount: string;
  senderId: string;
  senderBankId: string;
  receiverId: string;
  receiverBankId: string;
  email: string;
};
