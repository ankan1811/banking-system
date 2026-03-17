import { z } from "zod";

export const authFormSchema = (type: string) => z.object({
  firstName: type === 'sign-in' ? z.string().optional() : z.string().min(3),
  lastName: type === 'sign-in' ? z.string().optional() : z.string().min(3),
  address1: type === 'sign-in' ? z.string().optional() : z.string().max(50),
  city: type === 'sign-in' ? z.string().optional() : z.string().max(50),
  state: type === 'sign-in' ? z.string().optional() : z.string().min(2).max(2),
  postalCode: type === 'sign-in' ? z.string().optional() : z.string().min(3).max(6),
  dateOfBirth: type === 'sign-in' ? z.string().optional() : z.string().min(3),
  ssn: type === 'sign-in' ? z.string().optional() : z.string().min(3),
  email: z.string().email(),
});

export const otpSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits"),
});

export function encryptId(id: string) {
  return btoa(id);
}

export function decryptId(id: string) {
  return atob(id);
}
