import { AlertCircle, ArrowLeft, CheckSquare, Mail } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';

import { forgotPassword } from '@/api/auth.api';
import { extractApiError } from '@/lib/apiError';
import { cn } from '@/lib/utils';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await forgotPassword(email);
      setSuccess(true);
    } catch (err: unknown) {
      setError(extractApiError(err, 'Failed to request password reset. Please try again.'));
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
          {success ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <Mail className="text-emerald-500" size={20} />
              </div>
              <h1 className="text-xl font-bold text-zinc-100 mb-2 tracking-tight">
                Check your email
              </h1>
              <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                If an account exists with <strong className="text-zinc-200">{email}</strong>, we
                have sent a link to reset your password.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <ArrowLeft size={14} />
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-zinc-100 mb-1 tracking-tight">
                Forgot password?
              </h1>
              <p className="text-sm text-zinc-400 mb-6">
                Enter your email and we'll send a reset link
              </p>

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
                    Email address
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
                      Sending link…
                    </span>
                  ) : (
                    'Send reset link'
                  )}
                </button>

                <div className="text-center pt-2">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    <ArrowLeft size={12} />
                    Back to sign in
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
