import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'config/router.dart';
import 'core/theme.dart';
import 'firebase_options.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
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
