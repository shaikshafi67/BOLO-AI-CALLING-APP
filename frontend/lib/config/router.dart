import 'package:go_router/go_router.dart';
import '../features/auth/forgot_password_screen.dart';
import '../features/auth/login_screen.dart';
import '../features/auth/register_screen.dart';
import '../features/call/active_call_screen.dart';
import '../features/call/call_history_screen.dart';
import '../features/call/incoming_call_screen.dart';
import '../features/call/join_call_screen.dart';
import '../features/call/start_call_screen.dart';
import '../features/contacts/contacts_screen.dart';
import '../features/dashboard/dashboard_screen.dart';
import '../features/home/home_shell.dart';
import '../features/not_found/not_found_screen.dart';
import '../features/notifications/notifications_screen.dart';
import '../features/onboarding/onboarding_screen.dart';
import '../features/profile/profile_screen.dart';
import '../features/settings/settings_screen.dart';
import '../features/splash/splash_screen.dart';
import '../services/session.dart';

/// Routes anyone can open without signing in.
const _publicRoutes = {'/', '/onboarding', '/login', '/register', '/forgot-password'};

/// Signed-in users are sent past these straight to the dashboard.
const _guestOnlyRoutes = {'/onboarding', '/login', '/register'};

final appRouter = GoRouter(
  initialLocation: '/',
  refreshListenable: Session.instance,
  redirect: (context, state) {
    final signedIn = Session.instance.isSignedIn;
    final path = state.uri.path;
    if (!signedIn && !_publicRoutes.contains(path)) return '/login';
    if (signedIn && _guestOnlyRoutes.contains(path)) return '/home';
    return null;
  },
  errorBuilder: (context, state) => const NotFoundScreen(),
  routes: [
    GoRoute(path: '/', builder: (context, state) => const SplashScreen()),
    GoRoute(path: '/onboarding', builder: (context, state) => const OnboardingScreen()),
    GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
    GoRoute(path: '/register', builder: (context, state) => const RegisterScreen()),
    GoRoute(path: '/forgot-password', builder: (context, state) => const ForgotPasswordScreen()),

    // Main app with bottom navigation (phones) or side rail (tablet/desktop).
    ShellRoute(
      builder: (context, state, child) => HomeShell(location: state.uri.path, child: child),
      routes: [
        GoRoute(path: '/home', builder: (context, state) => const DashboardScreen()),
        GoRoute(path: '/contacts', builder: (context, state) => ContactsScreen(initialQuery: state.uri.queryParameters['q'])),
        GoRoute(path: '/history', builder: (context, state) => const CallHistoryScreen()),
        GoRoute(path: '/notifications', builder: (context, state) => const NotificationsScreen()),
        GoRoute(path: '/profile', builder: (context, state) => const ProfileScreen()),
        GoRoute(path: '/settings', builder: (context, state) => const SettingsScreen()),
        GoRoute(path: '/start-call', builder: (context, state) => StartCallScreen(contactId: state.uri.queryParameters['contact'])),
        GoRoute(path: '/join-call', builder: (context, state) => const JoinCallScreen()),
      ],
    ),

    // Full-screen call experience.
    GoRoute(
      path: '/call/:roomCode',
      builder: (context, state) => ActiveCallScreen(
        roomCode: state.pathParameters['roomCode']!,
        contactId: state.uri.queryParameters['contact'],
      ),
    ),
    // A contact is ringing (IncomingCalls).
    GoRoute(path: '/incoming', builder: (context, state) => const IncomingCallScreen()),
  ],
);
