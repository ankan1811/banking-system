"use client"

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { aiCategoryColors } from "@/constants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BankTabItem } from "./BankTabItem";

ChartJS.register(ArcElement, Tooltip, Legend);

interface Props {
  transactions: Transaction[];
  accounts?: Account[];
  bankRecordId?: string;
}

const CategoryBreakdownChart = ({ transactions, accounts, bankRecordId }: Props) => {
  // Aggregate spending by AI category
  const categoryTotals: Record<string, number> = {};
  for (const t of transactions) {
    const cat = t.aiCategory || t.category || 'Other';
    if (t.amount <= 0) continue; // skip credits
    categoryTotals[cat] = (categoryTotals[cat] || 0) + Math.abs(t.amount);
  }

  const categories = Object.keys(categoryTotals);
  const amounts = Object.values(categoryTotals);
  const colors = categories.map((c) => aiCategoryColors[c] || '#78716c');

  if (!categories.length) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
        No spending data to display
      </div>
    );
  }

  const data = {
    labels: categories,
    datasets: [
      {
        data: amounts,
        backgroundColor: colors,
        borderColor: 'transparent',
        borderWidth: 0,
      },
    ],
  };

  const chartContent = (
    <div className="flex flex-col md:flex-row items-center gap-6">
      <div className="w-40 h-40">
        <Doughnut
          data={data}
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

      {accounts && accounts.length > 1 && bankRecordId ? (
        <Tabs defaultValue={bankRecordId} className="w-full">
          <TabsList className="recent-transactions-tablist">
            {accounts.map((account: Account) => (
              <TabsTrigger key={account.id} value={account.bankRecordId}>
                <BankTabItem
                  account={account}
                  bankRecordId={bankRecordId}
                />
              </TabsTrigger>
            ))}
          </TabsList>
          {accounts.map((account: Account) => (
            <TabsContent key={account.id} value={account.bankRecordId} className="mt-4">
              {chartContent}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        chartContent
      )}
    </div>
  );
};

export default CategoryBreakdownChart;
