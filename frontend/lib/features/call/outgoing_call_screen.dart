import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../models/user.dart';

class OutgoingCallScreen extends StatefulWidget {
  final AppUser callee;
  const OutgoingCallScreen({super.key, required this.callee});

  @override
  State<OutgoingCallScreen> createState() => _OutgoingCallScreenState();
}

class _OutgoingCallScreenState extends State<OutgoingCallScreen> {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    // TODO(Phase 5): replace with real signaling — send call:offer, wait for
    // call:accept / call:reject instead of a fixed simulated delay.
    _timer = Timer(const Duration(seconds: 3), () {
      if (mounted) context.go('/call/active', extra: widget.callee);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
      body: SafeArea(
        child: Column(
          children: [
            const Spacer(flex: 2),
            CircleAvatar(radius: 56, child: Text(widget.callee.name[0], style: const TextStyle(fontSize: 40))),
            const SizedBox(height: 20),
            Text(widget.callee.name, style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 8),
            Text('Calling…', style: Theme.of(context).textTheme.bodyLarge),
            const Spacer(flex: 3),
            Padding(
              padding: const EdgeInsets.only(bottom: 48),
              child: FloatingActionButton(
                heroTag: 'cancel',
                backgroundColor: Theme.of(context).colorScheme.error,
                onPressed: () => context.pop(),
                child: const Icon(Icons.call_end, color: Colors.white),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
