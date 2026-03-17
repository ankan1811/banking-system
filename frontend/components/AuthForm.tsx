'use client';

import Image from 'next/image'
import Link from 'next/link'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import Script from 'next/script'

import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import CustomInput from './CustomInput';
import { authFormSchema, otpSchema } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { requestSignInOTP, verifySignInOTP, requestSignUpOTP, verifySignUpOTP, googleSignIn } from '@/lib/api/auth.api';
import PlaidLink from './PlaidLink';

const AuthForm = ({ type }: { type: string }) => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [savedFormData, setSavedFormData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // OTP input refs and state
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);

  const formSchema = authFormSchema(type);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  })

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: "",
    },
  })

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value[0];
    const newValues = [...otpValues];
    newValues[index] = value;
    setOtpValues(newValues);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits filled
    if (newValues.every(v => v) && newValues.join('').length === 6) {
      otpForm.setValue('otp', newValues.join(''));
      otpForm.handleSubmit(onSubmitOtp)();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Step 1: Request OTP
  const onSubmitForm = async (data: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setError(null);

    try {
      if (type === 'sign-up') {
        const userData = {
          firstName: data.firstName!,
          lastName: data.lastName!,
          address1: data.address1!,
          city: data.city!,
          state: data.state!,
          postalCode: data.postalCode!,
          dateOfBirth: data.dateOfBirth!,
          ssn: data.ssn!,
          email: data.email,
        }
        setSavedFormData(userData);
        await requestSignUpOTP({ email: data.email });
      }

      if (type === 'sign-in') {
        setSavedFormData({ email: data.email });
        await requestSignInOTP({ email: data.email });
      }

      setStep('otp');
      setOtpValues(['', '', '', '', '', '']);
    } catch (error: any) {
      setError(error?.message || 'Something went wrong');
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  }

  // Google Sign-In handler
  const handleGoogleResponse = useCallback(async (response: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const result: any = await googleSignIn(response.credential);
      if (type === 'sign-in') {
        router.push('/');
      } else {
        setUser(result);
      }
    } catch (error: any) {
      setError(error?.message || 'Google sign-in failed');
    } finally {
      setIsLoading(false);
    }
  }, [type, router]);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).google) {
      (window as any).google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
      });
    }
  }, [handleGoogleResponse]);

  const renderGoogleButton = () => {
    if (typeof window !== 'undefined' && (window as any).google) {
      const container = document.getElementById('google-signin-btn');
      if (container) {
        container.innerHTML = '';
        (window as any).google.accounts.id.renderButton(container, {
          theme: 'outline',
          size: 'large',
          width: '100%',
          text: type === 'sign-in' ? 'signin_with' : 'signup_with',
        });
      }
    }
  };

  // Step 2: Verify OTP
  const onSubmitOtp = async (data: z.infer<typeof otpSchema>) => {
    setIsLoading(true);
    setError(null);

    try {
      if (type === 'sign-up') {
        const newUser = await verifySignUpOTP({
          ...savedFormData,
          otp: data.otp,
        });
        setUser(newUser);
      }

      if (type === 'sign-in') {
        const response = await verifySignInOTP({
          email: savedFormData.email,
          otp: data.otp,
        });
        if (response) router.push('/');
      }
    } catch (error: any) {
      setError(error?.message || 'Invalid or expired OTP');
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="auth-form">
      <Script
        src="https://accounts.google.com/gsi/client"
        onLoad={renderGoogleButton}
      />
      <header className='flex flex-col gap-5 md:gap-8'>
          <Link href="/" className="cursor-pointer flex items-center gap-2">
            <Image
              src="/icons/logo.svg"
              width={34}
              height={34}
              alt="Ankan's Bank logo"
            />
            <h1 className="text-26 font-ibm-plex-serif font-bold text-white">Ankan's Bank</h1>
          </Link>

          <div className="flex flex-col gap-1 md:gap-3">
            <h1 className="text-24 lg:text-36 font-semibold text-white">
              {user
                ? 'Link Account'
                : step === 'otp'
                  ? 'Enter Verification Code'
                  : type === 'sign-in'
                    ? 'Sign In'
                    : 'Sign Up'
              }
            </h1>
            <p className="text-16 font-normal text-slate-400">
              {user
                ? 'Link your account to get started'
                : step === 'otp'
                  ? 'We sent a 6-digit code to your email'
                  : 'Please enter your details'
              }
            </p>
          </div>
      </header>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 px-4 py-3 rounded-xl text-14">
          {error}
        </div>
      )}

      {user ? (
        <div className="flex flex-col gap-4">
          <PlaidLink user={user} variant="primary" />
        </div>
      ) : step === 'otp' ? (
        <>
          <Form {...otpForm}>
            <form onSubmit={otpForm.handleSubmit(onSubmitOtp)} className="space-y-8">
              <FormField
                control={otpForm.control}
                name="otp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="form-label">Verification Code</FormLabel>
                    <FormControl>
                      <div>
                        <div className="flex justify-center gap-3 mt-2">
                          {otpValues.map((val, i) => (
                            <input
                              key={i}
                              ref={(el) => { otpRefs.current[i] = el; }}
                              type="text"
                              inputMode="numeric"
                              maxLength={1}
                              value={val}
                              onChange={(e) => handleOtpChange(i, e.target.value)}
                              onKeyDown={(e) => handleOtpKeyDown(i, e)}
                              className="otp-box"
                            />
                          ))}
                        </div>
                        {/* Hidden input to store combined OTP value for form validation */}
                        <Input
                          type="hidden"
                          {...field}
                          value={otpValues.join('')}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="form-message mt-2 text-center" />
                  </FormItem>
                )}
              />

              <div className="flex flex-col gap-4">
                <Button type="submit" disabled={isLoading} className="form-btn">
                  {isLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" /> &nbsp;
                      Verifying...
                    </>
                  ) : 'Verify Code'}
                </Button>
              </div>
            </form>
          </Form>

          <button
            type="button"
            onClick={() => { setStep('form'); setError(null); otpForm.reset(); setOtpValues(['', '', '', '', '', '']); }}
            className="text-14 text-bankGradient cursor-pointer text-center"
          >
            Back to {type === 'sign-in' ? 'Sign In' : 'Sign Up'}
          </button>
        </>
      ) : (
        <>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitForm)} className="space-y-8">
              {type === 'sign-up' && (
                <>
                  <div className="flex gap-4">
                    <CustomInput control={form.control} name='firstName' label="First Name" placeholder='Enter your first name' />
                    <CustomInput control={form.control} name='lastName' label="Last Name" placeholder='Enter your last name' />
                  </div>
                  <CustomInput control={form.control} name='address1' label="Address" placeholder='Enter your specific address' />
                  <CustomInput control={form.control} name='city' label="City" placeholder='Enter your city' />
                  <div className="flex gap-4">
                    <CustomInput control={form.control} name='state' label="State" placeholder='Example: NY' />
                    <CustomInput control={form.control} name='postalCode' label="Postal Code" placeholder='Example: 11101' />
                  </div>
                  <div className="flex gap-4">
                    <CustomInput control={form.control} name='dateOfBirth' label="Date of Birth" placeholder='YYYY-MM-DD' />
                    <CustomInput control={form.control} name='ssn' label="SSN" placeholder='Example: 1234' />
                  </div>
                </>
              )}

              <CustomInput control={form.control} name='email' label="Email" placeholder='Enter your email' />

              <div className="flex flex-col gap-4">
                <Button type="submit" disabled={isLoading} className="form-btn">
                  {isLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" /> &nbsp;
                      Sending Code...
                    </>
                  ) : 'Send Verification Code'}
                </Button>
              </div>
            </form>
          </Form>

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-slate-700/50" />
            <p className="text-14 text-slate-400">or</p>
            <div className="flex-1 h-px bg-slate-700/50" />
          </div>

          <div id="google-signin-btn" className="flex justify-center" />

          <footer className="flex justify-center gap-1">
            <p className="text-14 font-normal text-slate-400">
              {type === 'sign-in'
              ? "Don't have an account?"
              : "Already have an account?"}
            </p>
            <Link href={type === 'sign-in' ? '/sign-up' : '/sign-in'} className="form-link">
              {type === 'sign-in' ? 'Sign up' : 'Sign in'}
            </Link>
          </footer>
        </>
      )}
    </section>
  )
}

export default AuthForm
