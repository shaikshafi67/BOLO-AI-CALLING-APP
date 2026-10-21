import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/app_state.dart';
import '../../core/theme.dart';
import '../../services/auth_service.dart';
import '../../services/session.dart';
import '../../widgets/common.dart';
import '../call/pre_call_widgets.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _prefs = AppState.instance.prefs;
  bool _get(String key, bool fallback) => _prefs?.getBool('boloai.pref.$key') ?? fallback;
  void _set(String key, bool value) => setState(() => _prefs?.setBool('boloai.pref.$key', value));

  String _getS(String key, String fallback) => _prefs?.getString('boloai.pref.$key') ?? fallback;
  void _setS(String key, String value) => setState(() => _prefs?.setString('boloai.pref.$key', value));

  Future<void> _resetPassword() async {
    final email = Session.instance.user?.email;
    if (email == null || email.isEmpty) {
      showToast(context, 'Password reset is available when signed in with Firebase.');
      return;
    }
    try {
      await AuthService().sendPasswordResetEmail(email);
      if (mounted) showToast(context, 'Password reset email sent to $email.', icon: Icons.mark_email_read_outlined);
    } on AuthFailure catch (e) {
      if (mounted) showToast(context, e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 700;
    final theme = AppState.instance.theme;

    return ListView(
      padding: EdgeInsets.all(wide ? 28 : 16),
      children: [
        ContentWidth(
          maxWidth: 760,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const PageHeader(title: 'Settings', subtitle: 'Preferences are saved on this device.'),

              _Section(
                icon: Icons.person_outline_rounded,
                title: 'Account',
                children: [
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Email'),
                    subtitle: Text(Session.instance.user?.email ?? ''),
                    trailing: TextButton(onPressed: () => context.go('/profile'), child: const Text('Edit profile')),
                  ),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Password'),
                    subtitle: const Text('We’ll email you a secure link to set a new one.'),
                    trailing: TextButton(onPressed: _resetPassword, child: const Text('Reset')),
                  ),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.logout_rounded, color: Brand.danger),
                    title: const Text('Log out', style: TextStyle(color: Brand.danger)),
                    onTap: () => Session.instance.signOut(),
                  ),
                ],
              ),

              _Section(
                icon: Icons.videocam_outlined,
                title: 'Audio & video',
                children: [
                  _deviceDropdown('Microphone', Icons.mic_none_rounded, 'mic', const ['System default', 'Built-in microphone', 'Headset microphone']),
                  const SizedBox(height: 12),
                  _deviceDropdown('Speaker', Icons.volume_up_outlined, 'speaker', const ['System default', 'Phone speaker', 'Headphones']),
                  const SizedBox(height: 12),
                  _deviceDropdown('Camera', Icons.videocam_outlined, 'camera', const ['Front camera', 'Back camera']),
                  const SizedBox(height: 6),
                  Text('Device lists will come from the system once WebRTC media is connected.', style: TextStyle(fontSize: 12, color: context.colors.subtle)),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Noise suppression'),
                    subtitle: const Text('Reduce background noise before speech recognition'),
                    value: _get('noise', true),
                    onChanged: (v) => _set('noise', v),
                  ),
                ],
              ),

              _Section(
                icon: Icons.translate_rounded,
                title: 'Translation',
                children: [
                  const CallLanguageSettings(),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: TextButton(
                      onPressed: () {
                        AppState.instance.call.reset();
                        showToast(context, 'Call settings reset to defaults.');
                      },
                      child: const Text('Reset to defaults'),
                    ),
                  ),
                ],
              ),

              _Section(
                icon: Icons.notifications_none_rounded,
                title: 'Notifications',
                children: [
                  _switch('Incoming calls', 'Ring and notify for new calls', 'nCalls', true),
                  _switch('Missed calls', 'Tell me when I miss a call', 'nMissed', true),
                  _switch('Contact requests', 'When someone wants to add me', 'nContacts', true),
                ],
              ),

              _Section(
                icon: Icons.shield_outlined,
                title: 'Privacy',
                children: [
                  _switch('Show when I’m online', 'Contacts can see your online status', 'online', true),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Save call transcripts'),
                    subtitle: const Padding(padding: EdgeInsets.only(top: 4), child: Align(alignment: Alignment.centerLeft, child: ComingSoonTag())),
                    value: _get('transcripts', false),
                    onChanged: (v) => _set('transcripts', v),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: context.colors.surface2, borderRadius: BorderRadius.circular(10)),
                    child: Text(
                      'Video and original audio are planned to travel peer-to-peer over encrypted WebRTC. Only audio needed for translation is sent to the AI services, and transcripts store text only, never raw audio.',
                      style: TextStyle(fontSize: 12, color: context.colors.muted),
                    ),
                  ),
                ],
              ),

              _Section(
                icon: Icons.palette_outlined,
                title: 'Appearance',
                children: [
                  ListenableBuilder(
                    listenable: theme,
                    builder: (context, _) => SegmentedButton<ThemeMode>(
                      segments: const [
                        ButtonSegment(value: ThemeMode.light, icon: Icon(Icons.light_mode_outlined), label: Text('Light')),
                        ButtonSegment(value: ThemeMode.dark, icon: Icon(Icons.dark_mode_outlined), label: Text('Dark')),
                        ButtonSegment(value: ThemeMode.system, icon: Icon(Icons.brightness_auto_outlined), label: Text('System')),
                      ],
                      selected: {theme.mode},
                      onSelectionChanged: (s) => theme.setMode(s.first),
                    ),
                  ),
                ],
              ),

              _Section(
                icon: Icons.language_rounded,
                title: 'App language',
                children: [
                  LanguageDropdown(
                    label: 'Interface language',
                    value: _getS('uiLanguage', 'en'),
                    allowPlanned: true,
                    onChanged: (v) {
                      _setS('uiLanguage', v);
                      if (v != 'en') showToast(context, 'Interface translations are planned. The app stays in English for now.');
                    },
                  ),
                  const SizedBox(height: 6),
                  Text('Separate from your call languages above.', style: TextStyle(fontSize: 12, color: context.colors.subtle)),
                ],
              ),

              const SizedBox(height: 8),
              Center(child: Text('BoloAI 1.0.0 · University capstone project', style: TextStyle(color: context.colors.subtle, fontSize: 12))),
            ],
          ),
        ),
      ],
    );
  }

  Widget _switch(String title, String subtitle, String key, bool fallback) => SwitchListTile(
        contentPadding: EdgeInsets.zero,
        title: Text(title),
        subtitle: Text(subtitle),
        value: _get(key, fallback),
        onChanged: (v) => _set(key, v),
      );

  Widget _deviceDropdown(String label, IconData icon, String key, List<String> options) => DropdownButtonFormField<String>(
        initialValue: options.contains(_getS(key, options.first)) ? _getS(key, options.first) : options.first,
        decoration: InputDecoration(labelText: label, prefixIcon: Icon(icon, size: 20)),
        items: [for (final o in options) DropdownMenuItem(value: o, child: Text(o))],
        onChanged: (v) => _setS(key, v ?? options.first),
      );
}

class _Section extends StatelessWidget {
  final IconData icon;
  final String title;
  final List<Widget> children;
  const _Section({required this.icon, required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: AppCard(
        padding: const EdgeInsets.fromLTRB(18, 16, 18, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(children: [
              Icon(icon, size: 20, color: context.brand),
              const SizedBox(width: 10),
              Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600)),
            ]),
            const SizedBox(height: 12),
            ...children,
          ],
        ),
      ),
    );
  }
}
