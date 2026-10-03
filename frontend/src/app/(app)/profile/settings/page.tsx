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
    return <LoadingState label="Loading settings..." />
  }

  if (!isAuthenticated || !user) {
    return (
      <div className={styles.container}>
        <p>Please sign in to access settings.</p>
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
      toast.success('Profile updated', 'Your account details have been saved.')
    } catch (err) {
      setProfileError(
        err instanceof ApiRequestError
          ? err.message
          : 'Failed to update profile.'
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
      toast.success('Avatar updated', 'Your profile photo has been changed.')
    } catch (err) {
      setAvatarError(
        err instanceof Error ? err.message : 'Failed to upload avatar.'
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
      setPasswordError('New password and confirmation do not match.')
      return
    }
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long.')
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
      toast.success('Password changed', 'Your new password is now active.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordError(
        err instanceof ApiRequestError
          ? err.message
          : 'Failed to change password.'
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
      toast.success('Privacy updated', 'Your visibility settings have been saved.')
    } catch (err) {
      setPrivacyError(
        err instanceof ApiRequestError
          ? err.message
          : 'Failed to update privacy.'
      )
    } finally {
      setPrivacySaving(false)
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Account Settings</h1>
        <p className={styles.subtitle}>
          Manage your personal details, academic avatar, security credentials,
          and visibility.
        </p>
      </header>

      {/* 1. Avatar Section */}
      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Profile Photo</h2>
          <p className={styles.sectionDesc}>
            Upload a clear photo to help classmates and professors recognize
            you.
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
              Change Photo
            </Button>
            <span
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-muted)',
              }}
            >
              JPG, PNG or WebP up to 5MB.
            </span>
          </div>
        </div>
      </section>

      {/* 2. Personal Information */}
      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Personal Details</h2>
          <p className={styles.sectionDesc}>
            Update your display name and birthday.
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
            label="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <Input
            id="username"
            label="Username"
            value={user.username ?? ''}
            disabled
            hint="Usernames are permanent and unique to each academic account."
          />

          <Input
            id="email"
            label="Institutional Email"
            type="email"
            value={user.email}
            disabled
            hint="Email tied to your PTIT account."
          />

          <Input
            id="dob"
            label="Date of Birth"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />

          <div className={styles.formActions}>
            <Button type="submit" variant="primary" loading={profileSaving}>
              Save Profile Changes
            </Button>
          </div>
        </form>
      </section>

      {/* 3. Security / Change Password */}
      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Change Password</h2>
          <p className={styles.sectionDesc}>
            Ensure your account is protected with a strong password.
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
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />

          <Input
            id="new-password"
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            hint="At least 8 characters long."
            required
          />

          <Input
            id="confirm-new-password"
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <div className={styles.formActions}>
            <Button type="submit" variant="outline" loading={passwordSaving}>
              Update Password
            </Button>
          </div>
        </form>
      </section>

      {/* 4. Privacy Settings */}
      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Privacy & Visibility</h2>
          <p className={styles.sectionDesc}>
            Control who can view your academic profile and activity.
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
            label="Profile Visibility"
            value={privacy}
            onChange={(e) => setPrivacy(e.target.value as Privacy)}
            options={[
              { value: 'public', label: 'Public — Visible to everyone' },
              { value: 'private', label: 'Private — Visible only to you' },
            ]}
          />

          <div className={styles.formActions}>
            <Button type="submit" variant="secondary" loading={privacySaving}>
              Update Visibility
            </Button>
          </div>
        </form>
      </section>
    </div>
  )
}
