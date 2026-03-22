"use client"

import { useState } from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { aiCategoryColors } from "@/constants";
import { apiRequest } from "@/lib/api/client";
import { cn } from "@/lib/utils";

ChartJS.register(ArcElement, Tooltip, Legend);

interface Props {
  transactions: Transaction[];
  accounts?: Account[];
  bankRecordId?: string;
}

const CategoryBreakdownChart = ({ transactions: initialTxns, accounts, bankRecordId: initialBank }: Props) => {
  const [selectedBank, setSelectedBank] = useState(initialBank);
  const [transactions, setTransactions] = useState(initialTxns);
  const [loading, setLoading] = useState(false);

  const handleBankChange = async (newBankId: string) => {
    if (newBankId === selectedBank) return;
    setSelectedBank(newBankId);
    setLoading(true);
    try {
      const data = await apiRequest<any>('/api/accounts/' + newBankId);
      setTransactions(data?.transactions ?? []);
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // Aggregate spending by AI category
  const categoryTotals: Record<string, number> = {};
  for (const t of transactions) {
    const cat = t.aiCategory || t.category || 'Other';
    if (cat === 'Income') continue;
    // Match transaction history logic: debit = type "debit" (CSV) or negative amount (Plaid)
    const isDebit = t.type === 'debit' || t.amount < 0;
    if (!isDebit) continue;
    categoryTotals[cat] = (categoryTotals[cat] || 0) + Math.abs(t.amount);
  }

  const categories = Object.keys(categoryTotals);
  const amounts = Object.values(categoryTotals);
  const colors = categories.map((c) => aiCategoryColors[c] || '#78716c');

  const chartContent = !categories.length ? (
    <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
      No spending data to display
    </div>
  ) : (
    <div className="flex flex-col md:flex-row items-center gap-6">
      <div className="w-40 h-40">
        <Doughnut
          data={{
            labels: categories,
            datasets: [{
              data: amounts,
              backgroundColor: colors,
              borderColor: 'transparent',
              borderWidth: 0,
            }],
          }}
          options={{
            cutout: '60%',
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx) => `${ctx.label}: $${ctx.parsed.toFixed(2)}`,
                },
              },
            },
          }}
        />
      </div>
      <div className="flex flex-col gap-2">
        {categories.map((cat, i) => (
          <div key={cat} className="flex items-center gap-1.5 text-xs text-slate-300">
            <div
              className="size-2.5 rounded-full"
              style={{ backgroundColor: colors[i] }}
            />
            <span>{cat}</span>
            <span className="text-slate-500">${amounts[i].toFixed(0)}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="glass-card p-6">
      <h3 className="text-sm font-semibold text-white mb-4">Spending by Category</h3>

      {accounts && accounts.length > 1 && (
        <div className="recent-transactions-tablist mb-4">
          {accounts.map((account: Account) => (
            <div
              key={account.id}
              onClick={() => handleBankChange(account.bankRecordId)}
              className={cn('banktab-item cursor-pointer', {
                'bg-gradient-to-r from-violet-600/20 to-indigo-600/15 border-violet-500/20 text-white': selectedBank === account.bankRecordId,
                'text-slate-400 hover:text-white hover:bg-white/[0.04]': selectedBank !== account.bankRecordId,
              })}
            >
              <p className="line-clamp-1">{account.name}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
          Loading…
        </div>
      ) : (
        chartContent
      )}
    </div>
  );
};

export default CategoryBreakdownChart;
