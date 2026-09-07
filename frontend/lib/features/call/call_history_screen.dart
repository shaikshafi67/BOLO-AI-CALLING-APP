import 'package:flutter/material.dart';
import '../../core/mock_data.dart';
import '../../models/call_history_entry.dart';

class CallHistoryScreen extends StatelessWidget {
  const CallHistoryScreen({super.key});

  IconData _iconFor(CallDirection direction) {
    switch (direction) {
      case CallDirection.incoming:
        return Icons.call_received;
      case CallDirection.outgoing:
        return Icons.call_made;
      case CallDirection.missed:
        return Icons.call_missed;
    }
  }

  Color _colorFor(BuildContext context, CallDirection direction) {
    if (direction == CallDirection.missed) return Theme.of(context).colorScheme.error;
    return Theme.of(context).colorScheme.primary;
  }

  String _formatDuration(Duration d) {
    if (d == Duration.zero) return 'No answer';
    final minutes = d.inMinutes;
    final seconds = d.inSeconds % 60;
    return '$minutes:${seconds.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Call history')),
      body: mockCallHistory.isEmpty
          ? const Center(child: Text('No calls yet'))
          : ListView.builder(
              itemCount: mockCallHistory.length,
              itemBuilder: (context, i) {
                final entry = mockCallHistory[i];
                return ListTile(
                  leading: Icon(_iconFor(entry.direction), color: _colorFor(context, entry.direction)),
                  title: Text(entry.participantName),
                  subtitle: Text('${entry.timestamp.day}/${entry.timestamp.month} · ${_formatDuration(entry.duration)}'),
                  trailing: IconButton(
                    icon: const Icon(Icons.videocam_outlined),
                    onPressed: () {},
                  ),
                );
              },
            ),
    );
  }
}
