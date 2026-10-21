import 'package:flutter/material.dart';
import '../../config/supported_languages.dart';
import '../../core/app_state.dart';
import '../../services/history_store.dart';
import '../../core/theme.dart';
import '../../services/auth_service.dart';
import '../../services/session.dart';
import '../../widgets/avatar.dart';
import '../../widgets/common.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

const _countries = ['India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'United Arab Emirates', 'Singapore', 'Germany'];

class _ProfileScreenState extends State<ProfileScreen> {
  bool _editing = false;
  bool _saving = false;
  late final _name = TextEditingController(text: Session.instance.user?.name ?? '');
  late String _language = Session.instance.user?.preferredLanguage ?? 'hi';
  late String _country = AppState.instance.prefs?.getString('boloai.country') ?? 'India';

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  void _cancel() {
    final u = Session.instance.user;
    setState(() {
      _editing = false;
      _name.text = u?.name ?? '';
      _language = u?.preferredLanguage ?? 'hi';
    });
  }

  Future<void> _save() async {
    final name = _name.text.trim();
    if (name.length < 2) {
      showToast(context, 'Please enter your full name.');
      return;
    }
    setState(() => _saving = true);
    try {
      await AuthService().updateDisplayName(name);
      // The language is also saved to the backend profile (PATCH /api/users/me/language).
      Session.instance
        ..setNameLocally(name)
        ..setPreferredLanguage(_language);
      AppState.instance.prefs?.setString('boloai.country', _country);
      if (!mounted) return;
      setState(() => _editing = false);
      showToast(context, 'Profile saved.', icon: Icons.check_circle_outline_rounded);
    } on AuthFailure catch (e) {
      if (mounted) showToast(context, e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 900;
    return ListenableBuilder(
      listenable: Session.instance,
      builder: (context, _) {
        final user = Session.instance.user;
        if (user == null) return const SizedBox.shrink();
        final lang = languageFor(user.preferredLanguage);

        final summary = Card(
          clipBehavior: Clip.antiAlias,
          child: Column(children: [
            Container(height: 96, color: Brand.ink700),
            Transform.translate(
              offset: const Offset(0, -44),
              child: Column(children: [
                Container(
                  decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: context.colors.surface, width: 4)),
                  child: Avatar(name: user.name, size: 92),
                ),
                const SizedBox(height: 10),
                Text(user.name, style: AppTheme.serif(32, color: context.colors.fg)),
                Text(user.email, style: TextStyle(color: context.colors.muted)),
                const SizedBox(height: 10),
                Wrap(spacing: 8, children: [
                  StatusBadge('${lang.label} speaker', tone: Tone.brand, icon: Icons.translate_rounded),
                  StatusBadge(_country, icon: Icons.public_rounded),
                ]),
                const SizedBox(height: 18),
                const Divider(),
                const SizedBox(height: 14),
                Row(children: [
                  Expanded(child: _stat(context, Icons.call_outlined, 'Total calls', HistoryStore.instance.stats[0].value)),
                  Expanded(child: _stat(context, Icons.schedule_rounded, 'Call minutes', HistoryStore.instance.stats[1].value)),
                ]),
              ]),
            ),
          ]),
        );

        final form = AppCard(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(children: [
                const Expanded(child: Text('Personal information', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600))),
                if (!_editing)
                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(minimumSize: const Size(0, 38)),
                    onPressed: () => setState(() => _editing = true),
                    icon: const Icon(Icons.edit_outlined, size: 16),
                    label: const Text('Edit profile'),
                  ),
              ]),
              const SizedBox(height: 18),
              TextField(
                controller: _name,
                enabled: _editing,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(labelText: 'Full name', prefixIcon: Icon(Icons.person_outline_rounded, size: 20)),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: TextEditingController(text: user.email),
                enabled: false,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  prefixIcon: Icon(Icons.mail_outline_rounded, size: 20),
                  helperText: 'Email changes need verification and will come with the backend.',
                ),
              ),
              const SizedBox(height: 14),
              IgnorePointer(
                ignoring: !_editing,
                child: Opacity(
                  opacity: _editing ? 1 : 0.6,
                  child: LanguageDropdown(
                    key: ValueKey('lang-$_editing-$_language'),
                    label: 'Preferred language',
                    value: _language,
                    onChanged: (v) => setState(() => _language = v),
                  ),
                ),
              ),
              const SizedBox(height: 14),
              IgnorePointer(
                ignoring: !_editing,
                child: Opacity(
                  opacity: _editing ? 1 : 0.6,
                  child: DropdownButtonFormField<String>(
                    key: ValueKey('country-$_editing-$_country'),
                    initialValue: _country,
                    decoration: const InputDecoration(labelText: 'Country', prefixIcon: Icon(Icons.public_rounded, size: 20)),
                    items: [for (final c in _countries) DropdownMenuItem(value: c, child: Text(c))],
                    onChanged: (v) => setState(() => _country = v ?? _country),
                  ),
                ),
              ),
              if (_editing) ...[
                const SizedBox(height: 20),
                Row(mainAxisAlignment: MainAxisAlignment.end, children: [
                  TextButton(onPressed: _cancel, child: const Text('Cancel')),
                  const SizedBox(width: 8),
                  FilledButton.icon(
                    onPressed: _saving ? null : _save,
                    icon: _saving
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.save_outlined, size: 18),
                    label: const Text('Save changes'),
                  ),
                ]),
              ],
            ],
          ),
        );

        return ListView(
          padding: EdgeInsets.all(wide ? 28 : 16),
          children: [
            ContentWidth(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const PageHeader(title: 'Profile', subtitle: 'How other people see you on BoloAI.'),
                  if (wide)
                    Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Expanded(flex: 2, child: summary),
                      const SizedBox(width: 20),
                      Expanded(flex: 3, child: form),
                    ])
                  else ...[
                    summary,
                    const SizedBox(height: 16),
                    form,
                  ],
                  const SizedBox(height: 16),
                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(foregroundColor: Brand.danger),
                    onPressed: () => Session.instance.signOut(),
                    icon: const Icon(Icons.logout_rounded),
                    label: const Text('Log out'),
                  ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _stat(BuildContext context, IconData icon, String label, String value) => Column(children: [
        Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(icon, size: 14, color: context.colors.subtle),
          const SizedBox(width: 4),
          Text(label, style: TextStyle(fontSize: 12, color: context.colors.subtle)),
        ]),
        const SizedBox(height: 2),
        Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
      ]);
}
