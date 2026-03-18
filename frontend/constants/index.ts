export const sidebarLinks = [
  {
    imgURL: "/icons/home.svg",
    route: "/",
    label: "Home",
  },
  {
    imgURL: "/icons/dollar-circle.svg",
    route: "/my-banks",
    label: "My Banks",
  },
  {
    imgURL: "/icons/transaction.svg",
    route: "/transaction-history",
    label: "Transaction History",
  },
  {
    imgURL: "/icons/money-send.svg",
    route: "/payment-transfer",
    label: "Transfer Funds",
  },
  {
    imgURL: "/icons/monitor.svg",
    route: "/splits",
    label: "Split Expenses",
  },
  {
    imgURL: "/icons/monitor.svg",
    route: "/insights",
    label: "AI Insights",
  },
  {
    imgURL: "/icons/monitor.svg",
    route: "/budgets",
    label: "Budgets",
  },
  {
    imgURL: "/icons/monitor.svg",
    route: "/goals",
    label: "Savings Goals",
  },
  {
    imgURL: "/icons/monitor.svg",
    route: "/trends",
    label: "Trends",
  },
  {
    imgURL: "/icons/monitor.svg",
    route: "/alerts",
    label: "Alerts",
  },
  {
    imgURL: "/icons/monitor.svg",
    route: "/health-score",
    label: "Health Score",
  },
  {
    imgURL: "/icons/monitor.svg",
    route: "/challenges",
    label: "Challenges",
  },
  {
    imgURL: "/icons/monitor.svg",
    route: "/income-expense",
    label: "Income/Expense",
  },
  {
    imgURL: "/icons/monitor.svg",
    route: "/net-worth",
    label: "Net Worth",
  },
  {
    imgURL: "/icons/monitor.svg",
    route: "/merchants",
    label: "Merchants",
  },
  {
    imgURL: "/icons/monitor.svg",
    route: "/calendar",
    label: "Bill Calendar",
  },
  {
    imgURL: "/icons/monitor.svg",
    route: "/reports",
    label: "Reports",
  },
  {
    imgURL: "/icons/monitor.svg",
    route: "/settings",
    label: "Settings",
  },
];

// good_user / good_password - Bank of America
export const TEST_USER_ID = "6627ed3d00267aa6fa3e";

// custom_user -> Chase Bank
// export const TEST_ACCESS_TOKEN =
//   "access-sandbox-da44dac8-7d31-4f66-ab36-2238d63a3017";

// custom_user -> Chase Bank
export const TEST_ACCESS_TOKEN =
  "access-sandbox-229476cf-25bc-46d2-9ed5-fba9df7a5d63";

export const ITEMS = [
  {
    id: "6624c02e00367128945e", // bank record Id
    accessToken: "access-sandbox-83fd9200-0165-4ef8-afde-65744b9d1548",
    itemId: "VPMQJKG5vASvpX8B6JK3HmXkZlAyplhW3r9xm",
    userId: "6627ed3d00267aa6fa3e",
    accountId: "X7LMJkE5vnskJBxwPeXaUWDBxAyZXwi9DNEWJ",
  },
  {
    id: "6627f07b00348f242ea9", // bank record Id
    accessToken: "access-sandbox-74d49e15-fc3b-4d10-a5e7-be4ddae05b30",
    itemId: "Wv7P6vNXRXiMkoKWPzeZS9Zm5JGWdXulLRNBq",
    userId: "6627ed3d00267aa6fa3e",
    accountId: "x1GQb1lDrDHWX4BwkqQbI4qpQP1lL6tJ3VVo9",
  },
];

export const aiCategoryColors: Record<string, string> = {
  'Food & Dining': '#f43f5e',
  'Transport': '#8b5cf6',
  'Shopping': '#f59e0b',
  'Entertainment': '#ec4899',
  'Bills & Utilities': '#6366f1',
  'Health': '#10b981',
  'Education': '#06b6d4',
  'Income': '#22c55e',
  'Transfers': '#64748b',
  'Other': '#78716c',
};

export const aiCategoryStyles: Record<string, { borderColor: string; backgroundColor: string; textColor: string; chipBackgroundColor: string }> = {
  'Food & Dining': {
    borderColor: 'border-rose-500/30',
    backgroundColor: 'bg-rose-400',
    textColor: 'text-rose-300',
    chipBackgroundColor: 'bg-rose-500/10',
  },
  'Transport': {
    borderColor: 'border-violet-500/30',
    backgroundColor: 'bg-violet-400',
    textColor: 'text-violet-300',
    chipBackgroundColor: 'bg-violet-500/10',
  },
  'Shopping': {
    borderColor: 'border-amber-500/30',
    backgroundColor: 'bg-amber-400',
    textColor: 'text-amber-300',
    chipBackgroundColor: 'bg-amber-500/10',
  },
  'Entertainment': {
    borderColor: 'border-pink-500/30',
    backgroundColor: 'bg-pink-400',
    textColor: 'text-pink-300',
    chipBackgroundColor: 'bg-pink-500/10',
  },
  'Bills & Utilities': {
    borderColor: 'border-indigo-500/30',
    backgroundColor: 'bg-indigo-400',
    textColor: 'text-indigo-300',
    chipBackgroundColor: 'bg-indigo-500/10',
  },
  'Health': {
    borderColor: 'border-emerald-500/30',
    backgroundColor: 'bg-emerald-400',
    textColor: 'text-emerald-300',
    chipBackgroundColor: 'bg-emerald-500/10',
  },
  'Education': {
    borderColor: 'border-cyan-500/30',
    backgroundColor: 'bg-cyan-400',
    textColor: 'text-cyan-300',
    chipBackgroundColor: 'bg-cyan-500/10',
  },
  'Income': {
    borderColor: 'border-green-500/30',
    backgroundColor: 'bg-green-400',
    textColor: 'text-green-300',
    chipBackgroundColor: 'bg-green-500/10',
  },
  'Transfers': {
    borderColor: 'border-slate-500/30',
    backgroundColor: 'bg-slate-400',
    textColor: 'text-slate-300',
    chipBackgroundColor: 'bg-slate-500/10',
  },
  'Other': {
    borderColor: 'border-stone-500/30',
    backgroundColor: 'bg-stone-400',
    textColor: 'text-stone-300',
    chipBackgroundColor: 'bg-stone-500/10',
  },
};

export const topCategoryStyles = {
  "Food and Drink": {
    bg: "bg-slate-800/40",
    circleBg: "bg-violet-500/20",
    text: {
      main: "text-white",
      count: "text-violet-300",
    },
    progress: {
      bg: "bg-violet-500/20",
      indicator: "bg-violet-500",
    },
    icon: "/icons/monitor.svg",
  },
  Travel: {
    bg: "bg-slate-800/40",
    circleBg: "bg-emerald-500/20",
    text: {
      main: "text-white",
      count: "text-emerald-300",
    },
    progress: {
      bg: "bg-emerald-500/20",
      indicator: "bg-emerald-500",
    },
    icon: "/icons/coins.svg",
  },
  default: {
    bg: "bg-slate-800/40",
    circleBg: "bg-rose-500/20",
    text: {
      main: "text-white",
      count: "text-rose-300",
    },
    progress: {
      bg: "bg-rose-500/20",
      indicator: "bg-rose-500",
    },
    icon: "/icons/shopping-bag.svg",
  },
};

export const transactionCategoryStyles = {
  "Food and Drink": {
    borderColor: "border-rose-500/30",
    backgroundColor: "bg-rose-400",
    textColor: "text-rose-300",
    chipBackgroundColor: "bg-rose-500/10",
  },
  Payment: {
    borderColor: "border-emerald-500/30",
    backgroundColor: "bg-emerald-400",
    textColor: "text-emerald-300",
    chipBackgroundColor: "bg-emerald-500/10",
  },
  "Bank Fees": {
    borderColor: "border-emerald-500/30",
    backgroundColor: "bg-emerald-400",
    textColor: "text-emerald-300",
    chipBackgroundColor: "bg-emerald-500/10",
  },
  Transfer: {
    borderColor: "border-red-500/30",
    backgroundColor: "bg-red-400",
    textColor: "text-red-300",
    chipBackgroundColor: "bg-red-500/10",
  },
  Processing: {
    borderColor: "border-slate-600/30",
    backgroundColor: "bg-slate-400",
    textColor: "text-slate-300",
    chipBackgroundColor: "bg-slate-700/50",
  },
  Success: {
    borderColor: "border-emerald-500/30",
    backgroundColor: "bg-emerald-400",
    textColor: "text-emerald-300",
    chipBackgroundColor: "bg-emerald-500/10",
  },
  Travel: {
    borderColor: "border-violet-500/30",
    backgroundColor: "bg-violet-400",
    textColor: "text-violet-300",
    chipBackgroundColor: "bg-violet-500/10",
  },
  default: {
    borderColor: "border-slate-600/30",
    backgroundColor: "bg-violet-400",
    textColor: "text-violet-300",
    chipBackgroundColor: "bg-slate-800/50",
  },
};
