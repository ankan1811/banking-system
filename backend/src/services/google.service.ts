import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../lib/db.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function verifyGoogleToken(idToken: string) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw new Error('Invalid Google token');
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    firstName: payload.given_name || '',
    lastName: payload.family_name || '',
  };
}

export async function findOrCreateGoogleUser(googlePayload: {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
}) {
  // Check if user exists by googleId
  let user = await prisma.user.findUnique({
    where: { googleId: googlePayload.googleId },
  });

  if (user) return user;

  // Check if user exists by email (previously signed up via OTP)
  user = await prisma.user.findUnique({
    where: { email: googlePayload.email },
  });

  if (user) {
    // Link Google account to existing user
    user = await prisma.user.update({
      where: { id: user.id },
      data: { googleId: googlePayload.googleId },
    });
    return user;
  }

  // Create new user (with minimal required fields — they can complete profile later)
  user = await prisma.user.create({
    data: {
      email: googlePayload.email,
      firstName: googlePayload.firstName,
      lastName: googlePayload.lastName,
      googleId: googlePayload.googleId,
      address1: '',
      city: '',
      state: '',
      postalCode: '',
      dateOfBirth: '',
      ssn: '',
    },
  });

  return user;
}
