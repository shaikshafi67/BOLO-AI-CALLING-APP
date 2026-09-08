import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/mock_data.dart';
import '../../services/auth_service.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // TODO(Phase 4): replace mockCurrentUser with the real profile fetched
    // from the backend, keyed by AuthService().currentUser!.uid.
    final user = mockCurrentUser;
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Center(
            child: CircleAvatar(radius: 40, child: Text(user.name[0], style: const TextStyle(fontSize: 32))),
          ),
          const SizedBox(height: 12),
          Center(child: Text(user.name, style: Theme.of(context).textTheme.titleLarge)),
          Center(child: Text(AuthService().currentUser?.email ?? user.email, style: Theme.of(context).textTheme.bodyMedium)),
          const SizedBox(height: 24),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.language),
            title: const Text('Language settings'),
            subtitle: Text('Preferred: ${user.preferredLanguage.toUpperCase()}'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/settings/language'),
          ),
          ListTile(
            leading: const Icon(Icons.settings_outlined),
            title: const Text('Settings'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/settings'),
          ),
          const Divider(),
          ListTile(
            leading: Icon(Icons.logout, color: Theme.of(context).colorScheme.error),
            title: Text('Log out', style: TextStyle(color: Theme.of(context).colorScheme.error)),
            onTap: () async {
              await AuthService().signOut();
              if (context.mounted) context.go('/login');
            },
          ),
        ],
      ),
    );
  }
}
