import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/app_state.dart';
import '../../core/formatters.dart';
import '../../core/theme.dart';
import '../../services/auth_service.dart';
import '../../services/session.dart';
import '../../widgets/common.dart';
import 'auth_layout.dart';

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
  final _confirmController = TextEditingController();
  String _preferredLanguage = 'hi';
  bool _acceptedTerms = false;
  bool _showPassword = false;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _passwordController.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  int get _score => passwordRules.where((r) => r.test(_passwordController.text)).length;

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_acceptedTerms) {
      setState(() => _errorMessage = 'Please accept the Terms and Privacy Policy to continue.');
      return;
    }
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await _authService.register(email: _emailController.text.trim(), password: _passwordController.text);
      await _authService.updateDisplayName(_nameController.text.trim());
      Session.instance
        ..refresh()
        ..setPreferredLanguage(_preferredLanguage);
      AppState.instance.call.update(myLanguage: _preferredLanguage);
      // TODO: Connect backend database — POST /api/users { name, preferredLanguage }
      // once the backend's Firebase Admin keys are configured (see UserService).
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
    final score = _score;
    const strength = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const strengthColors = [Brand.danger, Brand.danger, Brand.warning, Brand.ink500, Brand.success];

    return AuthLayout(
      title: 'Create your account',
      subtitle: 'Start talking to anyone, in your own language.',
      showBack: true,
      child: Form(
        key: _formKey,
        child: AutofillGroup(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (_errorMessage != null) ...[
                Text(_errorMessage!, style: const TextStyle(color: Brand.danger, fontWeight: FontWeight.w500)),
                const SizedBox(height: 14),
              ],
              TextFormField(
                controller: _nameController,
                textCapitalization: TextCapitalization.words,
                autofillHints: const [AutofillHints.name],
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(labelText: 'Full name', prefixIcon: Icon(Icons.person_outline_rounded, size: 20)),
                validator: (v) => (v == null || v.trim().length < 2) ? 'Please enter your full name' : null,
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                autofillHints: const [AutofillHints.email],
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.mail_outline_rounded, size: 20)),
                validator: (v) => emailPattern.hasMatch(v?.trim() ?? '') ? null : 'Enter a valid email address',
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _passwordController,
                obscureText: !_showPassword,
                autofillHints: const [AutofillHints.newPassword],
                textInputAction: TextInputAction.next,
                decoration: InputDecoration(
                  labelText: 'Password',
                  prefixIcon: const Icon(Icons.lock_outline_rounded, size: 20),
                  suffixIcon: IconButton(
                    tooltip: _showPassword ? 'Hide password' : 'Show password',
                    icon: Icon(_showPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined),
                    onPressed: () => setState(() => _showPassword = !_showPassword),
                  ),
                ),
                validator: (v) => score < passwordRules.length ? 'Password doesn’t meet all the requirements' : null,
              ),
              if (_passwordController.text.isNotEmpty) ...[
                const SizedBox(height: 10),
                Row(children: [
                  for (var i = 0; i < passwordRules.length; i++)
                    Expanded(
                      child: Container(
                        height: 5,
                        margin: const EdgeInsets.only(right: 4),
                        decoration: BoxDecoration(
                          color: i < score ? strengthColors[score] : context.colors.line,
                          borderRadius: BorderRadius.circular(3),
                        ),
                      ),
                    ),
                  const SizedBox(width: 6),
                  Text(strength[score], style: TextStyle(fontSize: 12, color: context.colors.muted)),
                ]),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 14,
                  runSpacing: 4,
                  children: [
                    for (final r in passwordRules)
                      Row(mainAxisSize: MainAxisSize.min, children: [
                        Icon(r.test(_passwordController.text) ? Icons.check_rounded : Icons.close_rounded,
                            size: 14, color: r.test(_passwordController.text) ? Brand.success : context.colors.subtle),
                        const SizedBox(width: 4),
                        Text(r.label,
                            style: TextStyle(fontSize: 12, color: r.test(_passwordController.text) ? Brand.success : context.colors.subtle)),
                      ]),
                  ],
                ),
              ],
              const SizedBox(height: 14),
              TextFormField(
                controller: _confirmController,
                obscureText: !_showPassword,
                textInputAction: TextInputAction.done,
                decoration: const InputDecoration(labelText: 'Confirm password', prefixIcon: Icon(Icons.lock_outline_rounded, size: 20)),
                validator: (v) => (v == null || v.isEmpty || v != _passwordController.text) ? 'Passwords don’t match' : null,
              ),
              const SizedBox(height: 14),
              LanguageDropdown(
                label: 'Preferred language',
                value: _preferredLanguage,
                onChanged: (v) => setState(() => _preferredLanguage = v),
              ),
              const SizedBox(height: 4),
              Text('You’ll speak and hear this language on calls. You can change it later.',
                  style: TextStyle(fontSize: 12, color: context.colors.subtle)),
              const SizedBox(height: 8),
              CheckboxListTile(
                contentPadding: EdgeInsets.zero,
                controlAffinity: ListTileControlAffinity.leading,
                value: _acceptedTerms,
                onChanged: (v) => setState(() => _acceptedTerms = v ?? false),
                title: Text('I agree to the Terms and Privacy Policy', style: TextStyle(fontSize: 14, color: context.colors.muted)),
              ),
              const SizedBox(height: 8),
              FilledButton(
                onPressed: _isLoading ? null : _submit,
                child: _isLoading
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Create Account'),
              ),
              const SizedBox(height: 14),
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
