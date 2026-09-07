import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    // TODO(Phase 3): check Firebase auth state here instead of a fixed delay,
    // and route to /home directly if the user already has a valid session.
    Timer(const Duration(milliseconds: 1200), () {
      if (mounted) context.go('/onboarding');
    });
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
