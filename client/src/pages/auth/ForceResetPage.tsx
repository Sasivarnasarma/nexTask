import { AlertTriangle, CheckCircle, LogOut } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { resetPassword } from '@/api/auth.api';
import { getProfile } from '@/api/profile.api';
import { StarBackground } from '@/components/StarBackground';
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
      <div className="min-h-screen bg-gradient-to-br from-[#090B18] to-[#0D1022] relative overflow-hidden flex items-center justify-center p-6 w-full font-sans animate-fade-in">
        <StarBackground />
        <div className="noise-bg" />
        <div className="absolute inset-0 bg-dot-grid pointer-events-none opacity-45 z-0" />
        <div className="absolute top-[15%] left-[10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full filter blur-[130px] pointer-events-none z-0 animate-pulse-slow" />
        <div className="absolute bottom-[15%] right-[10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full filter blur-[150px] pointer-events-none z-0 animate-pulse-slow-delay" />

        <div className="w-[90%] sm:w-[420px] flex flex-col items-center relative z-10 animate-slide-up-fade">
          <div className="flex flex-col items-center mb-8 select-none animate-fade-in-down">
            <h2 className="text-3xl font-extrabold tracking-wider bg-gradient-to-r from-[#c084fc] via-[#818cf8] to-[#60a5fa] bg-clip-text text-transparent filter drop-shadow-[0_0_8px_rgba(99,102,241,0.3)]">
              nexTask
            </h2>
          </div>
          <div className="w-full bg-[rgba(255,255,255,0.08)] backdrop-blur-[18px] border border-[rgba(255,255,255,0.12)] rounded-[20px] p-[35px] shadow-[0_25px_60px_rgba(0,0,0,0.45)] text-center">
            <div className="w-14 h-14 rounded-full bg-green-900/50 border border-green-800 flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={28} className="text-green-400" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Password updated!</h2>
            <p className="text-sm text-[#B8B8C8]">Taking you to the dashboard…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#090B18] to-[#0D1022] relative overflow-hidden flex items-center justify-center p-6 w-full font-sans animate-fade-in">
      <StarBackground />
      <div className="noise-bg" />
      <div className="absolute inset-0 bg-dot-grid pointer-events-none opacity-45 z-0" />
      <div className="absolute top-[15%] left-[10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full filter blur-[130px] pointer-events-none z-0 animate-pulse-slow" />
      <div className="absolute bottom-[15%] right-[10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full filter blur-[150px] pointer-events-none z-0 animate-pulse-slow-delay" />

      {/* Large 3D Torus Ring Top Right */}
      <div className="absolute -top-[10%] -right-[5%] w-[380px] h-[380px] opacity-35 animate-float-slower pointer-events-none select-none z-0">
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="100"
            cy="100"
            r="70"
            stroke="url(#torus-gradient-1)"
            strokeWidth="30"
            filter="url(#torus-glow-1)"
          />
          <defs>
            <linearGradient id="torus-gradient-1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e1b4b" />
              <stop offset="35%" stopColor="#312e81" />
              <stop offset="70%" stopColor="#4338ca" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </linearGradient>
            <filter id="torus-glow-1" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
        </svg>
      </div>

      <div className="w-[90%] sm:w-[420px] flex flex-col items-center relative z-10 animate-slide-up-fade">
        {/* Centered Logo & Branding Section */}
        <div className="flex flex-col items-center mb-8 select-none animate-fade-in-down">
          <h2 className="text-3xl font-extrabold tracking-wider bg-gradient-to-r from-[#c084fc] via-[#818cf8] to-[#60a5fa] bg-clip-text text-transparent filter drop-shadow-[0_0_8px_rgba(99,102,241,0.3)]">
            nexTask
          </h2>
        </div>

        {/* Central Glassmorphic Card Container */}
        <div className="w-full bg-[rgba(255,255,255,0.08)] backdrop-blur-[18px] border border-[rgba(255,255,255,0.12)] rounded-[20px] p-[35px] shadow-[0_25px_60px_rgba(0,0,0,0.45)]">
          {/* Warning badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-950/60 border border-amber-900/50 text-amber-400 text-xs font-semibold mb-4 w-full justify-center">
            <AlertTriangle size={12} />
            Action required
          </div>

          <h1 className="text-[28px] font-bold text-white tracking-tight mb-2 select-none">
            Set your new password
          </h1>
          <p className="text-xs text-[#B8B8C8] mb-6 leading-relaxed select-none font-medium">
            Your account was set up with a temporary password. Choose a strong new password to
            continue — you cannot access nexTask until this is complete.
          </p>

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-red-950/50 border border-red-900/50 rounded-lg text-sm text-red-300 mb-4 animate-shake">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
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
            <div className="border-t border-white/10 my-2" />

            {/* New password + strength meter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">New password</label>
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
              <label className="text-xs font-semibold text-slate-300">Confirm new password</label>
              <PasswordInput
                required
                autoComplete="new-password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Repeat your new password"
                error={mismatch ? "Passwords don't match" : undefined}
              />
              {matchesConfirm && (
                <p className="text-xs text-green-400 flex items-center gap-1 mt-1 font-medium">
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
                'w-full h-[50px] rounded-[10px] text-sm font-semibold text-white bg-gradient-to-r from-[#6D4BFF] to-[#4D7BFF] hover:from-[#7e60ff] hover:to-[#5e8bff] hover:-translate-y-[2px] active:translate-y-0 shadow-[0_4px_15px_rgba(109,75,255,0.25)] hover:shadow-[0_8px_25px_rgba(109,75,255,0.4)] transition-all duration-300 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center justify-center gap-2 mt-2',
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

          {/* Logout escape */}
          <button
            onClick={handleLogout}
            className="mt-6 flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mx-auto font-medium"
          >
            <LogOut size={12} />
            Sign out instead
          </button>
        </div>
      </div>
    </div>
  );
}
