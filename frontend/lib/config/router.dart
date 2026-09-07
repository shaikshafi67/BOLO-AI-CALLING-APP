import 'package:go_router/go_router.dart';
import '../features/splash/splash_screen.dart';
import '../features/onboarding/onboarding_screen.dart';
import '../features/auth/login_screen.dart';
import '../features/auth/register_screen.dart';
import '../features/auth/forgot_password_screen.dart';
import '../features/home/home_shell.dart';
import '../features/call/outgoing_call_screen.dart';
import '../features/call/incoming_call_screen.dart';
import '../features/call/active_call_screen.dart';
import '../features/settings/settings_screen.dart';
import '../features/settings/language_settings_screen.dart';
import '../models/user.dart';

final appRouter = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(path: '/', builder: (context, state) => const SplashScreen()),
    GoRoute(path: '/onboarding', builder: (context, state) => const OnboardingScreen()),
    GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
    GoRoute(path: '/register', builder: (context, state) => const RegisterScreen()),
    GoRoute(path: '/forgot-password', builder: (context, state) => const ForgotPasswordScreen()),
    GoRoute(path: '/home', builder: (context, state) => const HomeShell()),
    GoRoute(
      path: '/call/outgoing',
      builder: (context, state) => OutgoingCallScreen(callee: state.extra as AppUser),
    ),
    GoRoute(
      path: '/call/incoming',
      builder: (context, state) => IncomingCallScreen(caller: state.extra as AppUser),
    ),
    GoRoute(
      path: '/call/active',
      builder: (context, state) => ActiveCallScreen(participant: state.extra as AppUser),
    ),
    GoRoute(path: '/settings', builder: (context, state) => const SettingsScreen()),
    GoRoute(path: '/settings/language', builder: (context, state) => const LanguageSettingsScreen()),
  ],
);
