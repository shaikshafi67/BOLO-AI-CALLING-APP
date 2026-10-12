import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/formatters.dart';
import '../../core/theme.dart';
import '../../services/auth_service.dart';
import 'auth_layout.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _authService = AuthService();
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  bool _isLoading = false;
  bool _sent = false;
  String? _errorMessage;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      await _authService.sendPasswordResetEmail(_emailController.text.trim());
      if (mounted) setState(() => _sent = true);
    } on AuthFailure catch (e) {
      setState(() => _errorMessage = e.message);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthLayout(
      title: 'Reset password',
      subtitle: 'Enter your email and we’ll send you a reset link.',
      showBack: true,
      child: _sent
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Brand.success.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Brand.success.withValues(alpha: 0.3)),
                  ),
                  child: Row(children: [
                    const Icon(Icons.mark_email_read_outlined, color: Brand.success),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'If an account exists for ${_emailController.text.trim()}, a reset link is on its way. Check your inbox and spam folder.',
                        style: TextStyle(color: context.colors.fg),
                      ),
                    ),
                  ]),
                ),
                const SizedBox(height: 20),
                FilledButton(onPressed: () => context.go('/login'), child: const Text('Back to login')),
              ],
            )
          : Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (_errorMessage != null) ...[
                    Text(_errorMessage!, style: const TextStyle(color: Brand.danger)),
                    const SizedBox(height: 12),
                  ],
                  TextFormField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    autofillHints: const [AutofillHints.email],
                    onFieldSubmitted: (_) => _submit(),
                    decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.mail_outline_rounded, size: 20)),
                    validator: (v) => emailPattern.hasMatch(v?.trim() ?? '') ? null : 'Enter a valid email address',
                  ),
                  const SizedBox(height: 18),
                  FilledButton(
                    onPressed: _isLoading ? null : _submit,
                    child: _isLoading
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('Send reset link'),
                  ),
                  const SizedBox(height: 8),
                  TextButton(onPressed: () => context.go('/login'), child: const Text('Back to login')),
                ],
              ),
            ),
    );
  }
}
