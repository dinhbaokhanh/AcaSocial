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
      setError(err instanceof ApiRequestError ? err.message : 'Không thể gửi yêu cầu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirm) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authApi.resetPassword({ email, otp, newPassword });
      setStep('success');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Không thể đặt lại mật khẩu.');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'success') {
    return (
      <div className={styles.card}>
        <div className={styles.success}>
          <span className={styles.successIcon} aria-hidden="true">✓</span>
          <h1 className={styles.title}>Đã đặt lại mật khẩu</h1>
          <p className={styles.subtitle}>Mật khẩu đã được cập nhật. Hãy đăng nhập bằng mật khẩu mới.</p>
          <Button fullWidth onClick={() => window.location.replace(ROUTES.LOGIN)}>Đến trang đăng nhập</Button>
        </div>
      </div>
    );
  }

  if (step === 'otp') {
    return (
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h1 className={styles.title}>Đặt lại mật khẩu</h1>
          <p className={styles.subtitle}>Nhập mã đã gửi đến <strong>{email}</strong> và mật khẩu mới của bạn.</p>
        </div>
        <form onSubmit={handleReset} className={styles.form} noValidate>
          <Input id="reset-otp" label="Mã xác minh" type="text" inputMode="numeric" maxLength={6}
            value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="000000" required autoFocus />
          <Input id="reset-new" label="Mật khẩu mới" type="password"
            value={newPassword} onChange={(e) => setNew(e.target.value)} placeholder="••••••••" required />
          <Input id="reset-confirm" label="Xác nhận mật khẩu mới" type="password"
            value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" required />
          {error && <p className={styles.errorMsg} role="alert">{error}</p>}
          <Button type="submit" fullWidth loading={loading} disabled={otp.length < 6 || !newPassword || !confirm}>
            Đặt lại mật khẩu
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h1 className={styles.title}>Quên mật khẩu?</h1>
        <p className={styles.subtitle}>Nhập email để nhận mã đặt lại mật khẩu.</p>
      </div>
      <form onSubmit={handleEmailSubmit} className={styles.form} noValidate>
        <Input id="forgot-email" label="Email" type="email"
          value={email} onChange={(e) => setEmail(e.target.value)}
          required autoFocus />
        {error && <p className={styles.errorMsg} role="alert">{error}</p>}
        <Button type="submit" fullWidth loading={loading} disabled={!email}>Gửi mã đặt lại mật khẩu</Button>
      </form>
      <p className={styles.footer}><Link href={ROUTES.LOGIN}>← Quay lại đăng nhập</Link></p>
    </div>
  );
}
