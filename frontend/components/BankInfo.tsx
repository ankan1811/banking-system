'use client';

import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { cn, formUrlQuery, formatAmount, getAccountTypeColors } from '@/lib/utils';

const BankInfo = ({ account, bankRecordId, type }: BankInfoProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isActive = bankRecordId === account?.bankRecordId;
  const colors = getAccountTypeColors(account?.type as AccountTypes);

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
      className={cn('bank-info', {
        'border-violet-500/30 shadow-glow-violet/10': type === 'card' && isActive,
        'rounded-2xl': type === 'card',
      })}
    >
      <figure className={cn('flex-center size-10 rounded-full shrink-0', colors.lightBg)}>
        <Image src="/icons/connect-bank.svg" width={20} height={20} alt={account.subtype} />
      </figure>
      <div className="flex w-full flex-1 flex-col justify-center gap-0.5">
        <div className="bank-info_content">
          <h2 className={cn('text-base line-clamp-1 flex-1 font-semibold', colors.title)}>
            {account.name}
          </h2>
          {type === 'full' && (
            <span className={cn('text-xs rounded-full px-2.5 py-0.5 font-medium', colors.subText, colors.lightBg)}>
              {account.subtype}
            </span>
          )}
        </div>
        <p className={cn('text-base font-semibold', colors.subText)}>
          {formatAmount(account.currentBalance)}
        </p>
      </div>
    </div>
  );
};

export default BankInfo;
