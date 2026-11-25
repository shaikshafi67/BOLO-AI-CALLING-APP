import 'dart:ui' show PlatformDispatcher;
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../config/supported_languages.dart';
import '../../core/app_state.dart';
import '../../core/formatters.dart';
import '../../core/theme.dart';
import '../../services/auth_service.dart';
import '../../services/session.dart';
import '../../widgets/common.dart';
import 'auth_layout.dart';

/// Sign-up: Google in one tap, or name, email and password.
class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _authService = AuthService();
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  late String _preferredLanguage = _deviceLanguage();
  bool _showPassword = false;
  bool _isLoading = false;
  bool _googleLoading = false;
  bool _emailTaken = false;
  String? _errorMessage;

  /// The phone's language, if BoloAI supports it (else English).
  static String _deviceLanguage() {
    for (final locale in PlatformDispatcher.instance.locales) {
      if (supportedLanguages.any((l) => l.code == locale.languageCode)) return locale.languageCode;
    }
    return 'en';
  }

  @override
  void initState() {
    super.initState();
    _passwordController.addListener(() => setState(() {}));
    _emailController.addListener(() {
      if (_emailTaken) setState(() => _emailTaken = false);
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
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

    final name = _nameController.text.trim();
    Session.instance.beginRegistration();
    try {
      await _authService.register(email: _emailController.text.trim(), password: _passwordController.text);
      await _authService.updateDisplayName(name);
      Session.instance.setPreferredLanguage(_preferredLanguage);
      AppState.instance.call.update(myLanguage: _preferredLanguage);
      // Creates the backend profile (POST /api/users) with this name and language.
      await Session.instance.finishRegistration();
      if (!mounted) return;
      showToast(context, 'Welcome to BoloAI, ${name.split(RegExp(r'\s+')).first}!', icon: Icons.waving_hand_outlined);
      context.go('/home');
    } on AuthFailure catch (e) {
      Session.instance.cancelRegistration();
      setState(() {
        if (e.code == 'email-already-in-use') {
          _emailTaken = true;
          _formKey.currentState!.validate();
        } else {
          _errorMessage = e.message;
        }
      });
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _google() async {
    setState(() {
      _isLoading = true;
      _googleLoading = true;
      _errorMessage = null;
    });
    try {
      final user = await _authService.signInWithGoogle();
      if (user == null || !mounted) return;
      showToast(context, 'Welcome to BoloAI!', icon: Icons.waving_hand_outlined);
      context.go('/home');
    } on AuthFailure catch (e) {
      if (mounted) setState(() => _errorMessage = e.message);
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _googleLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final strength = passwordStrength(_passwordController.text);
    const labels = ['', 'Okay', 'Good', 'Strong'];
    const colors = [Brand.danger, Brand.warning, Brand.ink500, Brand.success];
    final missing = minPasswordLength - _passwordController.text.length;

    return AuthLayout(
      title: 'Create your account',
      subtitle: 'Talk to anyone, in your own language. It takes a few seconds.',
      showBack: true,
      child: Form(
        key: _formKey,
        autovalidateMode: AutovalidateMode.onUserInteraction,
        child: AutofillGroup(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SizedBox(
                height: 52,
                child: FilledButton.icon(
                  onPressed: _isLoading ? null : _google,
                  icon: _googleLoading
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Container(
                          width: 24,
                          height: 24,
                          alignment: Alignment.center,
                          decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                          child: const Text('G', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Color(0xFF4285F4))),
                        ),
                  label: const Text('Continue with Google', style: TextStyle(fontSize: 16)),
                ),
              ),
              const SizedBox(height: 6),
              Text('Fastest: no password to remember.',
                  textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: context.colors.subtle)),
              const SizedBox(height: 18),
              Row(children: [
                const Expanded(child: Divider()),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Text('or sign up with email', style: TextStyle(fontSize: 12, color: context.colors.subtle)),
                ),
                const Expanded(child: Divider()),
              ]),
              const SizedBox(height: 18),
              if (_errorMessage != null) ...[
                Text(_errorMessage!, style: const TextStyle(color: Brand.danger, fontWeight: FontWeight.w500)),
                const SizedBox(height: 14),
              ],
              TextFormField(
                controller: _nameController,
                textCapitalization: TextCapitalization.words,
                autofillHints: const [AutofillHints.name],
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(labelText: 'Your name', prefixIcon: Icon(Icons.person_outline_rounded, size: 20)),
                validator: (v) => (v == null || v.trim().length < 2) ? 'Enter your name' : null,
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                autofillHints: const [AutofillHints.email],
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.mail_outline_rounded, size: 20)),
                validator: (v) {
                  if (!emailPattern.hasMatch(v?.trim() ?? '')) return 'Enter a valid email address';
                  if (_emailTaken) return 'This email already has an account';
                  return null;
                },
              ),
              if (_emailTaken)
                Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton(onPressed: () => context.go('/login'), child: const Text('Log in instead')),
                ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _passwordController,
                obscureText: !_showPassword,
                autofillHints: const [AutofillHints.newPassword],
                textInputAction: TextInputAction.done,
                onFieldSubmitted: (_) => _submit(),
                decoration: InputDecoration(
                  labelText: 'Password',
                  hintText: 'At least $minPasswordLength characters',
                  prefixIcon: const Icon(Icons.lock_outline_rounded, size: 20),
                  suffixIcon: IconButton(
                    tooltip: _showPassword ? 'Hide password' : 'Show password',
                    icon: Icon(_showPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined),
                    onPressed: () => setState(() => _showPassword = !_showPassword),
                  ),
                ),
                validator: (v) => (v ?? '').length < minPasswordLength ? 'Use at least $minPasswordLength characters' : null,
              ),
              if (_passwordController.text.isNotEmpty) ...[
                const SizedBox(height: 10),
                Row(children: [
                  for (var i = 1; i <= 3; i++)
                    Expanded(
                      child: Container(
                        height: 5,
                        margin: const EdgeInsets.only(right: 4),
                        decoration: BoxDecoration(
                          color: i <= strength ? colors[strength] : context.colors.line,
                          borderRadius: BorderRadius.circular(3),
                        ),
                      ),
                    ),
                  const SizedBox(width: 6),
                  Text(strength == 0 ? '$missing more characters' : labels[strength],
                      style: TextStyle(fontSize: 12, color: context.colors.muted)),
                ]),
              ],
              const SizedBox(height: 14),
              LanguageDropdown(
                label: 'Language you speak',
                value: _preferredLanguage,
                onChanged: (v) => setState(() => _preferredLanguage = v),
              ),
              const SizedBox(height: 4),
              Text('We picked this from your phone. You can change it any time.',
                  style: TextStyle(fontSize: 12, color: context.colors.subtle)),
              const SizedBox(height: 18),
              FilledButton(
                onPressed: _isLoading ? null : _submit,
                child: _isLoading && !_googleLoading
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Create account'),
              ),
              const SizedBox(height: 10),
              Text('By creating an account, you agree to the Terms and Privacy Policy.',
                  textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: context.colors.subtle)),
              const SizedBox(height: 8),
              Wrap(
                alignment: WrapAlignment.center,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  Text('Already have an account?', style: TextStyle(color: context.colors.muted)),
                  TextButton(onPressed: () => context.go('/login'), child: const Text('Log in')),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
