'use client'

import { transactionCategoryStyles, aiCategoryStyles } from '@/constants'
import { cn, formatAmount, formatDateTime, getTransactionStatus, removeSpecialCharacters } from '@/lib/utils'

const CategoryBadge = ({ category }: CategoryBadgeProps) => {
  const {
    borderColor,
    backgroundColor,
    textColor,
    chipBackgroundColor,
   } = aiCategoryStyles[category] || transactionCategoryStyles[category as keyof typeof transactionCategoryStyles] || transactionCategoryStyles.default

  return (
    <div className={cn('category-badge', borderColor, chipBackgroundColor)}>
      <div className={cn('size-2 rounded-full', backgroundColor)} />
      <p className={cn('text-[11px] font-medium', textColor)}>{category}</p>
    </div>
  )
}

const TransactionsTable = ({ transactions }: TransactionTableProps) => {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="hidden sm:flex items-center px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider gap-4">
        <span className="flex-1">Transaction</span>
        <span className="w-28 text-right">Amount</span>
        <span className="w-28 text-center">Status</span>
        <span className="w-36 text-right hidden md:block">Date</span>
        <span className="w-36 text-right hidden lg:block">Category</span>
      </div>

      {/* Transaction Cards */}
      {transactions?.map((t: Transaction) => {
        const status = getTransactionStatus(new Date(t.date));
        const amount = formatAmount(t.amount);
        const isDebit = t.type === 'debit';

        return (
          <div key={t.id} className="transaction-card">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {removeSpecialCharacters(t.name)}
              </p>
              <p className="text-xs text-slate-500 sm:hidden mt-0.5">
                {formatDateTime(new Date(t.date)).dateTime}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <span className={cn(
                'w-28 text-right text-sm font-semibold',
                isDebit || amount[0] === '-' ? 'text-rose-400' : 'text-emerald-400'
              )}>
                {isDebit ? `-${amount}` : amount}
              </span>

              <span className="w-28 hidden sm:flex justify-center">
                <CategoryBadge category={status} />
              </span>

              <span className="w-36 text-right text-xs text-slate-400 hidden md:block">
                {formatDateTime(new Date(t.date)).dateTime}
              </span>

              <span className="w-36 hidden lg:flex justify-end">
                <CategoryBadge category={t.aiCategory || t.category} />
              </span>
            </div>
          </div>
        );
      })}
    </div>
  )
}

export default TransactionsTable
