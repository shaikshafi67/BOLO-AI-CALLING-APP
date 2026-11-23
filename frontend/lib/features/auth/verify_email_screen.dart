import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import '../../services/api_client.dart';
import '../../services/session.dart';
import '../../services/verification_service.dart';
import '../../widgets/common.dart';
import 'auth_layout.dart';

/// One-time email check after creating an account: enter the 6-digit code we
/// emailed. Shown until it's done, even if the app is closed and reopened.
class VerifyEmailScreen extends StatefulWidget {
  const VerifyEmailScreen({super.key});

  @override
  State<VerifyEmailScreen> createState() => _VerifyEmailScreenState();
}

class _VerifyEmailScreenState extends State<VerifyEmailScreen> {
  final _service = VerificationService();
  final _code = TextEditingController();
  String? _error;
  bool _verifying = false;
  bool _sending = false;
  int _wait = 0;
  Timer? _timer;

  String get _email => Session.instance.user?.email ?? 'your email';

  @override
  void initState() {
    super.initState();
    Session.instance.verifyScreenOpen = true;
    _send(first: true);
  }

  @override
  void dispose() {
    Session.instance.verifyScreenOpen = false;
    _timer?.cancel();
    _code.dispose();
    super.dispose();
  }

  Future<void> _send({bool first = false}) async {
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      _startCountdown(await _service.send());
      if (mounted && !first) showToast(context, 'New code sent to $_email.', icon: Icons.mark_email_read_outlined);
    } catch (e) {
      final retry = e is ApiException ? (e.body['retryInSeconds'] as num?)?.toInt() : null;
      if (retry != null) _startCountdown(retry);
      // Arriving within a minute of the first email: the code already sent still works.
      if (mounted && !(first && retry != null)) setState(() => _error = VerificationService.describe(e));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  void _startCountdown(int seconds) {
    _timer?.cancel();
    setState(() => _wait = seconds);
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) return t.cancel();
      setState(() => _wait--);
      if (_wait <= 0) t.cancel();
    });
  }

  Future<void> _verify() async {
    final code = _code.text.trim();
    if (!RegExp(r'^\d{6}$').hasMatch(code)) {
      setState(() => _error = 'Enter the 6-digit code from the email.');
      return;
    }
    setState(() {
      _verifying = true;
      _error = null;
    });
    try {
      await _service.verify(code);
      Session.instance.markVerified();
      if (!mounted) return;
      showToast(context, 'Email verified. Welcome to BoloAI!', icon: Icons.check_circle_outline_rounded);
      context.go('/home');
    } catch (e) {
      if (mounted) {
        setState(() => _error = VerificationService.describe(e));
        _code.clear();
      }
    } finally {
      if (mounted) setState(() => _verifying = false);
    }
  }

  /// Back: sign out and return to sign-up (they verify the next time they log in).
  Future<void> _back() async {
    await Session.instance.signOut();
    if (mounted) context.go('/register');
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _back();
      },
      child: _build(context),
    );
  }

  Widget _build(BuildContext context) {
    return AuthLayout(
      showBack: true,
      onBack: _back,
      title: 'Verify your email',
      subtitle: 'We sent a 6-digit code to $_email. Enter it to finish creating your account.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: context.brand.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(12)),
            child: Row(children: [
              Icon(Icons.mark_email_unread_outlined, color: context.brand, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text('Can’t find it? Check your spam or promotions folder. The code expires in 10 minutes.',
                    style: TextStyle(fontSize: 13, color: context.colors.fg)),
              ),
            ]),
          ),
          const SizedBox(height: 18),
          if (_error != null) ...[
            Text(_error!, style: const TextStyle(color: Brand.danger)),
            const SizedBox(height: 12),
          ],
          TextField(
            controller: _code,
            autofocus: true,
            keyboardType: TextInputType.number,
            // Phones can fill the code from the email; browsers would show a password popup instead.
            autofillHints: kIsWeb ? null : const [AutofillHints.oneTimeCode],
            enableSuggestions: false,
            autocorrect: false,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(6)],
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 26, letterSpacing: 10, fontWeight: FontWeight.w600),
            onChanged: (_) => setState(() => _error = null),
            onSubmitted: (_) => _verify(),
            decoration: const InputDecoration(hintText: '6-digit code', counterText: ''),
          ),
          const SizedBox(height: 18),
          FilledButton(
            onPressed: _verifying || _code.text.length != 6 ? null : _verify,
            child: _verifying
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Text('Verify email'),
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              TextButton.icon(
                onPressed: _sending || _wait > 0 ? null : () => _send(),
                icon: _sending
                    ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.refresh_rounded, size: 18),
                label: Text(_wait > 0 ? 'Send a new code in ${_wait}s' : 'Send a new code'),
              ),
              TextButton(
                onPressed: () => Session.instance.signOut(),
                child: Text('Use a different account', style: TextStyle(color: context.colors.muted)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
