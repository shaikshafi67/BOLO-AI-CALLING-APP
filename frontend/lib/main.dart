import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'config/router.dart';
import 'core/app_state.dart';
import 'core/theme.dart';
import 'firebase_options.dart';
import 'services/session.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AppState.instance.load();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  Session.instance.start();
  runApp(const BoloAIApp());
}

class BoloAIApp extends StatelessWidget {
  const BoloAIApp({super.key});

  @override
  Widget build(BuildContext context) {
    final themeController = AppState.instance.theme;
    return ListenableBuilder(
      listenable: themeController,
      builder: (context, _) => MaterialApp.router(
        title: 'BoloAI',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light,
        darkTheme: AppTheme.dark,
        themeMode: themeController.mode,
        routerConfig: appRouter,
      ),
    );
  }
}
