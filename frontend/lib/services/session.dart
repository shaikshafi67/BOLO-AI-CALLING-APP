import 'dart:async';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import '../core/app_state.dart';
import '../models/user.dart';
import 'auth_service.dart';
import 'device_session.dart';
import 'history_store.dart';
import 'incoming_calls.dart';
import 'user_service.dart';

/// The signed-in user as the app sees it. Combines the Firebase account
/// (id, email, display name) with the preferred language, which is saved on
/// the device and in the backend profile (GET/POST /api/users).
class Session extends ChangeNotifier {
  Session._();
  static final Session instance = Session._();

  AppUser? _user;
  AppUser? get user => _user;
  bool get isSignedIn => _user != null;

  /// Why the user was signed out, shown once on the login screen.
  final ValueNotifier<String?> signOutNotice = ValueNotifier(null);

  StreamSubscription<User?>? _sub;

  /// While registering, the profile waits for the name the user typed.
  bool _registering = false;

  void start() {
    _sub?.cancel();
    final auth = AuthService();
    _user = _fromFirebase(auth.currentUser);

    // One signed-in device per account: signing in elsewhere signs this one out.
    DeviceSession.instance.onRevoked = () {
      signOutNotice.value = 'Your account was signed in on another device, so you were signed out here.';
      AuthService().signOut();
    };
    DeviceSession.instance.ready.addListener(_onDeviceReady);
    IncomingCalls.instance.attach();
    _sub = auth.authStateChanges().listen((u) {
      if (u == null) {
        DeviceSession.instance.stop();
        HistoryStore.instance.clear();
      } else {
        DeviceSession.instance.start(u);
      }
      _user = _fromFirebase(u);
      notifyListeners();
    });
  }

  void _onDeviceReady() {
    if (!DeviceSession.instance.ready.value) return;
    _syncProfile();
    HistoryStore.instance.load();
  }

  /// Loads the backend profile, creating it for accounts that don't have one.
  Future<void> _syncProfile() async {
    final u = _user;
    if (u == null || _registering) return;
    try {
      final profile = await UserService().me() ??
          await UserService().createProfile(name: u.name, preferredLanguage: u.preferredLanguage);
      if (profile != null && _user?.id == u.id && profile.preferredLanguage != u.preferredLanguage) {
        AppState.instance.prefs?.setString(_langKey(u.id), profile.preferredLanguage);
        _user = _user!.copyWith(preferredLanguage: profile.preferredLanguage);
        notifyListeners();
      }
    } catch (e) {
      debugPrint('[session] profile sync failed: $e');
    }
  }

  /// Call before creating the account, then [finishRegistration] once the
  /// display name is set, so the profile gets the right name.
  void beginRegistration() => _registering = true;

  Future<void> finishRegistration() async {
    _registering = false;
    refresh();
    // A fresh token carries the new display name to the signaling server.
    await AuthService().currentUser?.getIdToken(true);
    if (DeviceSession.instance.ready.value) await _syncProfile();
  }

  void cancelRegistration() => _registering = false;

  /// Returns the sign-out notice and clears it.
  String? takeSignOutNotice() {
    final notice = signOutNotice.value;
    signOutNotice.value = null;
    return notice;
  }

  /// Re-read the Firebase user (e.g. after setting the display name).
  void refresh() {
    _user = _fromFirebase(AuthService().currentUser);
    notifyListeners();
  }

  void setPreferredLanguage(String code) {
    final u = _user;
    if (u == null) return;
    AppState.instance.prefs?.setString(_langKey(u.id), code);
    _user = u.copyWith(preferredLanguage: code);
    notifyListeners();
    if (DeviceSession.instance.ready.value) {
      UserService().updateLanguage(code).catchError((Object e) => debugPrint('[session] language not saved: $e'));
    }
  }

  void setNameLocally(String name) {
    final u = _user;
    if (u == null) return;
    _user = u.copyWith(name: name);
    notifyListeners();
  }

  Future<void> signOut() async {
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
