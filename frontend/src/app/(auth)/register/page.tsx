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
      setError(err instanceof ApiRequestError ? err.message : 'Không thể đăng ký tài khoản.');
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
      setError(err instanceof ApiRequestError ? err.message : 'Mã xác minh không hợp lệ hoặc đã hết hạn.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    setError('');
    try {
      await authApi.resendOtp(email);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Không thể gửi lại mã xác minh.');
    }
  }

  if (step === 'success') {
    return (
      <div className={styles.card}>
        <div className={styles.success}>
          <span className={styles.successIcon} aria-hidden="true">✓</span>
          <h1 className={styles.title}>Tài khoản đã được kích hoạt</h1>
          <p className={styles.subtitle}>Bạn có thể đăng nhập bằng tài khoản vừa tạo.</p>
          <Button fullWidth onClick={() => window.location.replace(ROUTES.LOGIN)}>
            Đến trang đăng nhập
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'otp') {
    return (
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h1 className={styles.title}>Xác minh email</h1>
          <p className={styles.subtitle}>
            Mã xác minh gồm 6 chữ số đã được gửi đến <strong>{email}</strong>. Nhập mã và chọn tên đăng nhập để kích hoạt tài khoản.
          </p>
        </div>
        <form onSubmit={handleVerifyOtp} className={styles.form} noValidate>
          <Input
            id="otp-code"
            label="Mã xác minh"
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
            label="Chọn tên đăng nhập"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            hint="Từ 5–20 ký tự, gồm chữ thường, chữ số và dấu gạch dưới (_)."
            required
            autoComplete="username"
          />
          {error && <p className={styles.errorMsg} role="alert">{error}</p>}
          <Button type="submit" fullWidth loading={loading} disabled={otp.length < 6 || username.length < 5}>
            Xác minh tài khoản
          </Button>
        </form>
        <p className={styles.footer}>
          Chưa nhận được mã?{' '}
          <button className={styles.linkBtn} onClick={handleResendOtp} type="button">
            Gửi lại mã
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h1 className={styles.title}>Đăng ký AcaSocial</h1>
        <p className={styles.subtitle}>Tạo tài khoản để tham gia các phòng học tập.</p>
      </div>
      <form onSubmit={handleRegister} className={styles.form} noValidate>
        <Input
          id="reg-fullname"
          label="Họ và tên"
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
          required
          autoComplete="email"
        />
        <Input
          id="reg-password"
          label="Mật khẩu"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          hint="Ít nhất 8 ký tự, gồm chữ hoa, chữ thường và chữ số."
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
          Tạo tài khoản
        </Button>
      </form>
      <p className={styles.footer}>
        Đã có tài khoản?{' '}
        <Link href={ROUTES.LOGIN}>Đăng nhập</Link>
      </p>
    </div>
  );
}
