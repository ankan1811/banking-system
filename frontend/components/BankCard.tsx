import { formatAmount } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import Copy from './Copy'

const BankCard = ({ account, userName, showBalance = true }: CreditCardProps) => {
  return (
    <div className="flex flex-col">
      <div className="bank-card-wrapper">
        <Link href={`/transaction-history/?id=${account.bankRecordId}`} className="bank-card">
          <div className="bank-card_content">
            <div>
              <h1 className="text-16 font-semibold text-white">{account.name}</h1>
              <p className="font-ibm-plex-serif text-2xl font-black text-white mt-1">
                {formatAmount(account.currentBalance)}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-white/70">{userName}</span>
                <span className="text-xs font-medium text-white/70">●● / ●●</span>
              </div>
              <p className="text-sm font-mono tracking-[2px] text-white/90">
                ●●●● ●●●● ●●●● <span className="text-base">{account?.mask}</span>
              </p>
            </div>
          </div>

          <div className="bank-card_icon">
            <Image src="/icons/Paypass.svg" width={20} height={24} alt="pay" />
            <Image src="/icons/mastercard.svg" width={45} height={32} alt="mastercard" />
          </div>
        </Link>
      </div>
      {showBalance && <Copy title={account?.sharaebleId} />}
    </div>
  )
}

export default BankCard
