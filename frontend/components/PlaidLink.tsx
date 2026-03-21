import React, { useCallback, useEffect, useState } from 'react'
import { Button } from './ui/button'
import { PlaidLinkOnSuccess, PlaidLinkOptions, usePlaidLink } from 'react-plaid-link'
import { createLinkToken, exchangePublicToken } from '@/lib/api/plaid.api';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';

const PlaidLinkButton = ({ token, variant }: { token: string; variant: string }) => {
  const onSuccess = useCallback<PlaidLinkOnSuccess>(async (public_token: string) => {
    await exchangePublicToken(public_token);
    window.location.href = '/';
  }, []);

  const { open, ready } = usePlaidLink({ token, onSuccess });

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
      ) : variant === 'ghost' ? (
        <Button onClick={() => open()} disabled={!ready} variant="ghost" className="plaidlink-ghost">
          <Image src="/icons/connect-bank.svg" alt="connect bank" width={24} height={24} />
          <p className='hidden text-[16px] font-semibold text-slate-200 xl:block'>Connect bank</p>
        </Button>
      ) : (
        <Button onClick={() => open()} disabled={!ready} className="plaidlink-default">
          <Image src="/icons/connect-bank.svg" alt="connect bank" width={24} height={24} />
          <p className='text-[16px] font-semibold text-slate-200'>Connect bank</p>
        </Button>
      )}
    </>
  );
};

const PlaidLink = ({ user, variant }: PlaidLinkProps) => {
  const [token, setToken] = useState<string | null>(null);

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

  // Don't mount the Plaid hook until the token is ready
  if (!token) {
    return variant === 'primary' ? (
      <Button disabled className="form-btn flex items-center justify-center gap-2">
        <Loader2 size={16} className="animate-spin" /> Connect bank
      </Button>
    ) : variant === 'ghost' ? (
      <Button disabled variant="ghost" className="plaidlink-ghost">
        <Image src="/icons/connect-bank.svg" alt="connect bank" width={24} height={24} />
        <p className='hidden text-[16px] font-semibold text-slate-200 xl:block'>Connect bank</p>
      </Button>
    ) : null;
  }

  return <PlaidLinkButton token={token} variant={variant} />;
};

export default PlaidLink
