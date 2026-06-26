import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Bell,
  BellOff,
  CheckCircle,
  Key,
  Loader2,
  Save,
  Shield,
  User as UserIcon,
} from 'lucide-react';
import React, { useState } from 'react';

import { changePassword, getProfile, updateProfile } from '@/api/profile.api';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { PasswordStrengthMeter } from '@/components/ui/PasswordStrengthMeter';
import { Badge } from '@/components/ui/badge';
import { usePasswordStrength } from '@/hooks/usePasswordStrength';
import { useWebPush } from '@/hooks/useWebPush';
import { extractApiError } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

export const AdminProfileView: React.FC = () => {
  const queryClient = useQueryClient();
  const { updateUser, user: storeUser } = useAuthStore();
  const { isSupported, permission, isSubscribed, isPending, subscribe, unsubscribe } = useWebPush();

  // Fetch fresh profile from server
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    initialData: storeUser ?? undefined,
  });

  // Profile forms
  const [name, setName] = useState(profile?.name ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');

  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  const profileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      queryClient.setQueryData(['profile'], updatedUser);
      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
      setTimeout(() => setProfileMsg(null), 3000);
    },
    onError: (err: unknown) => {
      setProfileMsg({ type: 'error', text: extractApiError(err, 'Failed to update profile.') });
    },
  });

  function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    profileMutation.mutate({ name, email });
  }

  // Password change section
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [conPw, setConPw] = useState('');
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const strength = usePasswordStrength(newPw);
  const pwMatches = newPw.length > 0 && newPw === conPw;
  const pwMismatch = conPw.length > 0 && newPw !== conPw;

  const pwMutation = useMutation({
    mutationFn: () =>
      changePassword({ currentPassword: curPw, newPassword: newPw, confirmNewPassword: conPw }),
    onSuccess: () => {
      setPwMsg({ type: 'success', text: 'Password changed successfully.' });
      setCurPw('');
      setNewPw('');
      setConPw('');
      setTimeout(() => setPwMsg(null), 4000);
    },
    onError: (err: unknown) => {
      setPwMsg({ type: 'error', text: extractApiError(err, 'Failed to change password.') });
    },
  });

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!strength.isValid || !pwMatches || !curPw) return;
    setPwMsg(null);
    pwMutation.mutate();
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 w-full">
        <div className="w-6 h-6 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  const initials = (profile?.name ?? 'A')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full text-slate-100 bg-transparent">
      {/* Page Header */}
      <div className="border-b border-slate-900 pb-5">
        <h1 className="text-3xl font-extrabold tracking-tight">Admin Profile</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Overview your account details, edit contact credentials, and update password secrets.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Card: Avatar & Overview */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-24 h-24 rounded-2xl bg-indigo-750 border-4 border-slate-800 flex items-center justify-center text-3xl font-bold text-white shadow-xl shadow-indigo-650/10">
            {initials}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">{profile?.name || 'Portal Admin'}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{profile?.email}</p>
          </div>
          <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/30 font-medium py-1 px-3 rounded-full flex items-center gap-1">
            <Shield size={12} /> System Administrator
          </Badge>
          <div className="w-full border-t border-slate-850 pt-4 text-left space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Account status:</span>
              <span className="text-emerald-450 font-bold">Active</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Platform role:</span>
              <span className="text-indigo-455 font-bold uppercase">{profile?.role}</span>
            </div>
          </div>
        </div>

        {/* Right Section: Form Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Update Profile Form */}
          <section className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-slate-350 uppercase tracking-wider mb-6 flex items-center gap-2">
              <UserIcon size={16} /> Personal Information
            </h3>

            {profileMsg && (
              <div
                className={cn(
                  'flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm mb-4',
                  profileMsg.type === 'success'
                    ? 'bg-emerald-950/40 border border-emerald-900/35 text-emerald-400'
                    : 'bg-rose-950/40 border border-rose-900/35 text-rose-455',
                )}
              >
                <CheckCircle size={14} />
                {profileMsg.text}
              </div>
            )}

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 flex flex-col">
                  <label htmlFor="name" className="text-xs font-semibold text-slate-400">
                    Full name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-xl text-sm bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-650 outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div className="space-y-1.5 flex flex-col">
                  <label htmlFor="email" className="text-xs font-semibold text-slate-400">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-xl text-sm bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-650 outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={profileMutation.isPending}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all active:scale-[.98]"
              >
                {profileMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    Save Profile
                  </>
                )}
              </button>
            </form>
          </section>

          {/* Web Push Notifications Card */}
          <section className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 space-y-6">
            <h3 className="text-sm font-semibold text-slate-350 uppercase tracking-wider flex items-center gap-2">
              <Bell size={16} /> Web Push Notification
            </h3>

            <div className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Enable background push notifications to receive real-time updates when users are
                created or tasks are created.
              </p>

              {!isSupported ? (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs bg-amber-950/40 border border-amber-900/50 text-amber-500">
                  <AlertCircle size={16} />
                  Push notifications are not supported by this browser.
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950 border border-slate-850">
                  <div>
                    <div className="text-xs font-semibold text-slate-200">
                      Device Opt-in:{' '}
                      {permission === 'denied' ? (
                        <span className="text-rose-500 font-bold">Blocked</span>
                      ) : isSubscribed ? (
                        <span className="text-emerald-450 font-bold">Subscribed</span>
                      ) : (
                        <span className="text-slate-500 font-bold">Not Subscribed</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1.5">
                      {permission === 'denied'
                        ? 'Please reset notification permissions in your browser settings to enable.'
                        : isSubscribed
                          ? 'Your device is configured to receive push notifications.'
                          : 'Opt-in to start receiving background notifications on this device.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isPending || permission === 'denied'}
                    onClick={isSubscribed ? unsubscribe : subscribe}
                    className={cn(
                      'flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-[.98]',
                      isSubscribed
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white',
                      (isPending || permission === 'denied') && 'opacity-50 cursor-not-allowed',
                    )}
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        Processing…
                      </>
                    ) : isSubscribed ? (
                      <>
                        <BellOff size={14} />
                        Disable Notifications
                      </>
                    ) : (
                      <>
                        <Bell size={14} />
                        Enable Notifications
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Change Password Card */}
          <section className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-slate-350 uppercase tracking-wider mb-6 flex items-center gap-2">
              <Key size={16} /> Update Password
            </h3>

            {pwMsg && (
              <div
                className={cn(
                  'flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm mb-4',
                  pwMsg.type === 'success'
                    ? 'bg-emerald-950/40 border border-emerald-900/35 text-emerald-400'
                    : 'bg-rose-950/40 border border-rose-900/35 text-rose-455',
                )}
              >
                <CheckCircle size={14} />
                {pwMsg.text}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-1.5 flex flex-col">
                <label htmlFor="curPw" className="text-xs font-semibold text-slate-400">
                  Current password
                </label>
                <PasswordInput
                  id="curPw"
                  value={curPw}
                  onChange={(e) => setCurPw(e.target.value)}
                  placeholder="Current password"
                  autoComplete="current-password"
                  required
                />
              </div>

              <div className="space-y-1.5 flex flex-col">
                <label htmlFor="newPw" className="text-xs font-semibold text-slate-400">
                  New password
                </label>
                <PasswordInput
                  id="newPw"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                  required
                />
                <PasswordStrengthMeter password={newPw} />
              </div>

              <div className="space-y-1.5 flex flex-col">
                <label htmlFor="conPw" className="text-xs font-semibold text-slate-400">
                  Confirm new password
                </label>
                <PasswordInput
                  id="conPw"
                  value={conPw}
                  onChange={(e) => setConPw(e.target.value)}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                  required
                  error={pwMismatch ? "Passwords don't match" : undefined}
                />
                {pwMatches && (
                  <p className="text-[10px] text-emerald-450 flex items-center gap-1 mt-1 font-semibold">
                    <CheckCircle size={11} /> Passwords match
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={!strength.isValid || !pwMatches || !curPw || pwMutation.isPending}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition-all active:scale-[.98]"
              >
                {pwMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    Changing…
                  </>
                ) : (
                  <>
                    <Key size={14} />
                    Update Password
                  </>
                )}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
};
