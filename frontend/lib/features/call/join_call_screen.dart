import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import '../../core/app_state.dart';
import '../../core/formatters.dart';
import '../../services/call_service.dart';
import '../../services/session.dart';
import '../../widgets/common.dart';
import 'pre_call_widgets.dart';

class JoinCallScreen extends StatefulWidget {
  const JoinCallScreen({super.key});

  @override
  State<JoinCallScreen> createState() => _JoinCallScreenState();
}

class _JoinCallScreenState extends State<JoinCallScreen> {
  final _codeController = TextEditingController();
  String? _error;
  bool _joining = false;

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _join() async {
    final code = normalizeRoomCode(_codeController.text);
    if (!roomCodePattern.hasMatch(code)) {
      setState(() => _error = 'Room codes look like BOLO-4829.');
      return;
    }
    setState(() {
      _error = null;
      _joining = true;
    });
    if (!kDemoMode) {
      try {
        await CallService.join(code, language: AppState.instance.call.myLanguage);
      } on CallException catch (e) {
        if (!mounted) return;
        setState(() {
          _joining = false;
          _error = e.message;
        });
        return;
      }
    }
    if (!mounted) return;
    setState(() => _joining = false);
    context.go('/call/$code');
  }

  Future<void> _paste() async {
    final data = await Clipboard.getData(Clipboard.kTextPlain);
    final code = normalizeRoomCode(data?.text ?? '');
    if (!mounted) return;
    _codeController.text = code;
    setState(() => _error = roomCodePattern.hasMatch(code) ? null : 'Clipboard doesn’t contain a valid room code.');
  }

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 900;
    final name = Session.instance.user?.name ?? 'You';

    final form = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextField(
                controller: _codeController,
                textCapitalization: TextCapitalization.characters,
                autocorrect: false,
                onSubmitted: (_) => _join(),
                style: const TextStyle(fontSize: 18, letterSpacing: 1.5, fontWeight: FontWeight.w600),
                decoration: InputDecoration(
                  labelText: 'Call ID / Room code',
                  hintText: 'BOLO-4829',
                  prefixIcon: const Icon(Icons.tag_rounded, size: 20),
                  errorText: _error,
                ),
              ),
              const SizedBox(height: 14),
              Row(children: [
                Expanded(
                  child: FilledButton.icon(
                    onPressed: _joining ? null : _join,
                    icon: _joining
                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.login_rounded),
                    label: const Text('Join Call'),
                  ),
                ),
                const SizedBox(width: 10),
                OutlinedButton.icon(onPressed: _paste, icon: const Icon(Icons.content_paste_rounded, size: 18), label: const Text('Paste')),
              ]),
            ],
          ),
        ),
        const SizedBox(height: 14),
        const AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Your languages', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
              SizedBox(height: 14),
              CallLanguageSettings(showToggles: false),
            ],
          ),
        ),
        const SizedBox(height: 14),
        const PrototypeNotice(message: 'Ask the person calling you for their room code. AI translation and captions are coming soon.'),
      ],
    );

    return ListView(
      padding: EdgeInsets.all(wide ? 28 : 16),
      children: [
        ContentWidth(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const PageHeader(title: 'Join a BoloAI call', subtitle: 'Enter the room code you received to join the conversation.'),
              if (wide)
                Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Expanded(flex: 3, child: CameraPreviewCard(name: name, showSpeaker: false)),
                  const SizedBox(width: 24),
                  Expanded(flex: 2, child: form),
                ])
              else ...[
                form,
                const SizedBox(height: 16),
                CameraPreviewCard(name: name, showSpeaker: false),
              ],
            ],
          ),
        ),
      ],
    );
  }
}
