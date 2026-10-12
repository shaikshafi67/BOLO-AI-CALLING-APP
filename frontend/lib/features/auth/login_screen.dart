import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/formatters.dart';
import '../../core/theme.dart';
import '../../services/auth_service.dart';
import '../../services/session.dart';
import '../../widgets/common.dart';
import 'auth_layout.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _authService = AuthService();
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _remember = true;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    // e.g. "Your account was signed in on another device…"
    _errorMessage = Session.instance.takeSignOutNotice();
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await _authService.signIn(email: _emailController.text.trim(), password: _passwordController.text, remember: _remember);
      if (!mounted) return;
      context.go('/home');
    } on AuthFailure catch (e) {
      setState(() => _errorMessage = e.message);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthLayout(
      title: 'Welcome back',
      subtitle: 'Log in to continue your conversations.',
      child: Form(
        key: _formKey,
        child: AutofillGroup(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              OutlinedButton.icon(
                onPressed: () => showToast(context, 'Google sign-in will be available once it’s enabled in Firebase. Use email for now.'),
                icon: const Text('G', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: Color(0xFF4285F4))),
                label: const Text('Continue with Google'),
              ),
              const SizedBox(height: 18),
              Row(children: [
                const Expanded(child: Divider()),
                Padding(padding: const EdgeInsets.symmetric(horizontal: 12), child: Text('or', style: TextStyle(color: context.colors.subtle))),
                const Expanded(child: Divider()),
              ]),
              const SizedBox(height: 18),
              if (_errorMessage != null) ...[
                _ErrorBanner(_errorMessage!),
                const SizedBox(height: 14),
              ],
              TextFormField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                autofillHints: const [AutofillHints.email],
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.mail_outline_rounded, size: 20)),
                validator: (value) => emailPattern.hasMatch(value?.trim() ?? '') ? null : 'Enter a valid email address',
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _passwordController,
                obscureText: _obscurePassword,
                autofillHints: const [AutofillHints.password],
                textInputAction: TextInputAction.done,
                onFieldSubmitted: (_) => _submit(),
                decoration: InputDecoration(
                  labelText: 'Password',
                  prefixIcon: const Icon(Icons.lock_outline_rounded, size: 20),
                  suffixIcon: IconButton(
                    tooltip: _obscurePassword ? 'Show password' : 'Hide password',
                    icon: Icon(_obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                    onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                  ),
                ),
                validator: (value) => (value == null || value.length < 6) ? 'Password must be at least 6 characters' : null,
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  Checkbox(value: _remember, onChanged: (v) => setState(() => _remember = v ?? true)),
                  GestureDetector(
                    onTap: () => setState(() => _remember = !_remember),
                    child: Text('Remember me', style: TextStyle(color: context.colors.muted)),
                  ),
                  const Spacer(),
                  TextButton(onPressed: () => context.push('/forgot-password'), child: const Text('Forgot password?')),
                ],
              ),
              const SizedBox(height: 10),
              FilledButton(
                onPressed: _isLoading ? null : _submit,
                child: _isLoading
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Login'),
              ),
              const SizedBox(height: 16),
              Wrap(
                alignment: WrapAlignment.center,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  Text('Don’t have an account?', style: TextStyle(color: context.colors.muted)),
                  TextButton(onPressed: () => context.go('/register'), child: const Text('Create account')),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  final String message;
  const _ErrorBanner(this.message);

  @override
  Widget build(BuildContext context) {
    return Semantics(
      liveRegion: true,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Brand.danger.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: Brand.danger.withValues(alpha: 0.3)),
        ),
        child: Row(children: [
          const Icon(Icons.error_outline_rounded, color: Brand.danger, size: 18),
          const SizedBox(width: 8),
          Expanded(child: Text(message, style: const TextStyle(color: Brand.danger))),
        ]),
      ),
    );
  }
}
