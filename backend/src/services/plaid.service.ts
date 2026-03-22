import {
  CountryCode,
  Products,
} from 'plaid';
import { plaidClient } from '../lib/plaid.js';
import { encryptId } from '../lib/utils.js';
import { createBankAccount } from './user.service.js';
import type { User } from '@shared/types';

export const createLinkToken = async (
  userId: string,
  firstName: string,
  lastName: string
) => {
  const tokenParams = {
    user: {
      client_user_id: userId,
    },
    client_name: `${firstName} ${lastName}`,
    products: ['auth', 'transactions'] as Products[],
    language: 'en',
    country_codes: ['US'] as CountryCode[],
  };

  const response = await plaidClient.linkTokenCreate(tokenParams);

  return { linkToken: response.data.link_token };
};

export const exchangePublicToken = async (
  publicToken: string,
  user: User
) => {
  const response = await plaidClient.itemPublicTokenExchange({
    public_token: publicToken,
  });

  const accessToken = response.data.access_token;
  const itemId = response.data.item_id;

  const accountsResponse = await plaidClient.accountsGet({
    access_token: accessToken,
  });

  const accountData = accountsResponse.data.accounts[0];
  const institutionId = accountsResponse.data.item.institution_id;

  // Fetch institution name
  let institutionName: string | undefined;
  if (institutionId) {
    try {
      const { getInstitution } = await import('./bank.service.js');
      const institution = await getInstitution(institutionId);
      institutionName = institution.name;
    } catch {}
  }

  await createBankAccount({
    userId: user.id,
    bankId: itemId,
    accountId: accountData.account_id,
    accessToken,
    shareableId: encryptId(accountData.account_id),
    availableBalance: accountData.balances.available ?? undefined,
    currentBalance: accountData.balances.current ?? undefined,
    institutionName,
    institutionId: institutionId ?? undefined,
    accountName: accountData.name,
    officialName: accountData.official_name ?? undefined,
    mask: accountData.mask ?? undefined,
    accountType: accountData.type as string,
    accountSubtype: accountData.subtype as string ?? undefined,
  });

  return { publicTokenExchange: 'complete' };
};
