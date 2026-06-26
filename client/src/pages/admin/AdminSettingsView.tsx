import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Bell,
  BellOff,
  CheckCircle,
  Key,
  Loader2,
  Mail,
  Save,
  User as UserIcon,
} from 'lucide-react';
import React, { useState } from 'react';

import { changePassword, getProfile, updateProfile } from '@/api/profile.api';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { PasswordStrengthMeter } from '@/components/ui/PasswordStrengthMeter';
import { usePasswordStrength } from '@/hooks/usePasswordStrength';
import { useWebPush } from '@/hooks/useWebPush';
import { extractApiError } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

export const AdminSettingsView: React.FC = () => {
  const queryClient = useQueryClient();
  const { updateUser, user: storeUser } = useAuthStore();
  const { isSupported, permission, isSubscribed, isPending, subscribe, unsubscribe } = useWebPush();

  // Active Tab: general | security | email | notifications
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'email' | 'notifications'>('general');

  // Fetch fresh profile from server
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    initialData: storeUser ?? undefined,
  });

  // Profile form state
  const [name, setName] = useState(profile?.name ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
        <Loader2 className="w-8 h-8 rounded-full animate-spin text-indigo-500" />
      </div>
    );
  }

  const initials = (profile?.name ?? 'A')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const tabs = [
    { id: 'general', label: 'General', icon: UserIcon },
    { id: 'security', label: 'Security', icon: Key },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ] as const;

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full text-slate-105 bg-transparent">
      {/* Page Header */}
      <div className="border-b border-slate-900 pb-5">
        <h1 className="text-3xl font-extrabold tracking-tight">Portal Settings</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Configure security protocols, general administrative details, email rules, and subscriptions.
        </p>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-slate-900 gap-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 font-semibold text-sm transition-all relative flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'text-indigo-400 border-b-2 border-indigo-500'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <section className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 md:p-8 space-y-6">
          <h2 className="text-sm font-semibold text-slate-350 uppercase tracking-wider flex items-center gap-2">
            <UserIcon size={16} /> Personal Information
          </h2>

          {/* Avatar preview */}
          <div className="flex items-center gap-4 border-b border-slate-850 pb-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-700 border-2 border-slate-800 flex items-center justify-center text-lg font-bold text-white shadow-lg shadow-indigo-650/10">
              {initials}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-100">{profile?.name || 'Administrator'}</p>
              <p className="text-xs text-slate-500 mt-0.5">{profile?.email}</p>
              <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-indigo-950/40 border border-indigo-900/30 text-indigo-400 text-[10px] font-semibold uppercase">
                {profile?.role}
              </span>
            </div>
          </div>

          {profileMsg && (
            <div
              className={cn(
                'flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm mb-4',
                profileMsg.type === 'success'
                  ? 'bg-emerald-950/40 border border-emerald-900/35 text-emerald-400'
                  : 'bg-rose-950/40 border border-rose-900/35 text-rose-400',
              )}
            >
              <CheckCircle size={14} />
              {profileMsg.text}
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="space-y-1.5 flex flex-col">
              <label htmlFor="name" className="text-xs font-semibold text-slate-400">
                Full name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Administrator Name"
                minLength={2}
                maxLength={80}
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
                placeholder="you@company.com"
                required
                className="w-full px-3 py-2.5 rounded-xl text-sm bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-650 outline-none focus:border-indigo-500 transition-colors"
              />
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
                  Save changes
                </>
              )}
            </button>
          </form>
        </section>
      )}

      {/* Security Settings */}
      {activeTab === 'security' && (
        <section className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 md:p-8 space-y-6">
          <h2 className="text-sm font-semibold text-slate-350 uppercase tracking-wider flex items-center gap-2">
            <Key size={16} /> Change Password
          </h2>

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

            <div className="border-t border-slate-800/60 my-4" />

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
                  Change password
                </>
              )}
            </button>
          </form>
        </section>
      )}

      {/* Email Configurations (Simulation for Admin portal) */}
      {activeTab === 'email' && (
        <section className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 md:p-8 space-y-6">
          <h2 className="text-sm font-semibold text-slate-350 uppercase tracking-wider flex items-center gap-2">
            <Mail size={16} /> SMTP Notification Server
          </h2>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 font-bold block">SMTP Host</span>
                <span className="text-slate-200 mt-1 block">smtp.nextask.com</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold block">Port</span>
                <span className="text-slate-200 mt-1 block">587 (TLS Enabled)</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold block">Notification Sender</span>
                <span className="text-slate-200 mt-1 block">noreply@nextask.com</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold block">Server Status</span>
                <span className="text-emerald-450 mt-1 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  Online & Dispatching
                </span>
              </div>
            </div>
            <div className="border-t border-slate-900 pt-3 text-[10px] text-slate-400">
              Note: This server handles all onboarding email notifications, task assignment alerts, and mandatory password reset emails.
            </div>
          </div>
        </section>
      )}

      {/* Push Notifications Opt-In */}
      {activeTab === 'notifications' && (
        <section className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 md:p-8 space-y-6">
          <h2 className="text-sm font-semibold text-slate-350 uppercase tracking-wider flex items-center gap-2">
            <Bell size={16} /> Web Push Notification
          </h2>

          <div className="space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed">
              Enable background push notifications to receive real-time updates when users are created or tasks are created.
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
      )}
    </div>
  );
};
