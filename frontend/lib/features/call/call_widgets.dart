import 'package:flutter/material.dart';
import '../../core/formatters.dart';
import '../../core/theme.dart';
import '../../models/call_history_entry.dart';
import '../../widgets/avatar.dart';
import '../../widgets/common.dart';

/// Shared call-related bits used by the dashboard and history screens.

StatusBadge outcomeBadge(CallOutcome o) => switch (o) {
      CallOutcome.completed => const StatusBadge('Completed', tone: Tone.success, dot: true),
      CallOutcome.missed => const StatusBadge('Missed', tone: Tone.warning, dot: true),
      CallOutcome.declined => const StatusBadge('Declined', dot: true),
      CallOutcome.failed => const StatusBadge('Failed', tone: Tone.danger, dot: true),
    };

/// One call in a list: avatar, name, language pair, date/duration, status.
class CallRow extends StatelessWidget {
  final CallHistoryEntry call;
  final VoidCallback? onTap;
  final Widget? trailing;
  const CallRow({super.key, required this.call, this.onTap, this.trailing});

  @override
  Widget build(BuildContext context) {
    final dir = call.direction == CallDirection.incoming;
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            Avatar(name: call.participantName, size: 42),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(call.participantName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                  const SizedBox(height: 2),
                  Row(children: [
                    Icon(dir ? Icons.call_received_rounded : Icons.call_made_rounded, size: 13, color: context.colors.subtle),
                    const SizedBox(width: 4),
                    Flexible(child: LanguagePairText(from: call.sourceLanguage, to: call.targetLanguage, style: TextStyle(fontSize: 13, color: context.colors.muted))),
                  ]),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                outcomeBadge(call.outcome),
                const SizedBox(height: 4),
                Text(
                  '${formatCallDate(call.timestamp)}${call.duration > Duration.zero ? ' · ${formatDuration(call.duration)}' : ''}',
                  style: TextStyle(fontSize: 12, color: context.colors.subtle, fontFeatures: const [FontFeature.tabularFigures()]),
                ),
              ],
            ),
            ?trailing,
          ],
        ),
      ),
    );
  }
}
