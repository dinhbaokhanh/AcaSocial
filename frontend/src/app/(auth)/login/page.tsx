'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ApiRequestError } from '@/lib/api/client';
import { ROUTES } from '@/lib/constants';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]     = useState('');
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ identifier, password });
      router.push(ROUTES.HOME);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError('Đã xảy ra lỗi. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h1 className={styles.title}>Đăng nhập</h1>
        <p className={styles.subtitle}>Đăng nhập để tiếp tục sử dụng AcaSocial.</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <Input
          id="login-identifier"
          label="Tên đăng nhập hoặc email"
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
          autoComplete="username"
          autoFocus
        />
        <Input
          id="login-password"
          label="Mật khẩu"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />

        {error && (
          <p className={styles.errorMsg} role="alert">{error}</p>
        )}

        <div className={styles.forgotRow}>
          <Link href={ROUTES.FORGOT_PASSWORD} className={styles.forgotLink}>
            Quên mật khẩu?
          </Link>
        </div>

        <Button type="submit" fullWidth loading={loading} disabled={!identifier || !password}>
          Đăng nhập
        </Button>
      </form>

      <p className={styles.footer}>
        Chưa có tài khoản?{' '}
        <Link href={ROUTES.REGISTER}>Đăng ký AcaSocial</Link>
      </p>
    </div>
  );
}
