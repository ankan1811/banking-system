import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { sendOtp, verifyOtp } from '../services/otp.service.js';
import { createSession, destroySession } from '../services/auth.service.js';
import { getUserInfo, createUser, updateProfile, deleteUser } from '../services/user.service.js';
import { verifyGoogleToken, findOrCreateGoogleUser } from '../services/google.service.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const emailSchema = z.object({
  email: z.string().email(),
});

const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

const signUpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  address1: z.string().min(1),
  country: z.string().min(2).max(3),
  city: z.string().min(1),
  state: z.string().min(2).max(5),
  postalCode: z.string().min(3).max(10),
  dateOfBirth: z.string().min(1),
  ssn: z.string().min(1),
});

// POST /api/auth/request-signin-otp
router.post('/request-signin-otp', async (req: Request, res: Response) => {
  try {
    const { email } = emailSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(404).json({ error: 'No account found with this email' });
      return;
    }

    await sendOtp(email);
    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Error requesting sign-in OTP:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// POST /api/auth/verify-signin-otp
router.post('/verify-signin-otp', async (req: Request, res: Response) => {
  try {
    const { email, otp } = verifyOtpSchema.parse(req.body);

    const isValid = await verifyOtp(email, otp);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid or expired OTP' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await createSession(res, user.id, user.tokenVersion);

    res.json({
      ...user,
      name: `${user.firstName} ${user.lastName}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Error verifying sign-in OTP:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// POST /api/auth/request-signup-otp
router.post('/request-signup-otp', async (req: Request, res: Response) => {
  try {
    const { email } = emailSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }

    await sendOtp(email);
    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Error requesting sign-up OTP:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// POST /api/auth/verify-signup-otp
router.post('/verify-signup-otp', async (req: Request, res: Response) => {
  try {
    const { email, otp, ...userData } = signUpSchema.parse(req.body);

    const isValid = await verifyOtp(email, otp);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid or expired OTP' });
      return;
    }

    const newUser = await createUser({
      email,
      ...userData,
    });

    await createSession(res, newUser.id, newUser.tokenVersion);

    res.status(201).json(newUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Error verifying sign-up OTP:', error);
    const message = error instanceof Error ? error.message : 'Failed to create account';
    res.status(500).json({ error: message });
  }
});

// POST /api/auth/google
router.post('/google', async (req: Request, res: Response) => {
  try {
    const { idToken } = z.object({ idToken: z.string() }).parse(req.body);

    const googlePayload = await verifyGoogleToken(idToken);
    const user = await findOrCreateGoogleUser(googlePayload);

    await createSession(res, user.id, user.tokenVersion);

    res.json({
      ...user,
      name: `${user.firstName} ${user.lastName}`,
    });
  } catch (error) {
    console.error('Google sign-in error:', error);
    const message = error instanceof Error ? error.message : 'Google sign-in failed';
    res.status(401).json({ error: message });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await getUserInfo(req.userId!);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// POST /api/auth/logout
router.post('/logout', requireAuth, async (req: Request, res: Response) => {
  try {
    // Increment tokenVersion to invalidate all existing JWTs for this user
    await prisma.user.update({
      where: { id: req.userId! },
      data: { tokenVersion: { increment: 1 } },
    });

    await destroySession(res);
    res.json({ success: true });
  } catch (error) {
    console.error('Error logging out:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
});

// PATCH /api/auth/profile
const profileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  address1: z.string().min(1).optional(),
  country: z.string().min(2).max(3).optional(),
  city: z.string().min(1).optional(),
  state: z.string().min(2).max(5).optional(),
  postalCode: z.string().min(3).max(10).optional(),
});

router.patch('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = profileSchema.parse(req.body);
    const user = await updateProfile(req.userId!, data);
    res.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// DELETE /api/auth/account
router.delete('/account', requireAuth, async (req: Request, res: Response) => {
  try {
    await deleteUser(req.userId!);
    await destroySession(res);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
