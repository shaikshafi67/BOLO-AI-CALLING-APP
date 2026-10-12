import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'package:boloai_app/features/splash/splash_screen.dart';

void main() {
  testWidgets('Splash screen shows BoloAI branding then routes to onboarding when signed out', (tester) async {
    final router = GoRouter(
      initialLocation: '/',
      routes: [
        GoRoute(
          path: '/',
          builder: (context, state) => SplashScreen(isSignedInOverride: () => false),
        ),
        GoRoute(path: '/onboarding', builder: (context, state) => const Text('ONBOARDING')),
        GoRoute(path: '/home', builder: (context, state) => const Text('HOME')),
      ],
    );

    await tester.pumpWidget(MaterialApp.router(routerConfig: router));
    await tester.pump();

    expect(find.text('BoloAI'), findsOneWidget);
    expect(find.text('Speak your language. We’ll translate the rest.'), findsOneWidget);

    // Let the splash screen's auth-check delay elapse and the router rebuild.
    await tester.pump(const Duration(milliseconds: 700));
    await tester.pumpAndSettle();

    expect(find.text('ONBOARDING'), findsOneWidget);
  });
}
