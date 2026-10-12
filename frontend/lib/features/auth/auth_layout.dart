import 'package:flutter/material.dart';
import '../../core/app_state.dart';
import '../../core/media.dart';
import '../../core/theme.dart';
import '../../widgets/brand.dart';

/// Layout for login / register / forgot password.
/// Phones: photo banner on top. Tablets/desktop: photo panel on the left.
class AuthLayout extends StatelessWidget {
  final String title;
  final String subtitle;
  final Widget child;
  final bool showBack;

  const AuthLayout({super.key, required this.title, required this.subtitle, required this.child, this.showBack = false});

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 900;

    final form = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(title, style: AppTheme.serif(44, color: context.colors.fg)),
        const SizedBox(height: 6),
        Text(subtitle, style: TextStyle(color: context.colors.muted, fontSize: 15)),
        const SizedBox(height: 28),
        child,
      ],
    );

    if (wide) {
      return Scaffold(
        body: Row(
          children: [
            const Expanded(child: _PhotoPanel(large: true)),
            Expanded(
              child: SafeArea(
                child: Column(
                  children: [
                    const Align(alignment: Alignment.topRight, child: Padding(padding: EdgeInsets.all(12), child: _ThemeButton())),
                    Expanded(
                      child: Center(
                        child: SingleChildScrollView(
                          padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 24),
                          child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 420), child: form),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      );
    }

    return Scaffold(
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(height: 210, child: _PhotoPanel(large: false, showBack: showBack)),
            Padding(padding: const EdgeInsets.fromLTRB(22, 26, 22, 32), child: form),
          ],
        ),
      ),
    );
  }
}

class _PhotoPanel extends StatelessWidget {
  final bool large;
  final bool showBack;
  const _PhotoPanel({required this.large, this.showBack = false});

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        Image.asset(Media.headphones, fit: BoxFit.cover, alignment: const Alignment(-0.1, -0.2)),
        const DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.bottomCenter,
              end: Alignment.topCenter,
              colors: [Color(0xD9000000), Color(0x33000000), Color(0x55000000)],
            ),
          ),
        ),
        SafeArea(
          bottom: false,
          child: Padding(
            padding: EdgeInsets.all(large ? 40 : 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    if (showBack)
                      IconButton(
                        tooltip: 'Back',
                        icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
                        onPressed: () => Navigator.of(context).maybePop(),
                      ),
                    const Logo(size: 30, textColor: Colors.white),
                    const Spacer(),
                    if (!large) const _ThemeButton(color: Colors.white),
                  ],
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.65), borderRadius: BorderRadius.circular(8)),
                  child: const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text('आप कैसे हैं?', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w500)),
                      Text('“How are you?” · English → Hindi', style: TextStyle(color: Colors.white60, fontSize: 11)),
                    ],
                  ),
                ),
                if (large) ...[
                  const SizedBox(height: 28),
                  Text.rich(
                    const TextSpan(children: [
                      TextSpan(text: 'Speak your language.\n'),
                      TextSpan(text: 'We’ll translate the rest.', style: TextStyle(fontStyle: FontStyle.italic)),
                    ]),
                    style: AppTheme.serif(48, color: Colors.white),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Video calls with live captions and translated voice, starting with India’s languages and English.',
                    style: TextStyle(color: Colors.white70, fontSize: 15),
                  ),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _ThemeButton extends StatelessWidget {
  final Color? color;
  const _ThemeButton({this.color});

  @override
  Widget build(BuildContext context) {
    final dark = context.isDark;
    return IconButton(
      tooltip: dark ? 'Light mode' : 'Dark mode',
      icon: Icon(dark ? Icons.light_mode_outlined : Icons.dark_mode_outlined, color: color),
      onPressed: () => AppState.instance.theme.setMode(dark ? ThemeMode.light : ThemeMode.dark),
    );
  }
}
