import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../config/supported_languages.dart';
import '../../core/app_state.dart';
import '../../models/user.dart';
import '../../core/theme.dart';
import '../../services/call_service.dart';
import '../../services/history_store.dart';
import '../../services/session.dart';
import '../../widgets/common.dart';
import 'pre_call_widgets.dart';

class StartCallScreen extends StatefulWidget {
  final String? contactId;
  const StartCallScreen({super.key, this.contactId});

  @override
  State<StartCallScreen> createState() => _StartCallScreenState();
}

class _StartCallScreenState extends State<StartCallScreen> {
  late String _contactId = widget.contactId ?? '';
  bool _starting = false;

  /// People to pick from: everyone you've called, plus whoever this call was opened for.
  List<AppUser> get _people {
    final store = HistoryStore.instance;
    final people = [...store.people];
    final picked = store.personById(_contactId);
    if (picked != null && !people.any((p) => p.id == picked.id)) people.insert(0, picked);
    return people;
  }

  @override
  void initState() {
    super.initState();
    // Unknown contact id (e.g. an old link): fall back to "anyone".
    if (_contactId.isNotEmpty && HistoryStore.instance.personById(_contactId) == null) _contactId = '';
  }

  Future<void> _start() async {
    setState(() => _starting = true);
    final String code;
    try {
      final session = await CallService.start(language: AppState.instance.call.myLanguage);
      code = session.roomCode;
      // Ring the chosen contact; if they can't be rung, the room code still works.
      final contact = HistoryStore.instance.personById(_contactId);
      if (contact != null) {
        final problem = await session.invite(contact.id, contact.name);
        if (problem != null && mounted) showToast(context, problem);
      }
    } on CallException catch (e) {
      if (!mounted) return;
      setState(() => _starting = false);
      showToast(context, e.message, icon: Icons.error_outline_rounded);
      return;
    }
    if (!mounted) return;
    setState(() => _starting = false);
    context.go('/call/$code${_contactId.isEmpty ? '' : '?contact=$_contactId'}');
  }

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 900;
    final name = Session.instance.user?.name ?? 'You';

    final preview = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CameraPreviewCard(name: name),
        const SizedBox(height: 10),
        Row(children: [
          const Icon(Icons.verified_user_outlined, size: 16, color: Brand.success),
          const SizedBox(width: 6),
          Expanded(child: Text('Your preview stays on this device. Nothing is recorded.', style: TextStyle(fontSize: 12, color: context.colors.muted))),
        ]),
      ],
    );

    final settings = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('Who are you calling?', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
              const SizedBox(height: 4),
              Text('Optional. You can also share the room code.', style: TextStyle(color: context.colors.muted, fontSize: 13)),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _contactId,
                isExpanded: true,
                decoration: const InputDecoration(prefixIcon: Icon(Icons.person_outline_rounded, size: 20)),
                items: [
                  const DropdownMenuItem(value: '', child: Text('Anyone with the room code')),
                  for (final c in _people)
                    DropdownMenuItem(value: c.id, child: Text('${c.name} · speaks ${languageFor(c.preferredLanguage).label}', overflow: TextOverflow.ellipsis)),
                ],
                onChanged: (v) => setState(() => _contactId = v ?? ''),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        const AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Language settings', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
              SizedBox(height: 14),
              CallLanguageSettings(),
            ],
          ),
        ),
        const SizedBox(height: 16),
        FilledButton.icon(
          onPressed: _starting ? null : _start,
          icon: _starting
              ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Icon(Icons.videocam_rounded),
          label: const Text('Start Call'),
        ),
        const SizedBox(height: 14),
        const PrototypeNotice(
          title: 'Live translation.',
          message: 'Works in Chrome and Edge. Speak in short sentences; each one is translated when you pause.',
        ),
      ],
    );

    return ListView(
      padding: EdgeInsets.all(wide ? 28 : 16),
      children: [
        ContentWidth(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const PageHeader(title: 'Start a call', subtitle: 'Check your camera and mic, choose your languages, then start.'),
              if (wide)
                Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Expanded(flex: 3, child: preview),
                  const SizedBox(width: 24),
                  Expanded(flex: 2, child: settings),
                ])
              else ...[
                preview,
                const SizedBox(height: 16),
                settings,
              ],
            ],
          ),
        ),
      ],
    );
  }
}
