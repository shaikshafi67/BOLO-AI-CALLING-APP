import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

function Restoring() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Signing you in">
      <Loader2 className="size-6 animate-spin text-brand-500" />
    </div>
  );
}

/** Redirects signed-out users to /login, remembering where they were headed. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, initializing } = useAuth();
  const location = useLocation();
  if (initializing) return <Restoring />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <>{children}</>;
}

/** Keeps signed-in users away from /login and /register. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { isAuthenticated, initializing } = useAuth();
  if (initializing) return <Restoring />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
