import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../config/supported_languages.dart';
import '../../models/user.dart';

/// Active call UI shell. Video feeds, captions, and translation status are
/// placeholders here — wired to flutter_webrtc streams and the AI pipeline
/// in Phase 5 (calling) and Phase 6 (AI).
class ActiveCallScreen extends StatefulWidget {
  final AppUser participant;
  const ActiveCallScreen({super.key, required this.participant});

  @override
  State<ActiveCallScreen> createState() => _ActiveCallScreenState();
}

class _ActiveCallScreenState extends State<ActiveCallScreen> {
  bool _micOn = true;
  bool _cameraOn = true;
  bool _speakerOn = true;
  bool _translationOn = true;
  String _sourceLanguage = 'en';
  late String _targetLanguage;
  String _caption = '';
  Timer? _captionTimer;

  static const _demoCaptions = [
    'Hello, how are you today?',
    'I\'m doing great, thanks for asking.',
    'Let\'s talk about the project.',
  ];
  int _captionIndex = 0;

  @override
  void initState() {
    super.initState();
    _targetLanguage = widget.participant.preferredLanguage;
    _captionTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      setState(() {
        _caption = _demoCaptions[_captionIndex % _demoCaptions.length];
        _captionIndex++;
      });
    });
  }

  @override
  void dispose() {
    _captionTimer?.cancel();
    super.dispose();
  }

  String _langLabel(String code) =>
      supportedLanguages.firstWhere((l) => l.code == code, orElse: () => supportedLanguages.first).label;

  void _endCall() {
    context.go('/home');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Stack(
          children: [
            // Remote video placeholder
            Positioned.fill(
              child: Container(
                color: const Color(0xFF1B1B2F),
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      CircleAvatar(radius: 48, child: Text(widget.participant.name[0], style: const TextStyle(fontSize: 36))),
                      const SizedBox(height: 12),
                      Text(widget.participant.name, style: const TextStyle(color: Colors.white, fontSize: 20)),
                    ],
                  ),
                ),
              ),
            ),

            // Top bar: connection + language status
            Positioned(
              top: 12,
              left: 12,
              right: 12,
              child: Row(
                children: [
                  const Icon(Icons.signal_cellular_alt, color: Colors.greenAccent, size: 18),
                  const SizedBox(width: 4),
                  const Text('Connected', style: TextStyle(color: Colors.white70, fontSize: 12)),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.black45,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Text(
                      '${_langLabel(_sourceLanguage)} → ${_langLabel(_targetLanguage)}',
                      style: const TextStyle(color: Colors.white, fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),

            // Local video (self) preview
            Positioned(
              top: 48,
              right: 16,
              child: Container(
                width: 100,
                height: 140,
                decoration: BoxDecoration(
                  color: const Color(0xFF2E2E44),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white24),
                ),
                child: _cameraOn
                    ? const Center(child: Icon(Icons.person, color: Colors.white38, size: 40))
                    : const Center(child: Icon(Icons.videocam_off, color: Colors.white38, size: 28)),
              ),
            ),

            // Live captions
            if (_translationOn && _caption.isNotEmpty)
              Positioned(
                bottom: 130,
                left: 16,
                right: 16,
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.black54,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(_caption, style: const TextStyle(color: Colors.white70, fontSize: 13)),
                      const SizedBox(height: 4),
                      Text(
                        '[translated to ${_langLabel(_targetLanguage)}]',
                        style: const TextStyle(color: Colors.white38, fontSize: 11, fontStyle: FontStyle.italic),
                      ),
                    ],
                  ),
                ),
              ),

            // Call controls
            Positioned(
              bottom: 24,
              left: 16,
              right: 16,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _ControlButton(
                    icon: _micOn ? Icons.mic : Icons.mic_off,
                    active: _micOn,
                    onPressed: () => setState(() => _micOn = !_micOn),
                  ),
                  _ControlButton(
                    icon: _cameraOn ? Icons.videocam : Icons.videocam_off,
                    active: _cameraOn,
                    onPressed: () => setState(() => _cameraOn = !_cameraOn),
                  ),
                  _ControlButton(
                    icon: _speakerOn ? Icons.volume_up : Icons.volume_off,
                    active: _speakerOn,
                    onPressed: () => setState(() => _speakerOn = !_speakerOn),
                  ),
                  _ControlButton(
                    icon: Icons.translate,
                    active: _translationOn,
                    onPressed: () => setState(() => _translationOn = !_translationOn),
                  ),
                  FloatingActionButton(
                    heroTag: 'end',
                    backgroundColor: Theme.of(context).colorScheme.error,
                    onPressed: _endCall,
                    child: const Icon(Icons.call_end, color: Colors.white),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ControlButton extends StatelessWidget {
  final IconData icon;
  final bool active;
  final VoidCallback onPressed;

  const _ControlButton({required this.icon, required this.active, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return CircleAvatar(
      radius: 24,
      backgroundColor: active ? Colors.white24 : Colors.white10,
      child: IconButton(
        icon: Icon(icon, color: Colors.white),
        onPressed: onPressed,
      ),
    );
  }
}
