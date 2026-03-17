import { apiRequest } from './client';

export async function requestSignInOTP({ email }: { email: string }) {
  return apiRequest('/api/auth/request-signin-otp', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function verifySignInOTP({ email, otp }: { email: string; otp: string }) {
  return apiRequest('/api/auth/verify-signin-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  });
}

export async function requestSignUpOTP({ email }: { email: string }) {
  return apiRequest('/api/auth/request-signup-otp', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function verifySignUpOTP(data: any) {
  return apiRequest('/api/auth/verify-signup-otp', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function logoutAccount() {
  return apiRequest('/api/auth/logout', { method: 'POST' });
}

export async function googleSignIn(idToken: string) {
  return apiRequest('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  });
}
