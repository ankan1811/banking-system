import React, { useCallback, useEffect, useState } from 'react'
import { Button } from './ui/button'
import { PlaidLinkOnSuccess, PlaidLinkOptions, usePlaidLink } from 'react-plaid-link'
import { createLinkToken, exchangePublicToken } from '@/lib/api/plaid.api';
import Image from 'next/image';

const PlaidLink = ({ user, variant }: PlaidLinkProps) => {
  const [token, setToken] = useState('');

  useEffect(() => {
    const getLinkToken = async () => {
      try {
        const data = await createLinkToken();
        setToken(data?.linkToken);
      } catch (err) {
        console.error('Failed to create Plaid link token:', err);
      }
    }

    if (user) getLinkToken();
  }, [user]);

  const onSuccess = useCallback<PlaidLinkOnSuccess>(async (public_token: string) => {
    await exchangePublicToken(public_token);
    window.location.href = '/';
  }, [])

  const config: PlaidLinkOptions = {
    token: token || null,
    onSuccess,
  }

  const { open, ready } = usePlaidLink(config);

  return (
    <>
      {variant === 'primary' ? (
        <Button
          onClick={() => open()}
          disabled={!ready}
          className="form-btn flex items-center justify-center gap-2"
        >
          Connect bank
        </Button>
      ): variant === 'ghost' ? (
        <Button onClick={() => open()} disabled={!ready} variant="ghost" className="plaidlink-ghost">
          <Image
            src="/icons/connect-bank.svg"
            alt="connect bank"
            width={24}
            height={24}
          />
          <p className='hidden text-[16px] font-semibold text-slate-200 xl:block'>Connect bank</p>
        </Button>
      ): (
        <Button onClick={() => open()} className="plaidlink-default">
          <Image
            src="/icons/connect-bank.svg"
            alt="connect bank"
            width={24}
            height={24}
          />
          <p className='text-[16px] font-semibold text-slate-200'>Connect bank</p>
        </Button>
      )}
    </>
  )
}

export default PlaidLink
