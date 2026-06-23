import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { getProfile } from '@/api/profile.api';
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
 *  - Authenticated + ok     → render children and sync profile background
 */
export function RequireAuth({ children }: Props) {
  const { isAuthenticated, user, logout, updateUser } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      getProfile()
        .then((profile) => {
          updateUser(profile);
        })
        .catch((err) => {
          console.error('Failed to sync profile, logging out:', err);
          logout();
        });
    }
  }, [isAuthenticated, logout, updateUser]);

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
