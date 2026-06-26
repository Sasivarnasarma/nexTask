import { AlertTriangle, CheckCircle, LogOut } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { resetPassword } from '@/api/auth.api';
import { getProfile } from '@/api/profile.api';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { PasswordStrengthMeter } from '@/components/ui/PasswordStrengthMeter';
import { usePasswordStrength } from '@/hooks/usePasswordStrength';
import { useWebPush } from '@/hooks/useWebPush';
import { extractApiError } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

export default function ForceResetPage() {
  const navigate = useNavigate();
  const { setAuth, logout } = useAuthStore();
  const { unsubscribe } = useWebPush();

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  // Live complexity checking
  const strength = usePasswordStrength(newPw);
  const matchesConfirm = confirmPw.length > 0 && newPw === confirmPw;
  const mismatch = confirmPw.length > 0 && newPw !== confirmPw;
  const canSubmit = currentPw.length > 0 && strength.isValid && matchesConfirm && !loading;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setLoading(true);

    try {
      const result = await resetPassword({
        currentPassword: currentPw,
        newPassword: newPw,
        confirmNewPassword: confirmPw,
      });

      // Store the new token first
      useAuthStore.getState().setToken(result.token);
      // Fetch the updated user profile
      const profile = await getProfile();
      setAuth(result.token, profile);
      setDone(true);

      // Brief success state then navigate to dashboard
      setTimeout(() => navigate('/dashboard', { replace: true }), 1800);
    } catch (err: unknown) {
      setError(extractApiError(err, 'Failed to update password.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await unsubscribe();
    } catch (e) {
      console.error('Failed to unsubscribe push notifications on logout:', e);
    }
    logout();
    navigate('/login', { replace: true });
  }

  // ── Success screen ─────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center p-6 w-full">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center w-full max-w-sm">
          <div className="w-14 h-14 rounded-full bg-green-900/50 border border-green-800 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={28} className="text-green-400" />
          </div>
          <h2 className="text-lg font-bold text-zinc-100 mb-2">Password updated!</h2>
          <p className="text-sm text-zinc-400">Taking you to the dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-6 w-full">
      <div className="w-full max-w-md">
        {/* Warning badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-950 border border-amber-900 text-amber-400 text-xs font-semibold mb-5">
          <AlertTriangle size={12} />
          Action required
        </div>

        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight mb-2">
          Set your new password
        </h1>
        <p className="text-sm text-zinc-400 mb-7 leading-relaxed">
          Your account was set up with a temporary password. Choose a strong new password to
          continue — you cannot access nexTask until this is complete.
        </p>

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-7 space-y-5">
          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-red-950 border border-red-900 rounded-lg text-sm text-red-300">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Current password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">
                Current (temporary) password
              </label>
              <PasswordInput
                required
                autoComplete="current-password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="Your current password"
              />
            </div>

            {/* Divider */}
            <div className="border-t border-zinc-800" />

            {/* New password + strength meter */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">New password</label>
              <PasswordInput
                required
                autoComplete="new-password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="Create a strong password"
                error={
                  newPw && !strength.isValid
                    ? "Password doesn't meet all requirements yet"
                    : undefined
                }
              />
              {/* ── Live complexity indicator ── */}
              <PasswordStrengthMeter password={newPw} />
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Confirm new password</label>
              <PasswordInput
                required
                autoComplete="new-password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Repeat your new password"
                error={mismatch ? "Passwords don't match" : undefined}
              />
              {matchesConfirm && (
                <p className="text-xs text-green-400 flex items-center gap-1 mt-1">
                  <CheckCircle size={11} />
                  Passwords match
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!canSubmit}
              className={cn(
                'w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all',
                'bg-indigo-600 hover:bg-indigo-500 active:scale-[.98]',
                !canSubmit && 'opacity-40 cursor-not-allowed',
              )}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Updating password…
                </span>
              ) : (
                'Update password & continue'
              )}
            </button>
          </form>
        </div>

        {/* Logout escape */}
        <button
          onClick={handleLogout}
          className="mt-5 flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mx-auto"
        >
          <LogOut size={12} />
          Sign out instead
        </button>
      </div>
    </div>
  );
}
