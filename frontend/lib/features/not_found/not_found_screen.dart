import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import '../../services/session.dart';
import '../../widgets/brand.dart';

class NotFoundScreen extends StatelessWidget {
  const NotFoundScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const LogoMark(size: 44),
                const SizedBox(height: 18),
                Text('404', style: AppTheme.serif(120, color: context.brand, height: 1)),
                Text('Lost in translation', style: AppTheme.serif(38, color: context.colors.fg, italic: true)),
                const SizedBox(height: 10),
                Text(
                  'We couldn’t find that page in any language.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: context.colors.muted),
                ),
                const SizedBox(height: 4),
                Text('यह पेज नहीं मिला · ఈ పేజీ కనుగొనబడలేదు', style: TextStyle(color: context.colors.subtle, fontSize: 13)),
                const SizedBox(height: 24),
                FilledButton.icon(
                  onPressed: () => context.go(Session.instance.isSignedIn ? '/home' : '/'),
                  icon: const Icon(Icons.home_outlined),
                  label: Text(Session.instance.isSignedIn ? 'Back to dashboard' : 'Back to start'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
