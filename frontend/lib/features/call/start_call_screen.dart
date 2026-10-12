import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../config/supported_languages.dart';
import '../../core/mock_data.dart';
import '../../core/theme.dart';
import '../../services/call_service.dart';
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

  Future<void> _start() async {
    setState(() => _starting = true);
    final code = await CallService().createRoom();
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
                  for (final c in mockContacts)
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
        const PrototypeNotice(message: 'The call screen is a working UI demo. Real peer-to-peer video starts once the WebRTC signaling server is connected.'),
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
