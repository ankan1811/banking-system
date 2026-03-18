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

export const AI_CATEGORIES: AICategory[] = [
  'Food & Dining', 'Transport', 'Shopping', 'Entertainment',
  'Bills & Utilities', 'Health', 'Education', 'Income', 'Transfers', 'Other',
];

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

// ─── Budget ─────────────────────────────────────────────────
export type Budget = {
  id: string;
  userId: string;
  category: AICategory;
  monthlyLimit: number;
  month: string; // "YYYY-MM"
};

export type BudgetStatus = {
  category: AICategory;
  budgetId: string | null;
  monthlyLimit: number | null;
  spent: number;
  remaining: number | null;
  percentUsed: number | null;
};

// ─── Savings Goals ───────────────────────────────────────────
export type SavingsGoal = {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  targetDate: string | null;
  emoji: string | null;
  color: string | null;
  status: 'active' | 'completed' | 'abandoned';
  createdAt: string;
};

export type GoalContribution = {
  id: string;
  goalId: string;
  amount: number;
  note: string | null;
  createdAt: string;
};

// ─── Analytics ───────────────────────────────────────────────
export type TrendsData = {
  months: string[];
  categories: AICategory[];
  data: Record<string, number[]>;
  totals: number[];
};

export type RecurringPattern = {
  name: string;
  normalizedAmount: number;
  frequency: 'weekly' | 'monthly' | 'quarterly';
  lastCharged: string;
  nextExpected: string;
  category: string;
  occurrences: number;
};

export type IncomeExpenseData = {
  months: string[];
  income: number[];
  expenses: number[];
  net: number[];
  expensesByCategory: Record<string, number[]>;
  totals: {
    totalIncome: number;
    totalExpenses: number;
    totalNet: number;
    avgMonthlyNet: number;
  };
};

export type MerchantInsight = {
  name: string;
  totalSpent: number;
  transactionCount: number;
  avgAmount: number;
  category: string;
  lastTransaction: string;
  trend: number;
  monthlyAmounts: Record<string, number>;
};

// ─── Alerts ──────────────────────────────────────────────────
export type AlertRule = {
  id: string;
  userId: string;
  type: 'category_monthly_limit' | 'single_transaction' | 'balance_below';
  category: AICategory | null;
  threshold: number;
  channel: string;
  enabled: boolean;
  createdAt: string;
};

// ─── Health Score ────────────────────────────────────────────
export type HealthScore = {
  score: number;
  breakdown: {
    budgetAdherence: number;
    savingsRate: number;
    spendingTrend: number;
    goalProgress: number;
  };
  tips: string[];
  generatedAt: string;
};

// ─── Monthly Digest ─────────────────────────────────────────
export type DigestSection = {
  budgetAdherence: {
    statuses: BudgetStatus[];
    overBudgetCount: number;
    totalBudgets: number;
  };
  goalProgress: {
    goals: SavingsGoal[];
    activeCount: number;
    completedCount: number;
    totalSavedAmount: number;
  };
  healthScore: HealthScore;
  topMerchants: MerchantInsight[];
  incomeVsExpense: IncomeExpenseData;
};

export type MonthlyDigest = {
  id: string;
  userId: string;
  month: string;
  bankRecordId: string;
  sections: DigestSection;
  narrative: string;
  generatedAt: string;
};

// ─── Transaction Notes ──────────────────────────────────────
export type TransactionNote = {
  id: string;
  transactionHash: string;
  userId: string;
  note: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};
