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

  await createBankAccount({
    userId: user.id,
    bankId: itemId,
    accountId: accountData.account_id,
    accessToken,
    shareableId: encryptId(accountData.account_id),
  });

  return { publicTokenExchange: 'complete' };
};
