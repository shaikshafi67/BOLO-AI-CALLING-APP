import { useEffect, type ReactNode } from 'react';
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
  const { isAuthenticated, initializing, needsVerification } = useAuth();
  const location = useLocation();
  if (initializing) return <Restoring />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (needsVerification === null) return <Restoring />;
  // A new account must enter the emailed code before using the app.
  if (needsVerification) return <Navigate to="/verify-email" replace />;
  return <>{children}</>;
}

/** True while "Verify your email" is on screen (see GuestOnly). */
export const verifyPage = { open: false };

/** Keeps signed-in users away from /login and /register. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { isAuthenticated, initializing, needsVerification, logout } = useAuth();
  const leavingVerification = isAuthenticated && needsVerification === true && verifyPage.open;
  useEffect(() => {
    // Back from "Verify your email" (e.g. the browser's Back button): sign out
    // and stay here. They're asked again the next time they log in.
    if (leavingVerification) void logout();
  }, [leavingVerification, logout]);
  if (initializing) return <Restoring />;
  if (leavingVerification) return <>{children}</>;
  if (isAuthenticated) return <Navigate to={needsVerification ? '/verify-email' : '/dashboard'} replace />;
  return <>{children}</>;
}

/** The verify-email page: signed in, and still needs to verify. */
export function RequireUnverified({ children }: { children: ReactNode }) {
  const { isAuthenticated, initializing, needsVerification } = useAuth();
  if (initializing || (isAuthenticated && needsVerification === null)) return <Restoring />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!needsVerification) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
