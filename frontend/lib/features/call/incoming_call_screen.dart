import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../config/supported_languages.dart';
import '../../core/theme.dart';
import '../../services/call_service.dart';
import '../../services/incoming_calls.dart';
import '../../widgets/avatar.dart';
import '../../widgets/common.dart';

/// Full-screen incoming call, opened by IncomingCalls when a contact rings
/// (`call:incoming`).
class IncomingCallScreen extends StatefulWidget {
  const IncomingCallScreen({super.key});

  @override
  State<IncomingCallScreen> createState() => _IncomingCallScreenState();
}

class _IncomingCallScreenState extends State<IncomingCallScreen> {
  final _incoming = IncomingCalls.instance;
  late final IncomingCall? _call = _incoming.current;
  bool _accepting = false;
  bool _left = false;

  @override
  void initState() {
    super.initState();
    _incoming.addListener(_onChange);
    if (_call == null) {
      // Opened without a ringing call (e.g. a reload): nothing to answer.
      WidgetsBinding.instance.addPostFrameCallback((_) => _leave());
    }
  }

  @override
  void dispose() {
    _incoming.removeListener(_onChange);
    super.dispose();
  }

  /// The caller hung up (or the timeout passed) while this screen was ringing.
  void _onChange() {
    if (_accepting || _call == null || _incoming.current != null) return;
    showToast(context, 'You missed a call from ${_call.callerName}.', icon: Icons.phone_missed_rounded);
    _leave();
  }

  void _leave() {
    if (_left || !mounted) return;
    _left = true;
    context.go('/home');
  }

  Future<void> _accept() async {
    setState(() => _accepting = true);
    try {
      final roomCode = await _incoming.accept();
      if (!mounted) return;
      _left = true;
      context.go('/call/$roomCode');
    } on CallException catch (e) {
      if (!mounted) return;
      showToast(context, e.code == 'not_found' ? 'The call ended before you could join.' : e.message, icon: Icons.error_outline_rounded);
      _leave();
    }
  }

  void _decline() {
    _incoming.decline();
    _leave();
  }

  @override
  Widget build(BuildContext context) {
    final call = _call;
    final name = call?.callerName ?? 'Someone';
    final language = call?.callerLanguage ?? 'en';

    return Scaffold(
      backgroundColor: Brand.callBackground,
      body: Stack(
        fit: StackFit.expand,
        children: [
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
              child: Column(
                children: [
                  const Text('Incoming BoloAI call', style: TextStyle(color: Color(0xFFA8A29E))),
                  const Spacer(),
                  _Pulse(child: Avatar(name: name, size: 112, ringColor: Brand.marigold400)),
                  const SizedBox(height: 18),
                  Text(name, textAlign: TextAlign.center, style: AppTheme.serif(42, color: Colors.white)),
                  const SizedBox(height: 6),
                  Text(
                    'Speaks ${languageFor(language).label}',
                    style: const TextStyle(color: Color(0xFFD6D3D1)),
                  ),
                  const Spacer(),
                  if (_accepting)
                    const Column(children: [
                      SizedBox(width: 28, height: 28, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white)),
                      SizedBox(height: 12),
                      Text('Joining…', style: TextStyle(color: Colors.white)),
                    ])
                  else
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        _Action(
                          color: Brand.danger,
                          icon: Icons.call_end_rounded,
                          label: 'Decline',
                          onTap: _decline,
                        ),
                        _Action(
                          color: Brand.success,
                          icon: Icons.videocam_rounded,
                          label: 'Accept',
                          onTap: _accept,
                        ),
                      ],
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// A gently pulsing ring around the caller's avatar.
class _Pulse extends StatefulWidget {
  final Widget child;
  const _Pulse({required this.child});

  @override
  State<_Pulse> createState() => _PulseState();
}

class _PulseState extends State<_Pulse> with SingleTickerProviderStateMixin {
  late final _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 1400))..repeat();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final t = _controller.value;
        return Stack(alignment: Alignment.center, children: [
          Container(
            width: 112 + 60 * t,
            height: 112 + 60 * t,
            decoration: BoxDecoration(shape: BoxShape.circle, color: Brand.marigold400.withValues(alpha: 0.25 * (1 - t))),
          ),
          child!,
        ]);
      },
      child: widget.child,
    );
  }
}

class _Action extends StatelessWidget {
  final Color color;
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _Action({required this.color, required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      Material(
        color: color,
        shape: const CircleBorder(),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onTap,
          child: SizedBox.square(dimension: 72, child: Icon(icon, color: Colors.white, size: 32, semanticLabel: label)),
        ),
      ),
      const SizedBox(height: 8),
      Text(label, style: const TextStyle(color: Colors.white)),
    ]);
  }
}
