import { AlertCircle, CheckSquare } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { login } from '@/api/auth.api';
import { getProfile } from '@/api/profile.api';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { extractApiError } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login({ email, password });

      if (result.mustResetPassword) {
        // Enforce temporary user object until password is changed
        setAuth(result.token, {
          id: '',
          email,
          name: null,
          role: 'COLLABORATOR',
          mustResetPassword: true,
          isActive: true,
          createdAt: '',
          updatedAt: '',
        });
        navigate('/force-reset', { replace: true });
      } else {
        // Set the token first so that getProfile can authorize
        useAuthStore.getState().setToken(result.token);
        const profile = await getProfile();
        setAuth(result.token, profile);
        navigate(from, { replace: true });
      }
    } catch (err: unknown) {
      setError(extractApiError(err, 'Login failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 w-full">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
            <CheckSquare size={18} className="text-white" />
          </div>
          <span className="text-lg font-bold text-zinc-100 tracking-tight">nexTask</span>
        </div>

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <h1 className="text-xl font-bold text-zinc-100 mb-1 tracking-tight">Welcome back</h1>
          <p className="text-sm text-zinc-400 mb-6">Sign in to your workspace</p>

          {/* Error banner */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-950 border border-red-900 rounded-lg mb-5 text-sm text-red-300">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-3 py-2.5 rounded-lg text-sm bg-zinc-950 border border-zinc-700 text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-colors"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400" htmlFor="password">
                Password
              </label>
              <PasswordInput
                id="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={cn(
                'w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all mt-2',
                'bg-indigo-600 hover:bg-indigo-500 active:scale-[.98]',
                loading && 'opacity-60 cursor-not-allowed',
              )}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Signing in…
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
