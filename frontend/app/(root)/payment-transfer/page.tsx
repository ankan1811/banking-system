import HeaderBox from '@/components/HeaderBox'
import PaymentTransferForm from '@/components/PaymentTransferForm'
import { serverApiRequest } from '@/lib/api/server-client';
import React from 'react'

const Transfer = async () => {
  const loggedIn = await serverApiRequest('/api/auth/me');
  const accounts = await serverApiRequest('/api/accounts');

  if(!accounts) return;

  const accountsData = accounts?.data;

  return (
    <section className="payment-transfer">
      <HeaderBox
        title="Payment Transfer"
        subtext="Please provide any specific details or notes related to the payment transfer"
      />

      <section className="size-full pt-5">
        <PaymentTransferForm accounts={accountsData} />
      </section>
    </section>
  )
}

export default Transfer
