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
