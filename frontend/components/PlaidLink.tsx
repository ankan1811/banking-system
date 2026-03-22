import React, { useCallback, useEffect, useState } from 'react'
import { Button } from './ui/button'
import { PlaidLinkOnSuccess, PlaidLinkOptions, usePlaidLink } from 'react-plaid-link'
import { createLinkToken, exchangePublicToken } from '@/lib/api/plaid.api';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';

const PlaidLinkButton = ({ token, variant }: { token: string; variant: string }) => {
  const [syncing, setSyncing] = useState(false);

  const onSuccess = useCallback<PlaidLinkOnSuccess>(async (public_token: string) => {
    setSyncing(true);
    await exchangePublicToken(public_token);
    window.location.href = '/';
  }, []);

  const { open, ready } = usePlaidLink({ token, onSuccess });

  return (
    <>
      {syncing && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 backdrop-blur-sm bg-black/60">
          <Loader2 size={48} className="animate-spin text-blue-400" />
          <p className="text-white text-lg font-semibold">Syncing your bank account…</p>
          <p className="text-white/50 text-sm">This may take a few seconds</p>
        </div>
      )}

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
        const data = await createLinkToken() as { linkToken?: string };
        if (data?.linkToken) setToken(data.linkToken);
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

  return <PlaidLinkButton token={token!} variant={variant ?? 'primary'} />;
};

export default PlaidLink
