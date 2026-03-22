/**
 * Dummy Indian bank transactions for new users who want to explore the app
 * without uploading a real statement. Dates are relative to today.
 */

interface DummyTransaction {
  name: string;
  amount: number;
  type: 'debit' | 'credit';
  daysAgo: number; // relative to today
}

const RAW: DummyTransaction[] = [
  // ── Income ──
  { name: 'SALARY CREDIT - ACME TECHNOLOGIES',  amount: 50000, type: 'credit', daysAgo: 2  },
  { name: 'SALARY CREDIT - ACME TECHNOLOGIES',  amount: 50000, type: 'credit', daysAgo: 32 },

  // ── Rent ──
  { name: 'NEFT TO LANDLORD SHARMA',            amount: 15000, type: 'debit',  daysAgo: 3  },
  { name: 'NEFT TO LANDLORD SHARMA',            amount: 15000, type: 'debit',  daysAgo: 33 },

  // ── Food & Dining ──
  { name: 'SWIGGY ORDER #8842',                 amount: 456,   type: 'debit',  daysAgo: 1  },
  { name: 'ZOMATO ORDER',                       amount: 312,   type: 'debit',  daysAgo: 4  },
  { name: 'SWIGGY ORDER #9021',                 amount: 589,   type: 'debit',  daysAgo: 8  },
  { name: 'STARBUCKS INDIA',                    amount: 380,   type: 'debit',  daysAgo: 12 },
  { name: 'CHAAYOS MG ROAD',                    amount: 210,   type: 'debit',  daysAgo: 18 },
  { name: 'DOMINOS PIZZA ONLINE',               amount: 499,   type: 'debit',  daysAgo: 25 },
  { name: 'ZOMATO ORDER',                       amount: 275,   type: 'debit',  daysAgo: 40 },

  // ── Transport ──
  { name: 'OLA RIDE',                           amount: 185,   type: 'debit',  daysAgo: 2  },
  { name: 'UBER INDIA',                         amount: 342,   type: 'debit',  daysAgo: 7  },
  { name: 'DELHI METRO RECHARGE',               amount: 200,   type: 'debit',  daysAgo: 15 },
  { name: 'RAPIDO BIKE',                        amount: 95,    type: 'debit',  daysAgo: 22 },
  { name: 'IRCTC BOOKING',                      amount: 1250,  type: 'debit',  daysAgo: 35 },

  // ── Shopping ──
  { name: 'FLIPKART MARKETPLACE',               amount: 2499,  type: 'debit',  daysAgo: 5  },
  { name: 'AMAZON PAY INDIA',                   amount: 899,   type: 'debit',  daysAgo: 14 },
  { name: 'MYNTRA FASHION',                     amount: 1599,  type: 'debit',  daysAgo: 28 },

  // ── Entertainment ──
  { name: 'NETFLIX INDIA',                      amount: 499,   type: 'debit',  daysAgo: 6  },
  { name: 'HOTSTAR PREMIUM',                    amount: 299,   type: 'debit',  daysAgo: 36 },
  { name: 'BOOKMYSHOW TICKETS',                 amount: 750,   type: 'debit',  daysAgo: 20 },

  // ── Bills & Utilities ──
  { name: 'AIRTEL POSTPAID BILL',               amount: 599,   type: 'debit',  daysAgo: 10 },
  { name: 'BESCOM ELECTRICITY BILL',            amount: 1450,  type: 'debit',  daysAgo: 11 },
  { name: 'TATA PLAY DTH RECHARGE',             amount: 350,   type: 'debit',  daysAgo: 30 },

  // ── Transfers ──
  { name: 'UPI TO RAHUL@OKICICI',               amount: 1000,  type: 'debit',  daysAgo: 9  },
  { name: 'UPI FROM PRIYA@YESBANK',             amount: 2000,  type: 'credit', daysAgo: 13 },
  { name: 'IMPS TO SAVINGS A/C',                amount: 5000,  type: 'debit',  daysAgo: 16 },
];

function formatDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

export function getDummyTransactions() {
  return RAW.map((t) => ({
    name: t.name,
    amount: t.amount,
    date: formatDate(t.daysAgo),
    type: t.type,
  }));
}
