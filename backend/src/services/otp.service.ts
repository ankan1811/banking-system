import crypto from 'crypto';
import { prisma } from '../lib/db.js';
import { Resend } from 'resend';

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10);

function getResendClient() {
  return new Resend(process.env.RESEND_API_KEY || '');
}

function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

export async function sendOtp(email: string): Promise<void> {
  const otp = generateOtp();
  const otpHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.otpCode.create({
    data: { email, otpHash, expiresAt },
  });

  if (process.env.MASTER_OTP) {
    console.log(`[DEV] OTP for ${email}: ${otp}`);
    return;
  }

  const resend = getResendClient();
  await resend.emails.send({
    from: process.env.EMAIL_FROM || "Ankan's Bank <noreply@example.com>",
    to: email,
    subject: "Your Ankan's Bank login code",
    text: `Your verification code is: ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
  });
}

export async function verifyOtp(email: string, submittedOtp: string): Promise<boolean> {
  if (process.env.MASTER_OTP && submittedOtp === process.env.MASTER_OTP) {
    return true;
  }

  const hash = hashOtp(submittedOtp);

  const record = await prisma.otpCode.findFirst({
    where: {
      email,
      otpHash: hash,
      used: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) return false;

  await prisma.otpCode.update({
    where: { id: record.id },
    data: { used: true },
  });

  return true;
}
