'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authApi } from '@/lib/api/auth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ApiRequestError } from '@/lib/api/client';
import { ROUTES } from '@/lib/constants';
import styles from './forgot-password.module.css';

type Step = 'email' | 'otp' | 'success';

export default function ForgotPasswordPage() {
  const [step, setStep]           = useState<Step>('email');
  const [email, setEmail]         = useState('');
  const [otp, setOtp]             = useState('');
  const [newPassword, setNew]     = useState('');
  const [confirm, setConfirm]     = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword({ email });
      setStep('otp');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Request failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authApi.resetPassword({ email, otp, newPassword });
      setStep('success');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Reset failed.');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'success') {
    return (
      <div className={styles.card}>
        <div className={styles.success}>
          <span className={styles.successIcon} aria-hidden="true">✓</span>
          <h1 className={styles.title}>Password reset!</h1>
          <p className={styles.subtitle}>Your password has been updated. Sign in with your new credentials.</p>
          <Button fullWidth onClick={() => window.location.replace(ROUTES.LOGIN)}>Go to Sign in</Button>
        </div>
      </div>
    );
  }

  if (step === 'otp') {
    return (
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h1 className={styles.title}>Reset your password</h1>
          <p className={styles.subtitle}>Enter the code sent to <strong>{email}</strong> and your new password.</p>
        </div>
        <form onSubmit={handleReset} className={styles.form} noValidate>
          <Input id="reset-otp" label="Verification code" type="text" inputMode="numeric" maxLength={6}
            value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="000000" required autoFocus />
          <Input id="reset-new" label="New password" type="password"
            value={newPassword} onChange={(e) => setNew(e.target.value)} placeholder="••••••••" required />
          <Input id="reset-confirm" label="Confirm new password" type="password"
            value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" required />
          {error && <p className={styles.errorMsg} role="alert">{error}</p>}
          <Button type="submit" fullWidth loading={loading} disabled={otp.length < 6 || !newPassword || !confirm}>
            Reset password
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h1 className={styles.title}>Forgot password?</h1>
        <p className={styles.subtitle}>Enter your email and we&apos;ll send you a reset code.</p>
      </div>
      <form onSubmit={handleEmailSubmit} className={styles.form} noValidate>
        <Input id="forgot-email" label="Email" type="email"
          value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="john@example.com" required autoFocus />
        {error && <p className={styles.errorMsg} role="alert">{error}</p>}
        <Button type="submit" fullWidth loading={loading} disabled={!email}>Send reset code</Button>
      </form>
      <p className={styles.footer}><Link href={ROUTES.LOGIN}>← Back to sign in</Link></p>
    </div>
  );
}
