import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../models/user.dart';

class IncomingCallScreen extends StatelessWidget {
  final AppUser caller;
  const IncomingCallScreen({super.key, required this.caller});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
      body: SafeArea(
        child: Column(
          children: [
            const Spacer(flex: 2),
            CircleAvatar(radius: 56, child: Text(caller.name[0], style: const TextStyle(fontSize: 40))),
            const SizedBox(height: 20),
            Text(caller.name, style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 8),
            Text('Incoming BoloAI call…', style: Theme.of(context).textTheme.bodyLarge),
            const Spacer(flex: 3),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 48, vertical: 48),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  FloatingActionButton(
                    heroTag: 'reject',
                    backgroundColor: Theme.of(context).colorScheme.error,
                    onPressed: () => context.pop(),
                    child: const Icon(Icons.call_end, color: Colors.white),
                  ),
                  FloatingActionButton(
                    heroTag: 'accept',
                    backgroundColor: Colors.green,
                    onPressed: () => context.go('/call/active', extra: caller),
                    child: const Icon(Icons.call, color: Colors.white),
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
