import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuthStore } from '@/store/auth.store';

interface Props {
  children: ReactNode;
}

/**
 * Wraps protected routes.
 *
 * Redirect logic:
 *  - Not authenticated      → /login
 *  - mustResetPassword=true → /force-reset  (cannot access any other page)
 *  - Authenticated + ok     → render children
 */
export function RequireAuth({ children }: Props) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.mustResetPassword && location.pathname !== '/force-reset') {
    return <Navigate to="/force-reset" replace />;
  }

  return <>{children}</>;
}

/**
 * Used on /login and /force-reset to redirect already-authenticated users away.
 */
export function RedirectIfAuthenticated({ children }: Props) {
  const { isAuthenticated, user } = useAuthStore();

  if (isAuthenticated) {
    // If they still need to reset, let them stay on /force-reset
    if (user?.mustResetPassword) {
      return <Navigate to="/force-reset" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
