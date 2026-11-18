import 'package:firebase_auth/firebase_auth.dart';
import 'api_client.dart';

/// One-time email verification after sign-up
/// (backend/src/routes/verification.routes.ts): new email/password accounts
/// enter a 6-digit code we email them before using the app.
class VerificationService {
  /// Whether this account still has to verify its email.
  Future<bool> needsVerification() async {
    final r = await ApiClient.get('/api/verification') as Map;
    return r['required'] == true && r['verified'] != true;
  }

  /// Emails a code. Returns seconds until another one can be sent.
  Future<int> send() async {
    final r = await ApiClient.post('/api/verification/send', const {}) as Map?;
    return (r?['resendInSeconds'] as num?)?.toInt() ?? 60;
  }

  /// Checks the code, then refreshes the sign-in so it carries the verified email.
  Future<void> verify(String code) async {
    await ApiClient.post('/api/verification/verify', {'code': code});
    final user = FirebaseAuth.instance.currentUser;
    await user?.reload();
    await user?.getIdToken(true);
  }

  static String describe(Object e) {
    if (e is! ApiException) return 'Something went wrong. Please try again.';
    return switch (e.code) {
      'wrong_code' => switch (e.body['attemptsLeft']) {
          final num left when left > 0 => 'That code isn’t right. ${left.toInt()} ${left == 1 ? 'try' : 'tries'} left.',
          _ => 'That code isn’t right.',
        },
      'code_expired' => 'This code has expired. Send a new one.',
      'too_many_attempts' => 'Too many wrong codes. Send a new one.',
      'too_soon' => 'Please wait a minute before asking for another code.',
      'email_failed' => 'We couldn’t send the email. Try again in a minute.',
      'unreachable' => 'Can’t reach the BoloAI server. Check your connection and try again.',
      _ => 'Something went wrong. Please try again.',
    };
  }
}
