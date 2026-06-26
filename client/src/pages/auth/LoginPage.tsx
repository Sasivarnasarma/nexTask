import { AlertCircle, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { login } from '@/api/auth.api';
import { getProfile } from '@/api/profile.api';
import { StarBackground } from '@/components/StarBackground';
import { extractApiError } from '@/lib/apiError';
import { useAuthStore } from '@/store/auth.store';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login({ email, password });

      if (result.mustResetPassword) {
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
    <div className="min-h-screen bg-gradient-to-br from-[#090B18] to-[#0D1022] relative overflow-hidden flex items-center justify-center p-6 w-full font-sans animate-fade-in">
      <StarBackground />
      {/* Light grain/noise texture overlay */}
      <div className="noise-bg" />

      {/* Background dot matrix layer */}
      <div className="absolute inset-0 bg-dot-grid pointer-events-none opacity-45 z-0" />

      {/* Background glowing nebulae */}
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

      {/* Bottom Left Overlapping Rings / Noodle */}
      <div className="absolute -bottom-[12%] -left-[5%] w-[420px] h-[420px] opacity-30 animate-float-slow pointer-events-none select-none z-0">
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M40,100 A60,60 0 1,0 160,100 A60,60 0 1,0 40,100"
            stroke="url(#noodle-grad-1)"
            strokeWidth="32"
            strokeLinecap="round"
            filter="url(#torus-glow-2)"
          />
          <defs>
            <linearGradient id="noodle-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="30%" stopColor="#312e81" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="80%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <filter id="torus-glow-2" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow
                dx="2"
                dy="8"
                stdDeviation="10"
                floodColor="#4f46e5"
                floodOpacity="0.3"
              />
            </filter>
          </defs>
        </svg>
      </div>

      {/* Left Z-shaped Noodle */}
      <div className="absolute left-[5%] top-[25%] w-[250px] h-[250px] opacity-25 animate-float-medium pointer-events-none select-none z-0">
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M20,20 C50,20 10,80 40,80 C70,80 60,30 90,40"
            stroke="url(#pipe-gradient-1)"
            strokeWidth="12"
            strokeLinecap="round"
            filter="url(#pipe-glow)"
          />
          <defs>
            <linearGradient id="pipe-gradient-1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
            <filter id="pipe-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow
                dx="0"
                dy="4"
                stdDeviation="6"
                floodColor="#6366f1"
                floodOpacity="0.4"
              />
            </filter>
          </defs>
        </svg>
      </div>

      {/* Right Curly Noodle */}
      <div className="absolute right-[3%] top-[30%] w-[300px] h-[300px] opacity-25 animate-float-slow pointer-events-none select-none z-0">
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M20,60 C20,20 100,20 100,60 C100,100 50,110 50,70 C50,30 90,40 110,90"
            stroke="url(#pipe-gradient-2)"
            strokeWidth="14"
            strokeLinecap="round"
            filter="url(#pipe-glow-2)"
          />
          <defs>
            <linearGradient id="pipe-gradient-2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="50%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
            <filter id="pipe-glow-2" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow
                dx="0"
                dy="6"
                stdDeviation="8"
                floodColor="#a855f7"
                floodOpacity="0.3"
              />
            </filter>
          </defs>
        </svg>
      </div>

      {/* Right Bottom Wavy Noodle */}
      <div className="absolute right-[12%] bottom-[15%] w-[160px] h-[80px] opacity-20 animate-float-medium pointer-events-none select-none z-0">
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 50"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10,25 Q25,10 40,25 T70,25 T100,25"
            stroke="url(#wave-grad-small)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="wave-grad-small" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Crescent Moon Top Left */}
      <div className="absolute top-[12%] left-[10%] opacity-20 animate-float-slow pointer-events-none select-none z-0">
        <svg
          width="60"
          height="60"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" fill="url(#moon-gradient)" />
          <defs>
            <linearGradient id="moon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Sharp Twinkling Stars */}
      <div className="absolute top-[15%] left-[28%] text-purple-300 pointer-events-none select-none star-twinkle-1 z-0">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9Z" />
        </svg>
      </div>
      <div className="absolute top-[22%] right-[25%] text-indigo-300 pointer-events-none select-none star-twinkle-2 z-0">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9Z" />
        </svg>
      </div>
      <div className="absolute bottom-[20%] right-[15%] text-indigo-200 pointer-events-none select-none star-twinkle-3 z-0">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9Z" />
        </svg>
      </div>

      {/* Content container */}
      <div className="w-[90%] sm:w-[420px] flex flex-col items-center relative z-10 animate-slide-up-fade">
        {/* Centered Logo & Branding Section */}
        <div className="flex flex-col items-center mb-8 select-none animate-fade-in-down">
          <h2 className="text-3xl font-extrabold tracking-wider bg-gradient-to-r from-[#c084fc] via-[#818cf8] to-[#60a5fa] bg-clip-text text-transparent filter drop-shadow-[0_0_8px_rgba(99,102,241,0.3)]">
            nexTask
          </h2>
        </div>

        {/* Central Glassmorphic Card Container */}
        <div className="w-full bg-[rgba(255,255,255,0.08)] backdrop-blur-[18px] border border-[rgba(255,255,255,0.12)] rounded-[20px] p-[35px] shadow-[0_25px_60px_rgba(0,0,0,0.45)]">
          <h1 className="text-[32px] font-bold text-white mb-1 tracking-tight select-none">
            Welcome back
          </h1>
          <p className="text-[15px] text-[#B8B8C8] mb-6 select-none font-medium">
            Sign in to your workspace
          </p>

          {/* Error banner */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-950/50 border border-red-900/50 rounded-lg mb-5 text-sm text-red-300">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300" htmlFor="email">
                Email
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8F92A5]">
                  <Mail size={18} />
                </span>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full h-[50px] pl-11 pr-4 rounded-[10px] bg-[rgba(0,0,0,0.35)] border border-[rgba(255,255,255,0.08)] text-white placeholder:text-[#8F92A5] focus:border-[#6D4BFF] focus:ring-2 focus:ring-[#6D4BFF]/25 outline-none transition-all duration-200"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300" htmlFor="password">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-[#4D7BFF] hover:text-[#6d8eff] hover:underline transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8F92A5]">
                  <Lock size={18} />
                </span>
                <input
                  id="password"
                  required
                  autoComplete="current-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-[50px] pl-11 pr-11 rounded-[10px] bg-[rgba(0,0,0,0.35)] border border-[rgba(255,255,255,0.08)] text-white placeholder:text-[#8F92A5] focus:border-[#6D4BFF] focus:ring-2 focus:ring-[#6D4BFF]/25 outline-none transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8F92A5] hover:text-white transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-[50px] rounded-[10px] text-sm font-semibold text-white bg-gradient-to-r from-[#6D4BFF] to-[#4D7BFF] hover:from-[#7e60ff] hover:to-[#5e8bff] hover:-translate-y-[2px] active:translate-y-0 shadow-[0_4px_15px_rgba(109,75,255,0.25)] hover:shadow-[0_8px_25px_rgba(109,75,255,0.4)] transition-all duration-300 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Signing in…
                </>
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
