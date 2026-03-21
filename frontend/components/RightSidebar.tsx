'use client'

import Link from 'next/link'
import React, { useState } from 'react'
import BankCard from './BankCard'
import { countTransactionCategories } from '@/lib/utils'
import Category from './Category'
import PlaidLink from './PlaidLink'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const RightSidebar = ({ user, transactions, banks }: RightSidebarProps) => {
  const categories: CategoryCount[] = countTransactionCategories(transactions);
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  const handlePrev = () => setActiveCardIndex(i => Math.max(0, i - 1));
  const handleNext = () => setActiveCardIndex(i => Math.min(banks.length - 1, i + 1));

  return (
    <aside className="right-sidebar">
      <section className="flex flex-col pb-8">
        <div className="profile-banner" />
        <div className="profile">
          <div className="profile-img">
            <span className="text-5xl font-bold bg-gradient-to-br from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              {user.firstName[0]}
            </span>
          </div>

          <div className="profile-details">
            <h1 className='profile-name'>
              {user.firstName} {user.lastName}
            </h1>
            <p className="profile-email">
              {user.email}
            </p>
          </div>
        </div>
      </section>

      <section className="banks">
        <div className="flex w-full justify-between items-center">
          <h2 className="header-2">My Banks</h2>
          <PlaidLink user={user} variant="ghost" />
        </div>

        {banks?.length > 0 && (
          <div className="flex flex-col items-center gap-3">
            <BankCard
              account={banks[activeCardIndex]}
              userName={`${user.firstName} ${user.lastName}`}
              showBalance={false}
            />

            {banks.length > 1 && (
              <div className="flex items-center gap-3 w-full justify-between px-1">
                <button
                  onClick={handlePrev}
                  disabled={activeCardIndex === 0}
                  className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={18} />
                </button>

                <div className="flex gap-1.5">
                  {banks.map((_: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => setActiveCardIndex(i)}
                      className={`h-1.5 rounded-full transition-all ${
                        i === activeCardIndex ? 'w-4 bg-blue-400' : 'w-1.5 bg-gray-500'
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={handleNext}
                  disabled={activeCardIndex === banks.length - 1}
                  className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-10 flex flex-1 flex-col gap-6">
          <h2 className="header-2">Top categories</h2>

          <div className='space-y-5'>
            {categories.map((category, index) => (
              <Category key={category.name} category={category} />
            ))}
          </div>
        </div>
      </section>
    </aside>
  )
}

export default RightSidebar
