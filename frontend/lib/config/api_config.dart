import 'package:flutter/foundation.dart';

/// Where the BoloAI backend runs (REST under /api, signaling via Socket.IO).
///
///   flutter run --dart-define=BOLOAI_API_URL=http://192.168.1.20:4000
///
/// Defaults to the local dev server: 10.0.2.2 is the host PC as seen from the
/// Android emulator; everything else uses localhost. A real phone needs the
/// PC's Wi-Fi IP address passed with --dart-define.
String get apiBaseUrl {
  const configured = String.fromEnvironment('BOLOAI_API_URL');
  if (configured.isNotEmpty) return configured;
  if (kIsWeb) {
    // Served by the backend itself (port 4000, or a public link to it): same address.
    final page = Uri.base;
    final localDevServer = (page.host == 'localhost' || page.host == '127.0.0.1') && page.port != 4000;
    if (!localDevServer) return page.origin;
  }
  if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) return 'http://10.0.2.2:4000';
  return 'http://localhost:4000';
}
