import { AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { selfResetPassword } from '@/api/auth.api';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { PasswordStrengthMeter } from '@/components/ui/PasswordStrengthMeter';
import { usePasswordStrength } from '@/hooks/usePasswordStrength';
import { extractApiError } from '@/lib/apiError';
import { cn } from '@/lib/utils';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  // Live complexity checking
  const strength = usePasswordStrength(newPw);
  const matchesConfirm = confirmPw.length > 0 && newPw === confirmPw;
  const mismatch = confirmPw.length > 0 && newPw !== confirmPw;
  const canSubmit = !!token && strength.isValid && matchesConfirm && !loading;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || !token) return;
    setError('');
    setLoading(true);

    try {
      await selfResetPassword({
        token,
        newPassword: newPw,
      });

      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch (err: unknown) {
      setError(
        extractApiError(err, 'Failed to reset password. The link may have expired or been reused.'),
      );
    } finally {
      setLoading(false);
    }
  }

  // ── No Token State ─────────────────────────────────────────────────────────
  if (!token) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 w-full">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center w-full max-w-sm">
          <div className="w-12 h-12 rounded-full bg-red-950 border border-red-900 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="text-red-400" size={20} />
          </div>
          <h1 className="text-xl font-bold text-zinc-100 mb-2 tracking-tight">Invalid Link</h1>
          <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
            No password reset token was provided. Please request a new link.
          </p>
          <button
            onClick={() => navigate('/forgot-password')}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
          >
            Go to Forgot Password
          </button>
        </div>
      </div>
    );
  }

  // ── Success State ──────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 w-full">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center w-full max-w-sm">
          <div className="w-14 h-14 rounded-full bg-green-900/50 border border-green-800 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={28} className="text-green-400" />
          </div>
          <h2 className="text-lg font-bold text-zinc-100 mb-2">Password reset!</h2>
          <p className="text-sm text-zinc-400">Taking you to the login screen…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 w-full">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight mb-2">
          Reset your password
        </h1>
        <p className="text-sm text-zinc-400 mb-7 leading-relaxed">
          Please enter a strong new password below to reset your account credentials.
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
                  Resetting password…
                </span>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
