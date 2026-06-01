import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  isAuthenticated: boolean;
  children: React.ReactNode;
}

export function ProtectedRoute({ isAuthenticated, children }: ProtectedRouteProps) {
  if (!isAuthenticated) {
    // Kick them back to login if they aren't authenticated
    return <Navigate to="/login" replace />;
  }

  // Otherwise, safely render the page they requested
  return <>{children}</>;
}
