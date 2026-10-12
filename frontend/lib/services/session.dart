import 'dart:async';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import '../core/app_state.dart';
import '../models/user.dart';
import 'auth_service.dart';
import 'device_session.dart';

/// Offline demo mode for presentations and screenshots:
///   flutter run --dart-define=BOLOAI_DEMO=true
/// Skips Firebase sign-in and uses a mock user. Never on by default.
const bool kDemoMode = bool.fromEnvironment('BOLOAI_DEMO');

/// The signed-in user as the app sees it. Combines the Firebase account
/// (id, email, display name) with the preferred language saved on the device.
///
/// TODO: Connect backend database — once the backend's Firebase Admin keys are
/// configured, load the profile from GET /api/users/me and create it with
/// POST /api/users after registration (see userService).
class Session extends ChangeNotifier {
  Session._();
  static final Session instance = Session._();

  AppUser? _user;
  AppUser? get user => _user;
  bool get isSignedIn => _user != null;

  /// Why the user was signed out, shown once on the login screen.
  final ValueNotifier<String?> signOutNotice = ValueNotifier(null);

  StreamSubscription<User?>? _sub;

  void start() {
    if (kDemoMode) {
      _user = const AppUser(id: 'demo', name: 'Shafi Shaik', email: 'shafi@boloai.app', preferredLanguage: 'hi');
      return;
    }
    _sub?.cancel();
    final auth = AuthService();
    _user = _fromFirebase(auth.currentUser);

    // One signed-in device per account: signing in elsewhere signs this one out.
    DeviceSession.instance.onRevoked = () {
      signOutNotice.value = 'Your account was signed in on another device, so you were signed out here.';
      AuthService().signOut();
    };
    _sub = auth.authStateChanges().listen((u) {
      if (u == null) {
        DeviceSession.instance.stop();
      } else {
        DeviceSession.instance.start(u);
      }
      _user = _fromFirebase(u);
      notifyListeners();
    });
  }

  /// Returns the sign-out notice and clears it.
  String? takeSignOutNotice() {
    final notice = signOutNotice.value;
    signOutNotice.value = null;
    return notice;
  }

  /// Re-read the Firebase user (e.g. after setting the display name).
  void refresh() {
    if (kDemoMode) return;
    _user = _fromFirebase(AuthService().currentUser);
    notifyListeners();
  }

  void setPreferredLanguage(String code) {
    final u = _user;
    if (u == null) return;
    AppState.instance.prefs?.setString(_langKey(u.id), code);
    _user = u.copyWith(preferredLanguage: code);
    notifyListeners();
  }

  void setNameLocally(String name) {
    final u = _user;
    if (u == null) return;
    _user = u.copyWith(name: name);
    notifyListeners();
  }

  Future<void> signOut() async {
    if (kDemoMode) {
      _user = null;
      notifyListeners();
      return;
    }
    await DeviceSession.instance.release();
    await AuthService().signOut();
  }

  String _langKey(String uid) => 'boloai.lang.$uid';

  AppUser? _fromFirebase(User? u) {
    if (u == null) return null;
    final email = u.email ?? '';
    final fallbackName = email.contains('@') ? email.split('@').first : 'BoloAI user';
    return AppUser(
      id: u.uid,
      name: (u.displayName?.trim().isNotEmpty ?? false) ? u.displayName!.trim() : fallbackName,
      email: email,
      preferredLanguage: AppState.instance.prefs?.getString(_langKey(u.uid)) ?? 'hi',
    );
  }
}
