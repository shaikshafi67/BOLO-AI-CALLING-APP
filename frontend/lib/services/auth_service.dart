import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'device_session.dart';

/// Thin wrapper around FirebaseAuth so the rest of the app depends on this
/// interface, not directly on the Firebase SDK. Translates FirebaseAuthException
/// codes into messages a user can act on.
class AuthService {
  final FirebaseAuth _auth;

  AuthService({FirebaseAuth? auth}) : _auth = auth ?? FirebaseAuth.instance;

  User? get currentUser => _auth.currentUser;

  Stream<User?> authStateChanges() => _auth.authStateChanges();

  Future<User?> signIn({required String email, required String password, bool remember = true}) async {
    try {
      // Web only: "Remember me" off keeps the session for this tab only.
      // Mobile/desktop always persist the session securely on the device.
      if (kIsWeb) {
        await _auth.setPersistence(remember ? Persistence.LOCAL : Persistence.SESSION);
      }
      // This device claims the account, signing out any other device.
      DeviceSession.instance.expectFreshSignIn();
      final credential = await _auth.signInWithEmailAndPassword(email: email, password: password);
      return credential.user;
    } on FirebaseAuthException catch (e) {
      DeviceSession.instance.cancelFreshSignIn();
      throw AuthFailure(_messageFor(e));
    }
  }

  /// Google sign-in: a popup on web, the browser-based Google flow on Android/iOS.
  /// Returns null when the user closes the Google window without choosing.
  /// Needs the Google provider enabled in Firebase Console → Authentication.
  Future<User?> signInWithGoogle({bool remember = true}) async {
    final provider = GoogleAuthProvider()..setCustomParameters({'prompt': 'select_account'});
    try {
      if (kIsWeb) {
        await _auth.setPersistence(remember ? Persistence.LOCAL : Persistence.SESSION);
      }
      DeviceSession.instance.expectFreshSignIn();
      final credential = kIsWeb ? await _auth.signInWithPopup(provider) : await _auth.signInWithProvider(provider);
      return credential.user;
    } on FirebaseAuthException catch (e) {
      DeviceSession.instance.cancelFreshSignIn();
      const cancelled = {'popup-closed-by-user', 'cancelled-popup-request', 'web-context-canceled', 'web-context-cancelled'};
      if (cancelled.contains(e.code)) return null;
      throw AuthFailure(_messageFor(e));
    } on UnimplementedError {
      DeviceSession.instance.cancelFreshSignIn();
      throw AuthFailure('Google sign-in works in the Android app and on the web. Use email here.');
    }
  }

  Future<User?> register({required String email, required String password}) async {
    try {
      DeviceSession.instance.expectFreshSignIn();
      final credential = await _auth.createUserWithEmailAndPassword(email: email, password: password);
      return credential.user;
    } on FirebaseAuthException catch (e) {
      DeviceSession.instance.cancelFreshSignIn();
      throw AuthFailure(_messageFor(e));
    }
  }

  /// Deliberately does not reveal whether [email] is registered — swallows
  /// user-not-found so the UI can show the same "check your inbox" message
  /// either way and avoid leaking which emails have accounts.
  Future<void> sendPasswordResetEmail(String email) async {
    try {
      await _auth.sendPasswordResetEmail(email: email);
    } on FirebaseAuthException catch (e) {
      if (e.code == 'user-not-found') return;
      throw AuthFailure(_messageFor(e));
    }
  }

  Future<void> updateDisplayName(String name) async {
    try {
      await _auth.currentUser?.updateDisplayName(name);
      await _auth.currentUser?.reload();
    } on FirebaseAuthException catch (e) {
      throw AuthFailure(_messageFor(e));
    }
  }

  Future<void> signOut() => _auth.signOut();

  String _messageFor(FirebaseAuthException e) {
    switch (e.code) {
      case 'invalid-email':
        return 'That email address looks invalid.';
      case 'user-disabled':
        return 'This account has been disabled.';
      case 'user-not-found':
      case 'invalid-credential':
      case 'wrong-password':
        return 'Incorrect email or password.';
      case 'email-already-in-use':
        return 'An account already exists for that email.';
      case 'weak-password':
        return 'Choose a stronger password (at least 6 characters).';
      case 'network-request-failed':
        return 'Network error. Check your connection and try again.';
      case 'operation-not-allowed':
        return 'Google sign-in isn’t switched on for BoloAI yet. Use email and password for now.';
      case 'account-exists-with-different-credential':
        return 'This email already has a BoloAI password. Log in with your email and password.';
      case 'popup-blocked':
        return 'Your browser blocked the Google window. Allow pop-ups for this site and try again.';
      case 'unauthorized-domain':
        return 'Google sign-in isn’t allowed on this web address. Add it under Authorized domains in Firebase.';
      case 'too-many-requests':
        return 'Too many attempts. Please wait a moment and try again.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }
}

class AuthFailure implements Exception {
  final String message;
  AuthFailure(this.message);
  @override
  String toString() => message;
}
