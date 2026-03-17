import BankCard from '@/components/BankCard';
import HeaderBox from '@/components/HeaderBox'
import { serverApiRequest } from '@/lib/api/server-client';
import React from 'react'

const MyBanks = async () => {
  const loggedIn = await serverApiRequest('/api/auth/me');
  const accounts = await serverApiRequest('/api/accounts');

  return (
    <section className='flex'>
      <div className="my-banks">
        <HeaderBox
          title="My Bank Accounts"
          subtext="Effortlessly manage your banking activites."
        />

        <div className="space-y-4">
          <h2 className="header-2">
            Your cards
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {accounts && accounts.data.map((a: Account) => (
              <BankCard
                key={a.id}
                account={a}
                userName={loggedIn?.firstName}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default MyBanks
