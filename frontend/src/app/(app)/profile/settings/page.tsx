'use client'

import { startTransition, useState, useRef, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import { usersApi } from '@/lib/api/users'
import { mediaApi } from '@/lib/api/media'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Avatar } from '@/components/ui/Avatar'
import { LoadingState } from '@/components/shared/LoadingState'
import { ApiRequestError } from '@/lib/api/client'
import type { Privacy } from '@/types'
import styles from './settings.module.css'
import { useToast } from '@/lib/toast/context'

export default function ProfileSettingsPage() {
  const {
    user,
    isAuthenticated,
    isLoading: authLoading,
    refreshUser,
  } = useAuth()
  const toast = useToast()

  // Profile form state
  const [fullName, setFullName] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState('')

  // Avatar state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarSaving, setAvatarSaving] = useState(false)
  const [avatarError, setAvatarError] = useState('')

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  // Privacy state
  const [privacy, setPrivacy] = useState<Privacy>('public')
  const [privacySaving, setPrivacySaving] = useState(false)
  const [privacyError, setPrivacyError] = useState('')

  useEffect(() => {
    if (!user) return

    startTransition(() => {
      setFullName(user.fullName || '')
      setDateOfBirth(user.dateOfBirth ? user.dateOfBirth.substring(0, 10) : '')
      setPrivacy(user.privacy || 'public')
    })
  }, [user])

  if (authLoading) {
    return <LoadingState label="Đang tải cài đặt…" />
  }

  if (!isAuthenticated || !user) {
    return (
      <div className={styles.container}>
        <p>Vui lòng đăng nhập để truy cập cài đặt.</p>
      </div>
    )
  }

  // 1. Handle profile info submit
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileSaving(true)
    setProfileError('')
    try {
      await usersApi.updateProfile({
        fullName: fullName.trim(),
        dateOfBirth: dateOfBirth
          ? new Date(dateOfBirth).toISOString()
          : undefined,
      })
      await refreshUser()
      toast.success('Đã cập nhật hồ sơ', 'Thông tin tài khoản đã được lưu.')
    } catch (err) {
      setProfileError(
        err instanceof ApiRequestError
          ? err.message
          : 'Không thể cập nhật hồ sơ.'
      )
    } finally {
      setProfileSaving(false)
    }
  }

  // 2. Handle avatar file select
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setAvatarSaving(true)
    setAvatarError('')

    try {
      const media = await mediaApi.upload(file)
      await usersApi.updateAvatar({ avatarUrl: media.secureUrl })
      await refreshUser()
      toast.success('Đã cập nhật ảnh đại diện', 'Ảnh đại diện đã được thay đổi.')
    } catch (err) {
      setAvatarError(
        err instanceof Error ? err.message : 'Không thể tải ảnh đại diện lên.'
      )
    } finally {
      setAvatarSaving(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // 3. Handle password change
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu mới và mật khẩu xác nhận không khớp.')
      return
    }
    if (newPassword.length < 8) {
      setPasswordError('Mật khẩu phải có ít nhất 8 ký tự.')
      return
    }

    setPasswordSaving(true)
    setPasswordError('')

    try {
      await usersApi.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      })
      toast.success('Đã đổi mật khẩu', 'Bạn có thể sử dụng mật khẩu mới để đăng nhập.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordError(
        err instanceof ApiRequestError
          ? err.message
          : 'Không thể đổi mật khẩu.'
      )
    } finally {
      setPasswordSaving(false)
    }
  }

  // 4. Handle privacy submit
  const handlePrivacySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPrivacySaving(true)
    setPrivacyError('')

    try {
      await usersApi.updatePrivacy({ privacy })
      await refreshUser()
      toast.success('Đã cập nhật quyền riêng tư', 'Cài đặt hiển thị hồ sơ đã được lưu.')
    } catch (err) {
      setPrivacyError(
        err instanceof ApiRequestError
          ? err.message
          : 'Không thể cập nhật quyền riêng tư.'
      )
    } finally {
      setPrivacySaving(false)
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Cài đặt tài khoản</h1>
        <p className={styles.subtitle}>
          Cập nhật thông tin cá nhân, ảnh đại diện, mật khẩu và quyền riêng tư.
        </p>
      </header>

      {/* 1. Avatar Section */}
      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Ảnh đại diện</h2>
          <p className={styles.sectionDesc}>
            Chọn ảnh đại diện để mọi người dễ nhận ra bạn.
          </p>
        </div>

        {avatarError && <div className={styles.errorAlert}>{avatarError}</div>}

        <div className={styles.avatarRow}>
          <Avatar src={user.avatarUrl} alt={user.fullName} size="xl" />
          <div className={styles.avatarActions}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/jpeg,image/png,image/webp"
              className={styles.fileInput}
              id="avatar-upload"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={avatarSaving}
              onClick={() => fileInputRef.current?.click()}
            >
              Đổi ảnh
            </Button>
            <span
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-muted)',
              }}
            >
              Ảnh JPG, PNG hoặc WebP, tối đa 5 MB.
            </span>
          </div>
        </div>
      </section>

      {/* 2. Personal Information */}
      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Thông tin cá nhân</h2>
          <p className={styles.sectionDesc}>
            Cập nhật họ tên và ngày sinh.
          </p>
        </div>

        {profileError && (
          <div className={styles.errorAlert}>{profileError}</div>
        )}

        <form
          onSubmit={handleProfileSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          <Input
            id="full-name"
            label="Họ và tên"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <Input
            id="username"
            label="Tên đăng nhập"
            value={user.username ?? ''}
            disabled
            hint="Tên đăng nhập là duy nhất và không thể thay đổi."
          />

          <Input
            id="email"
            label="Email tài khoản"
            type="email"
            value={user.email}
            disabled
            hint="Email dùng để đăng ký tài khoản."
          />

          <Input
            id="dob"
            label="Ngày sinh"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />

          <div className={styles.formActions}>
            <Button type="submit" variant="primary" loading={profileSaving}>
              Lưu thông tin
            </Button>
          </div>
        </form>
      </section>

      {/* 3. Security / Change Password */}
      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Đổi mật khẩu</h2>
          <p className={styles.sectionDesc}>
            Sử dụng mật khẩu đủ mạnh để bảo vệ tài khoản.
          </p>
        </div>

        {passwordError && (
          <div className={styles.errorAlert}>{passwordError}</div>
        )}

        <form
          onSubmit={handlePasswordSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          <Input
            id="current-password"
            label="Mật khẩu hiện tại"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />

          <Input
            id="new-password"
            label="Mật khẩu mới"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            hint="Ít nhất 8 ký tự."
            required
          />

          <Input
            id="confirm-new-password"
            label="Xác nhận mật khẩu mới"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <div className={styles.formActions}>
            <Button type="submit" variant="outline" loading={passwordSaving}>
              Đổi mật khẩu
            </Button>
          </div>
        </form>
      </section>

      {/* 4. Privacy Settings */}
      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Quyền riêng tư</h2>
          <p className={styles.sectionDesc}>
            Chọn phạm vi hiển thị hồ sơ của bạn.
          </p>
        </div>

        {privacyError && (
          <div className={styles.errorAlert}>{privacyError}</div>
        )}

        <form
          onSubmit={handlePrivacySubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          <Select
            id="privacy-select"
            label="Hiển thị hồ sơ"
            value={privacy}
            onChange={(e) => setPrivacy(e.target.value as Privacy)}
            options={[
              { value: 'public', label: 'Công khai — mọi người có thể xem' },
              { value: 'private', label: 'Riêng tư — chỉ bạn có thể xem' },
            ]}
          />

          <div className={styles.formActions}>
            <Button type="submit" variant="secondary" loading={privacySaving}>
              Lưu quyền riêng tư
            </Button>
          </div>
        </form>
      </section>
    </div>
  )
}
