import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../config/supported_languages.dart';
import '../../core/formatters.dart';
import '../../core/mock_data.dart';
import '../../core/theme.dart';
import '../../widgets/avatar.dart';

/// Full-screen incoming call.
/// TODO: Connect WebRTC signaling server — opened by a 'call:incoming' socket
/// event (or a push notification on mobile) instead of the notifications list.
class IncomingCallScreen extends StatelessWidget {
  final String contactId;
  const IncomingCallScreen({super.key, required this.contactId});

  @override
  Widget build(BuildContext context) {
    final caller = contactById(contactId);
    return Scaffold(
      backgroundColor: Brand.callBackground,
      body: Stack(
        fit: StackFit.expand,
        children: [
          if (caller.demoPoster != null) ...[
            Image.asset(caller.demoPoster!, fit: BoxFit.cover),
            Container(color: Colors.black.withValues(alpha: 0.6)),
          ],
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
              child: Column(
                children: [
                  const Text('Incoming BoloAI call', style: TextStyle(color: Color(0xFFA8A29E))),
                  const Spacer(),
                  Avatar(name: caller.name, size: 112, ringColor: Brand.marigold400),
                  const SizedBox(height: 18),
                  Text(caller.name, style: AppTheme.serif(42, color: Colors.white)),
                  const SizedBox(height: 6),
                  Text('Speaks ${languageFor(caller.preferredLanguage).label} · ${caller.location ?? ''}',
                      style: const TextStyle(color: Color(0xFFD6D3D1))),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                    decoration: BoxDecoration(color: Brand.ink700.withValues(alpha: 0.6), borderRadius: BorderRadius.circular(999)),
                    child: const Text('Live translation will be on', style: TextStyle(color: Brand.ink100, fontSize: 12)),
                  ),
                  const Spacer(),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _Action(
                        color: Brand.danger,
                        icon: Icons.call_end_rounded,
                        label: 'Decline',
                        onTap: () => context.go('/notifications'),
                      ),
                      _Action(
                        color: Brand.success,
                        icon: Icons.videocam_rounded,
                        label: 'Accept',
                        onTap: () => context.go('/call/${generateRoomCode()}?contact=${caller.id}'),
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
