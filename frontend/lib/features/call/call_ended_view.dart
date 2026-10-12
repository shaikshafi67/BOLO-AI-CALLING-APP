import 'package:flutter/material.dart';
import '../../core/formatters.dart';
import '../../core/theme.dart';
import '../../models/user.dart';
import '../../widgets/avatar.dart';

/// Shown after "End call": summary, quick rating, rejoin or go home.
class CallEndedView extends StatefulWidget {
  final AppUser contact;
  final Duration duration;
  final int translatedLines;
  final VoidCallback onRejoin;
  final VoidCallback onDone;

  const CallEndedView({
    super.key,
    required this.contact,
    required this.duration,
    required this.translatedLines,
    required this.onRejoin,
    required this.onDone,
  });

  @override
  State<CallEndedView> createState() => _CallEndedViewState();
}

class _CallEndedViewState extends State<CallEndedView> {
  int _rating = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Brand.callBackground,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                children: [
                  Stack(clipBehavior: Clip.none, children: [
                    Avatar(name: widget.contact.name, size: 92),
                    Positioned(
                      right: -4,
                      bottom: -4,
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(color: Brand.danger, shape: BoxShape.circle, border: Border.all(color: Brand.callBackground, width: 3)),
                        child: const Icon(Icons.call_end_rounded, color: Colors.white, size: 18),
                      ),
                    ),
                  ]),
                  const SizedBox(height: 20),
                  Text('Call ended', style: AppTheme.serif(40, color: Colors.white)),
                  const SizedBox(height: 4),
                  Text('Your call with ${widget.contact.name} has ended.', style: const TextStyle(color: Color(0xFFA8A29E))),
                  const SizedBox(height: 24),
                  Row(children: [
                    Expanded(child: _stat(Icons.schedule_rounded, 'Duration', formatDuration(widget.duration))),
                    const SizedBox(width: 12),
                    Expanded(child: _stat(Icons.forum_outlined, 'Translated lines', '${widget.translatedLines}')),
                  ]),
                  const SizedBox(height: 26),
                  const Text('How was the translation quality?', style: TextStyle(color: Color(0xFFD6D3D1))),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      for (var i = 1; i <= 5; i++)
                        IconButton(
                          tooltip: '$i star${i > 1 ? 's' : ''}',
                          onPressed: () => setState(() => _rating = i),
                          icon: Icon(i <= _rating ? Icons.star_rounded : Icons.star_outline_rounded,
                              size: 32, color: i <= _rating ? Brand.marigold400 : const Color(0xFF57534E)),
                        ),
                    ],
                  ),
                  if (_rating > 0) const Text('Thanks for the feedback!', style: TextStyle(color: Color(0xFFA8A29E), fontSize: 12)),
                  const SizedBox(height: 26),
                  Row(children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.white,
                          backgroundColor: Colors.white.withValues(alpha: 0.06),
                          side: const BorderSide(color: Colors.white24),
                        ),
                        onPressed: widget.onRejoin,
                        icon: const Icon(Icons.replay_rounded),
                        label: const Text('Rejoin'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: FilledButton.icon(
                        style: FilledButton.styleFrom(backgroundColor: Brand.ink600),
                        onPressed: widget.onDone,
                        icon: const Icon(Icons.space_dashboard_outlined),
                        label: const Text('Dashboard'),
                      ),
                    ),
                  ]),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _stat(IconData icon, String label, String value) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.05),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white12),
        ),
        child: Column(children: [
          Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            Icon(icon, size: 14, color: const Color(0xFFA8A29E)),
            const SizedBox(width: 5),
            Text(label, style: const TextStyle(color: Color(0xFFA8A29E), fontSize: 12)),
          ]),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w600)),
        ]),
      );
}
