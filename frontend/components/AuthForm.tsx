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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import CustomInput from './CustomInput';
import { authFormSchema, otpSchema } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { requestSignInOTP, verifySignInOTP, requestSignUpOTP, verifySignUpOTP, googleSignIn, updateProfile } from '@/lib/api/auth.api';
import StatementUpload from './StatementUpload';
import { countries, getStatesForCountry } from '@/lib/countryStateData';
import { completeProfileSchema } from '@/lib/utils';
import DatePicker from './DatePicker';

const AuthForm = ({ type }: { type: string }) => {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'otp' | 'complete-profile'>('form');
  const [savedFormData, setSavedFormData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // OTP input refs and state
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  // Check if script is already loaded (e.g. client-side navigation)
  const [googleScriptLoaded, setGoogleScriptLoaded] = useState(
    () => typeof window !== 'undefined' && !!(window as any).google
  );

  const formSchema = authFormSchema(type);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      country: "",
      state: "",
    },
  })

  const selectedCountry = form.watch('country');

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: "",
    },
  })

  const profileForm = useForm<z.infer<typeof completeProfileSchema>>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: {
      address1: "", country: "", city: "", state: "", postalCode: "", dateOfBirth: "", ssn: "",
    },
  })

  const selectedProfileCountry = profileForm.watch('country');

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
          country: data.country!,
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }

  // Google Sign-In handler
  const handleGoogleResponse = useCallback(async (response: any) => {
    setIsGoogleLoading(true);
    setError(null);
    try {
      const result: any = await googleSignIn(response.credential);
      // Profile incomplete (new Google user) — collect missing fields regardless of sign-in/sign-up
      if (!result.address1) {
        setSavedFormData(result);
        setStep('complete-profile');
      } else if (type === 'sign-in') {
        window.location.href = '/';
      } else {
        setUser(result);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed';
      setError(message);
    } finally {
      setIsGoogleLoading(false);
    }
  }, [type]);

  const onSubmitCompleteProfile = async (data: z.infer<typeof completeProfileSchema>) => {
    setIsLoading(true);
    setError(null);
    try {
      await updateProfile(data);
      setUser(savedFormData);
    } catch (error: any) {
      setError(error?.message || 'Failed to save profile');
    } finally {
      setIsLoading(false);
    }
  };

  const [dummyLoading, setDummyLoading] = useState(false);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

  const handleUseDummy = async () => {
    setDummyLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/statements/upload-dummy`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load dummy statement');
      window.location.href = '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dummy statement');
      setDummyLoading(false);
    }
  };

  const renderGoogleButton = useCallback(() => {
    if (typeof window === 'undefined' || !(window as any).google) return;
    if (!googleBtnRef.current) return;
    (window as any).google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      callback: handleGoogleResponse,
    });
    googleBtnRef.current.innerHTML = '';
    (window as any).google.accounts.id.renderButton(googleBtnRef.current, {
      theme: 'filled_black',
      size: 'large',
      width: '100%',
      text: type === 'sign-in' ? 'signin_with' : 'signup_with',
    });
  }, [handleGoogleResponse, type]);

  // Render Google button whenever script is loaded AND we're on the form step
  useEffect(() => {
    if (step === 'form' && googleScriptLoaded) {
      const timer = setTimeout(renderGoogleButton, 50);
      return () => clearTimeout(timer);
    }
  }, [step, googleScriptLoaded, renderGoogleButton]);

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
        if (response) window.location.href = '/';
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
        onLoad={() => setGoogleScriptLoaded(true)}
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
                  : step === 'complete-profile'
                    ? 'Complete Your Profile'
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
                  : step === 'complete-profile'
                    ? 'A few more details to set up your account'
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
          <StatementUpload />
          <div className="flex items-center justify-center gap-4 mt-1">
            <button
              type="button"
              onClick={handleUseDummy}
              disabled={dummyLoading}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50"
            >
              {dummyLoading ? 'Loading...' : 'Use dummy SBI Bank statement'}
            </button>
            <span className="text-slate-600 text-xs">|</span>
            <button
              type="button"
              onClick={() => { window.location.href = '/'; }}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Skip for now
            </button>
          </div>
        </div>
      ) : step === 'complete-profile' ? (
        <Form {...profileForm}>
          <form onSubmit={profileForm.handleSubmit(onSubmitCompleteProfile)} className="space-y-8">
            <CustomInput control={profileForm.control} name='address1' label="Address" placeholder='Enter your address' />

            <FormField control={profileForm.control} name="country" render={({ field }) => (
              <div className="form-item">
                <FormLabel className="form-label">Country</FormLabel>
                <div className="flex w-full flex-col">
                  <FormControl>
                    <Select onValueChange={(v) => { field.onChange(v); profileForm.setValue('state', ''); }} value={field.value}>
                      <SelectTrigger className="input-class"><SelectValue placeholder="Select your country" /></SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700">
                        {countries.map((c) => (
                          <SelectItem key={c.code} value={c.code} className="text-white focus:bg-slate-800 focus:text-white">{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage className="form-message mt-2" />
                </div>
              </div>
            )} />

            <CustomInput control={profileForm.control} name='city' label="City" placeholder='Enter your city' />

            <div className="flex gap-4">
              <FormField control={profileForm.control} name="state" render={({ field }) => (
                <div className="form-item">
                  <FormLabel className="form-label">State / Province</FormLabel>
                  <div className="flex w-full flex-col">
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!selectedProfileCountry}>
                        <SelectTrigger className="input-class">
                          <SelectValue placeholder={selectedProfileCountry ? "Select state" : "Select country first"} />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700 max-h-60">
                          {getStatesForCountry(selectedProfileCountry || '').map((s) => (
                            <SelectItem key={s.code} value={s.code} className="text-white focus:bg-slate-800 focus:text-white">{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage className="form-message mt-2" />
                  </div>
                </div>
              )} />
              <CustomInput control={profileForm.control} name='postalCode' label="Postal Code" placeholder='Example: 11101' />
            </div>

            <div className="flex gap-4">
              <FormField control={profileForm.control} name="dateOfBirth" render={({ field }) => (
                <div className="form-item">
                  <FormLabel className="form-label">Date of Birth</FormLabel>
                  <div className="flex w-full flex-col">
                    <FormControl>
                      <DatePicker value={field.value ?? ''} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage className="form-message mt-2" />
                  </div>
                </div>
              )} />
              <CustomInput control={profileForm.control} name='ssn' label="SSN" placeholder='Example: 1234' />
            </div>

            <Button type="submit" disabled={isLoading} className="form-btn">
              {isLoading ? <><Loader2 size={20} className="animate-spin" /> &nbsp;Saving...</> : 'Continue'}
            </Button>
          </form>
        </Form>
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

                  {/* Country dropdown */}
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <div className="form-item">
                        <FormLabel className="form-label">Country</FormLabel>
                        <div className="flex w-full flex-col">
                          <FormControl>
                            <Select
                              onValueChange={(value) => {
                                field.onChange(value);
                                form.setValue('state', '');
                              }}
                              value={field.value}
                            >
                              <SelectTrigger className="input-class">
                                <SelectValue placeholder="Select your country" />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-900 border-slate-700">
                                {countries.map((country) => (
                                  <SelectItem
                                    key={country.code}
                                    value={country.code}
                                    className="text-white hover:bg-slate-800 focus:bg-slate-800 focus:text-white"
                                  >
                                    <span className="flex items-center gap-2">
                                      <span>{country.flag}</span>
                                      <span>{country.name}</span>
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage className="form-message mt-2" />
                        </div>
                      </div>
                    )}
                  />

                  <CustomInput control={form.control} name='city' label="City" placeholder='Enter your city' />

                  <div className="flex gap-4">
                    {/* State dropdown — dynamic based on country */}
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <div className="form-item">
                          <FormLabel className="form-label">State / Province</FormLabel>
                          <div className="flex w-full flex-col">
                            <FormControl>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                                disabled={!selectedCountry}
                              >
                                <SelectTrigger className="input-class">
                                  <SelectValue placeholder={selectedCountry ? "Select state" : "Select country first"} />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-700 max-h-60">
                                  {getStatesForCountry(selectedCountry || '').map((state) => (
                                    <SelectItem
                                      key={state.code}
                                      value={state.code}
                                      className="text-white hover:bg-slate-800 focus:bg-slate-800 focus:text-white"
                                    >
                                      {state.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage className="form-message mt-2" />
                          </div>
                        </div>
                      )}
                    />
                    <CustomInput control={form.control} name='postalCode' label="Postal Code" placeholder='Example: 11101' />
                  </div>

                  <div className="flex gap-4">
                    {/* Date of Birth — native date picker */}
                    <FormField
                      control={form.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <div className="form-item">
                          <FormLabel className="form-label">Date of Birth</FormLabel>
                          <div className="flex w-full flex-col">
                            <FormControl>
                              <DatePicker value={field.value ?? ''} onChange={field.onChange} />
                            </FormControl>
                            <FormMessage className="form-message mt-2" />
                          </div>
                        </div>
                      )}
                    />
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

          <div className="relative overflow-hidden rounded-xl cursor-pointer" style={{ height: '44px' }}>
            {/* Custom violet visual layer */}
            <div className="absolute inset-0 flex items-center justify-center gap-3 bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-semibold text-sm pointer-events-none z-10 rounded-xl">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#fff"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#fff"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff"/>
              </svg>
              {type === 'sign-in' ? 'Sign in with Google' : 'Sign up with Google'}
            </div>
            {/* Invisible Google button on top to capture clicks */}
            <div ref={googleBtnRef} className="relative z-20 opacity-0 [&_iframe]:!w-full [&_iframe]:!h-[44px]" style={{ height: '44px' }} />
          </div>

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
