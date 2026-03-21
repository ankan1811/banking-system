import Image from 'next/image';
import Link from 'next/link';

const LandingPreview = () => {
  return (
    <div className="relative min-h-screen w-full bg-[#0a0e1a] overflow-hidden">
      {/* Blurred mock dashboard background */}
      <div className="absolute inset-0 blur-[6px] opacity-60 pointer-events-none select-none" aria-hidden>
        <div className="flex h-screen w-full">
          {/* Mock sidebar */}
          <aside className="hidden lg:flex flex-col w-[280px] bg-slate-900/80 border-r border-slate-800 p-6 gap-6">
            <div className="flex items-center gap-2 mb-4">
              <Image src="/icons/logo.svg" width={34} height={34} alt="" />
              <span className="text-xl font-bold text-white font-ibm-plex-serif">Ankan&apos;s Bank</span>
            </div>
            {['Dashboard', 'My Banks', 'Transfer', 'Transactions', 'Budgets', 'Goals', 'Insights'].map((item) => (
              <div key={item} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-800/40">
                <div className="w-5 h-5 rounded bg-slate-700" />
                <span className="text-sm text-slate-400">{item}</span>
              </div>
            ))}
          </aside>

          {/* Mock main content */}
          <div className="flex-1 p-6 lg:p-10 overflow-hidden">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-semibold text-white">
                Welcome, <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">User</span>
              </h1>
              <p className="text-slate-400 mt-1">Access and manage your account and transactions efficiently.</p>
            </div>

            {/* Mock balance card */}
            <div className="rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 p-6 mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Total Current Balance</p>
                <p className="text-3xl font-bold text-white">$24,589.35</p>
                <p className="text-sm text-slate-500 mt-1">3 Bank Accounts connected</p>
              </div>
              <div className="w-[100px] h-[100px] rounded-full bg-gradient-to-br from-violet-500/30 to-cyan-500/30 border-4 border-violet-500/40" />
            </div>

            {/* Mock chart area */}
            <div className="rounded-2xl bg-slate-800/40 border border-slate-700/50 p-6 mb-6">
              <p className="text-sm font-medium text-slate-300 mb-4">Spending by Category</p>
              <div className="flex gap-3 items-end h-32">
                {[60, 85, 45, 70, 30, 90, 55].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-lg bg-gradient-to-t from-violet-500/40 to-cyan-500/20"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Mock transactions */}
            <div className="rounded-2xl bg-slate-800/40 border border-slate-700/50 p-6">
              <p className="text-sm font-medium text-slate-300 mb-4">Recent Transactions</p>
              {['Netflix Subscription', 'Grocery Store', 'Salary Deposit', 'Electric Bill', 'Restaurant'].map((t, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-slate-700/30 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-700/60" />
                    <span className="text-sm text-slate-300">{t}</span>
                  </div>
                  <span className="text-sm text-slate-400">{i === 2 ? '+$4,500.00' : `-$${(Math.random() * 200 + 10).toFixed(2)}`}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mock right sidebar */}
          <aside className="hidden xl:flex flex-col w-[300px] bg-slate-900/60 border-l border-slate-800 p-6 gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500/30 to-cyan-500/30 mx-auto" />
            <div className="h-4 w-24 bg-slate-700 rounded mx-auto" />
            <div className="h-3 w-32 bg-slate-800 rounded mx-auto" />
            <div className="mt-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl bg-slate-800/60 border border-slate-700/40 p-4">
                  <div className="h-3 w-20 bg-slate-700 rounded mb-2" />
                  <div className="h-4 w-16 bg-slate-600 rounded" />
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>

      {/* CTA overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
        <div className="max-w-lg w-full text-center bg-slate-900/90 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-10 shadow-2xl shadow-violet-500/10">
          <div className="flex justify-center mb-6">
            <Image src="/icons/logo.svg" width={56} height={56} alt="Ankan's Bank logo" />
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-white font-ibm-plex-serif mb-3">
            Ankan&apos;s Bank
          </h1>
          <p className="text-slate-400 text-lg mb-2">
            Your smart financial dashboard
          </p>
          <p className="text-slate-500 text-sm mb-8">
            Track spending, set budgets, manage goals, and get AI-powered insights — all in one place.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/sign-up"
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-semibold text-base hover:from-violet-500 hover:to-cyan-500 transition-all shadow-lg shadow-violet-500/25"
            >
              Get Started
            </Link>
            <Link
              href="/sign-in"
              className="px-8 py-3 rounded-xl border border-slate-600 text-slate-300 font-semibold text-base hover:bg-slate-800 transition-all"
            >
              Sign In
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">AI</p>
              <p className="text-xs text-slate-500">Powered Insights</p>
            </div>
            <div>
              <p className="text-lg font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">100%</p>
              <p className="text-xs text-slate-500">Secure</p>
            </div>
            <div>
              <p className="text-lg font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">Free</p>
              <p className="text-xs text-slate-500">To Use</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPreview;
