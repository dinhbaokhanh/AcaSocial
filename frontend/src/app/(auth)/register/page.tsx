'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authApi } from '@/lib/api/auth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ApiRequestError } from '@/lib/api/client';
import { ROUTES } from '@/lib/constants';
import styles from './register.module.css';

type Step = 'form' | 'otp' | 'success';

export default function RegisterPage() {
  const [step, setStep]           = useState<Step>('form');
  const [email, setEmail]         = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);

  // Form fields
  const [username, setUsername]   = useState('');
  const [fullName, setFullName]   = useState('');
  const [password, setPassword]   = useState('');

  // OTP field
  const [otp, setOtp]             = useState('');

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.register({ fullName, email, password });
      setStep('otp');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.verifyOtp({ email, otp, username });
      setStep('success');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    setError('');
    try {
      await authApi.resendOtp(email);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to resend OTP.');
    }
  }

  if (step === 'success') {
    return (
      <div className={styles.card}>
        <div className={styles.success}>
          <span className={styles.successIcon} aria-hidden="true">✓</span>
          <h1 className={styles.title}>Account activated!</h1>
          <p className={styles.subtitle}>Your account is ready. Sign in to get started.</p>
          <Button fullWidth onClick={() => window.location.replace(ROUTES.LOGIN)}>
            Go to Sign in
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'otp') {
    return (
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h1 className={styles.title}>Check your email</h1>
          <p className={styles.subtitle}>
            We sent a 6-digit code to <strong>{email}</strong>. Verify your email, then choose your username to activate the account.
          </p>
        </div>
        <form onSubmit={handleVerifyOtp} className={styles.form} noValidate>
          <Input
            id="otp-code"
            label="Verification code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            required
            autoFocus
          />
          <Input
            id="verified-username"
            label="Choose a username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            placeholder="john_doe"
            hint="5–20 characters, lowercase letters, numbers and _"
            required
            autoComplete="username"
          />
          {error && <p className={styles.errorMsg} role="alert">{error}</p>}
          <Button type="submit" fullWidth loading={loading} disabled={otp.length < 6 || username.length < 5}>
            Verify account
          </Button>
        </form>
        <p className={styles.footer}>
          Didn&apos;t receive it?{' '}
          <button className={styles.linkBtn} onClick={handleResendOtp} type="button">
            Resend code
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h1 className={styles.title}>Join AcaSocial</h1>
        <p className={styles.subtitle}>Create your academic account.</p>
      </div>
      <form onSubmit={handleRegister} className={styles.form} noValidate>
        <Input
          id="reg-fullname"
          label="Full name"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Nguyễn Văn A"
          required
          autoFocus
        />
        <Input
          id="reg-email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="john@example.com"
          required
          autoComplete="email"
        />
        <Input
          id="reg-password"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          hint="Min 8 characters with uppercase, lowercase, and a number"
          required
          autoComplete="new-password"
        />
        {error && <p className={styles.errorMsg} role="alert">{error}</p>}
        <Button
          type="submit"
          fullWidth
          loading={loading}
          disabled={!fullName || !email || !password}
        >
          Create account
        </Button>
      </form>
      <p className={styles.footer}>
        Already have an account?{' '}
        <Link href={ROUTES.LOGIN}>Sign in</Link>
      </p>
    </div>
  );
}
