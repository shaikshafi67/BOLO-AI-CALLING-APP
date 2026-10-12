import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/app_state.dart';
import '../../core/theme.dart';
import '../../services/session.dart';
import '../../widgets/brand.dart';

const onboardedKey = 'boloai.onboarded';

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
    WidgetsBinding.instance.addPostFrameCallback((_) => _route());
  }

  Future<void> _route() async {
    // Short pause so the brand is visible even when the auth check is instant.
    await Future.delayed(const Duration(milliseconds: 600));
    if (!mounted) return;
    final signedIn = widget.isSignedInOverride?.call() ?? Session.instance.isSignedIn;
    final onboarded = AppState.instance.prefs?.getBool(onboardedKey) ?? false;
    context.go(signedIn ? '/home' : (onboarded ? '/login' : '/onboarding'));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const LogoMark(size: 72),
            const SizedBox(height: 18),
            Text('BoloAI', style: AppTheme.serif(44, color: context.colors.fg)),
            const SizedBox(height: 6),
            Text('Speak your language. We’ll translate the rest.', style: TextStyle(color: context.colors.muted)),
          ],
        ),
      ),
    );
  }
}
