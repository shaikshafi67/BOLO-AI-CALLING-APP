import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { CallSettingsProvider } from './context/CallSettingsContext';
import { NotificationsProvider } from './context/NotificationsContext';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './components/layout/AppLayout';
import { GuestOnly, RequireAuth } from './components/layout/RouteGuards';
import LandingPage from './pages/LandingPage';

// Route-level code splitting keeps the landing page fast.
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const StartCallPage = lazy(() => import('./pages/StartCallPage'));
const JoinCallPage = lazy(() => import('./pages/JoinCallPage'));
const VideoCallPage = lazy(() => import('./pages/VideoCallPage'));
const CallHistoryPage = lazy(() => import('./pages/CallHistoryPage'));
const ContactsPage = lazy(() => import('./pages/ContactsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Loading">
      <Loader2 className="size-6 animate-spin text-brand-500" />
    </div>
  );
}

/** Scroll to top on route change (hash links on the landing page still work). */
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <CallSettingsProvider>
            <NotificationsProvider>
              <BrowserRouter>
                <ScrollToTop />
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
                    <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />

                    {/* Full-screen call experience (no sidebar) */}
                    <Route path="/call/:callId" element={<RequireAuth><VideoCallPage /></RequireAuth>} />

                    {/* Signed-in app shell */}
                    <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
                      <Route path="/dashboard" element={<DashboardPage />} />
                      <Route path="/start-call" element={<StartCallPage />} />
                      <Route path="/join-call" element={<JoinCallPage />} />
                      <Route path="/history" element={<CallHistoryPage />} />
                      <Route path="/contacts" element={<ContactsPage />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="/notifications" element={<NotificationsPage />} />
                    </Route>

                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </NotificationsProvider>
          </CallSettingsProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
