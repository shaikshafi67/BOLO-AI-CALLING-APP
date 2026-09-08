import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../services/auth_service.dart';

class SplashScreen extends StatefulWidget {
  /// Overridable for widget tests, which don't initialize Firebase.
  final bool Function()? isSignedInOverride;

  const SplashScreen({super.key, this.isSignedInOverride});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _checkAuthState());
  }

  Future<void> _checkAuthState() async {
    // Small delay so the splash branding is visible even on a fast auth check.
    await Future.delayed(const Duration(milliseconds: 600));
    if (!mounted) return;
    final isSignedIn = widget.isSignedInOverride?.call() ?? AuthService().currentUser != null;
    context.go(isSignedIn ? '/home' : '/onboarding');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.translate, size: 72, color: Theme.of(context).colorScheme.primary),
            const SizedBox(height: 16),
            Text('BoloAI', style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 4),
            Text('Your Voice, Any Language.', style: Theme.of(context).textTheme.bodyMedium),
          ],
        ),
      ),
    );
  }
}
