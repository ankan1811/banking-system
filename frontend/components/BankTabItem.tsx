'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { cn, formUrlQuery } from '@/lib/utils';

export const BankTabItem = ({ account, bankRecordId }: BankTabItemProps) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isActive = bankRecordId === account?.bankRecordId;

  const handleBankChange = () => {
    const newUrl = formUrlQuery({
      params: searchParams.toString(),
      key: 'id',
      value: account?.bankRecordId,
    });
    router.push(newUrl, { scroll: false });
  };

  return (
    <div
      onClick={handleBankChange}
      className={cn('banktab-item', {
        'bg-gradient-to-r from-violet-600/20 to-indigo-600/15 border-violet-500/20 text-white': isActive,
        'text-slate-400 hover:text-white hover:bg-white/[0.04]': !isActive,
      })}
    >
      <p className="line-clamp-1">{account.name}</p>
    </div>
  );
};
