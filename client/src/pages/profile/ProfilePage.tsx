import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Bell, BellOff, CheckCircle, Key, Save, User as UserIcon } from 'lucide-react';
import { FormEvent, useState } from 'react';

import { changePassword, getProfile, updateProfile } from '@/api/profile.api';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { PasswordStrengthMeter } from '@/components/ui/PasswordStrengthMeter';
import { usePasswordStrength } from '@/hooks/usePasswordStrength';
import { useWebPush } from '@/hooks/useWebPush';
import { extractApiError } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { updateUser, user: storeUser } = useAuthStore();
  const { isSupported, permission, isSubscribed, isPending, subscribe, unsubscribe } = useWebPush();

  // Fetch fresh profile from server
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    initialData: storeUser ?? undefined,
  });

  // ── Profile form state ─────────────────────────────────────────────────────
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

  function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    profileMutation.mutate({ name, email });
  }

  // ── Password change section (optional, for already-authenticated users) ────
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

  function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    if (!strength.isValid || !pwMatches || !curPw) return;
    setPwMsg(null);
    pwMutation.mutate();
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center w-full">
        <div className="w-6 h-6 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  const initials = (profile?.name ?? 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 lg:p-10 w-full">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Profile Settings</h1>
          <p className="text-sm text-zinc-400">Manage your account details and security</p>
        </div>

        {/* ── Section 1: Profile Info ────────────────────────────────────── */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 lg:p-8">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-6 flex items-center gap-2">
            <UserIcon size={14} /> Personal Information
          </h2>

          {/* Avatar preview */}
          <div className="flex items-center gap-4 mb-7">
            <div className="w-16 h-16 rounded-full bg-indigo-700 border-2 border-zinc-700 flex items-center justify-center text-lg font-bold text-white">
              {initials}
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-200">{profile?.name ?? 'No Name Set'}</p>
              <p className="text-xs text-zinc-500">{profile?.email}</p>
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-indigo-900/50 border border-indigo-800 text-indigo-300 text-xs capitalize">
                {profile?.role.toLowerCase()}
              </span>
            </div>
          </div>

          {/* Status banner */}
          {profileMsg && (
            <div
              className={cn(
                'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm mb-5',
                profileMsg.type === 'success'
                  ? 'bg-green-950 border border-green-900 text-green-300'
                  : 'bg-red-950 border border-red-900 text-red-300',
              )}
            >
              {profileMsg.type === 'success' ? (
                <CheckCircle size={14} />
              ) : (
                <AlertCircle size={14} />
              )}
              {profileMsg.text}
            </div>
          )}

          <form key={profile?.id || 'loading'} onSubmit={handleProfileSubmit} className="space-y-5">
            {/* Name */}
            <Field label="Full name" htmlFor="name">
              <TextInput
                id="name"
                value={name}
                onChange={setName}
                placeholder="Your full name"
                minLength={2}
                maxLength={80}
                required
              />
            </Field>

            {/* Email */}
            <Field label="Email Address" htmlFor="email">
              <TextInput
                id="email"
                value={email}
                onChange={setEmail}
                placeholder="you@company.com"
                type="email"
                required
              />
            </Field>

            <button
              type="submit"
              disabled={profileMutation.isPending}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold',
                'bg-indigo-600 hover:bg-indigo-500 text-white transition-all active:scale-[.98]',
                profileMutation.isPending && 'opacity-60 cursor-not-allowed',
              )}
            >
              {profileMutation.isPending ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
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

        {/* ── Section 2: Change Password ─────────────────────────────────── */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 lg:p-8">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-6 flex items-center gap-2">
            <Key size={14} /> Change Password
          </h2>

          {pwMsg && (
            <div
              className={cn(
                'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm mb-5',
                pwMsg.type === 'success'
                  ? 'bg-green-950 border border-green-900 text-green-300'
                  : 'bg-red-950 border border-red-900 text-red-300',
              )}
            >
              {pwMsg.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              {pwMsg.text}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-5">
            <Field label="Current password" htmlFor="curPw">
              <PasswordInput
                id="curPw"
                value={curPw}
                onChange={(e) => setCurPw(e.target.value)}
                placeholder="Your current password"
                autoComplete="current-password"
                required
              />
            </Field>

            <div className="border-t border-zinc-800" />

            <Field label="New password" htmlFor="newPw">
              <PasswordInput
                id="newPw"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="Create a new strong password"
                autoComplete="new-password"
                required
              />
              {/* ── Live complexity check ── */}
              <PasswordStrengthMeter password={newPw} />
            </Field>

            <Field label="Confirm new password" htmlFor="conPw">
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
                <p className="text-xs text-green-400 flex items-center gap-1 mt-1">
                  <CheckCircle size={11} /> Passwords match
                </p>
              )}
            </Field>

            <button
              type="submit"
              disabled={!strength.isValid || !pwMatches || !curPw || pwMutation.isPending}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold',
                'bg-indigo-600 hover:bg-indigo-500 text-white transition-all active:scale-[.98]',
                (!strength.isValid || !pwMatches || !curPw || pwMutation.isPending) &&
                  'opacity-40 cursor-not-allowed',
              )}
            >
              {pwMutation.isPending ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
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

        {/* ── Section 3: Push Notifications ───────────────────────────────── */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 lg:p-8">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-6 flex items-center gap-2">
            <Bell size={14} /> Push Notifications
          </h2>

          <div className="space-y-4">
            <p className="text-sm text-zinc-400 leading-relaxed">
              Enable push notifications to receive real-time updates when tasks are assigned to you.
            </p>

            {!isSupported ? (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm bg-yellow-950/40 border border-yellow-900/50 text-yellow-500">
                <AlertCircle size={16} />
                Push notifications are not supported by this browser.
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                <div>
                  <div className="text-sm font-medium text-zinc-200">
                    Status:{' '}
                    {permission === 'denied' ? (
                      <span className="text-red-400 font-semibold">Blocked</span>
                    ) : isSubscribed ? (
                      <span className="text-green-400 font-semibold">Subscribed</span>
                    ) : (
                      <span className="text-zinc-500">Not Subscribed</span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
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
                    'flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-[.98]',
                    isSubscribed
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white',
                    (isPending || permission === 'denied') && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  {isPending ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
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
      </div>
    </div>
  );
}

// ─── Small helper components ──────────────────────────────────────────────────

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label htmlFor={htmlFor} className="text-xs font-medium text-zinc-400">
          {label}
        </label>
        {hint && <span className="text-xs text-zinc-600">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function TextInput({
  id,
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
  minLength,
  maxLength,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      minLength={minLength}
      maxLength={maxLength}
      className="w-full px-3 py-2.5 rounded-lg text-sm bg-zinc-950 border border-zinc-700 text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-colors"
    />
  );
}
