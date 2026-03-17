import AnimatedCounter from './AnimatedCounter'
import DoughnutChart from './DoughnutChart'

const TotalBalanceBox = ({ accounts = [], totalBanks, totalCurrentBalance }: TotalBalanceBoxProps) => {
  return (
    <div className="space-y-4">
      {/* Hero Balance Card */}
      <section className="total-balance">
        <div className="flex-1">
          <p className="total-balance-label">Total Current Balance</p>
          <div className="total-balance-amount">
            <AnimatedCounter amount={totalCurrentBalance} />
          </div>
          <p className="text-sm text-slate-500 mt-1">{totalBanks} Bank Account{totalBanks !== 1 ? 's' : ''} connected</p>
        </div>
        <div className="shrink-0 w-[100px] sm:w-[120px]">
          <DoughnutChart accounts={accounts} />
        </div>
      </section>
    </div>
  )
}

export default TotalBalanceBox
