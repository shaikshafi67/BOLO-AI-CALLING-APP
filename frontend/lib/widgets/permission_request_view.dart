import 'package:flutter/material.dart';

/// Shown when a required permission (microphone/camera) has not been
/// granted yet. Actual permission requests are wired up in Phase 5
/// alongside WebRTC — this is the UI shell only.
class PermissionRequestView extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;
  final VoidCallback onGrant;

  const PermissionRequestView({
    super.key,
    required this.icon,
    required this.title,
    required this.description,
    required this.onGrant,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 56, color: Theme.of(context).colorScheme.primary),
            const SizedBox(height: 16),
            Text(title, style: Theme.of(context).textTheme.titleLarge, textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text(description, style: Theme.of(context).textTheme.bodyMedium, textAlign: TextAlign.center),
            const SizedBox(height: 20),
            FilledButton(onPressed: onGrant, child: const Text('Allow')),
          ],
        ),
      ),
    );
  }
}
