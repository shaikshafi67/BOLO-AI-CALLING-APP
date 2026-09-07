import 'package:flutter/material.dart';
import 'config/router.dart';
import 'core/theme.dart';

void main() {
  runApp(const BoloAIApp());
}

class BoloAIApp extends StatelessWidget {
  const BoloAIApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'BoloAI',
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      routerConfig: appRouter,
    );
  }
}
