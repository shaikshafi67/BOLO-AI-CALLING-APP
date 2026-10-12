import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../config/supported_languages.dart';
import '../../core/formatters.dart';
import '../../core/mock_data.dart';
import '../../core/theme.dart';
import '../../models/user.dart';
import '../../services/user_service.dart';
import '../../widgets/avatar.dart';
import '../../widgets/common.dart';

class ContactsScreen extends StatefulWidget {
  final String? initialQuery;
  const ContactsScreen({super.key, this.initialQuery});

  @override
  State<ContactsScreen> createState() => _ContactsScreenState();
}

class _ContactsScreenState extends State<ContactsScreen> {
  // TODO: Connect backend database — contacts endpoints don't exist yet;
  // GET /api/users/search?q= already does people search.
  late List<AppUser> _contacts = [...mockContacts];
  late final _search = TextEditingController(text: widget.initialQuery ?? '');
  bool _onlineOnly = false;

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  List<AppUser> get _visible {
    final q = _search.text.trim().toLowerCase();
    return _contacts
        .where((c) => (!_onlineOnly || c.presence == Presence.online) && (q.isEmpty || c.name.toLowerCase().contains(q) || c.email.toLowerCase().contains(q)))
        .toList();
  }

  void _message(AppUser c) => showToast(context, 'Messaging ${c.firstName} is coming soon.');

  void _viewProfile(AppUser c) {
    showModalBottomSheet<void>(
      context: context,
      builder: (sheet) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Avatar(name: c.name, size: 84, presence: c.presence),
              const SizedBox(height: 12),
              Text(c.name, style: AppTheme.serif(32, color: context.colors.fg)),
              Text(presenceLabels[c.presence]!, style: TextStyle(color: context.colors.muted)),
              const SizedBox(height: 16),
              _row(context, Icons.mail_outline_rounded, 'Email', c.email),
              _row(context, Icons.translate_rounded, 'Preferred language',
                  '${languageFor(c.preferredLanguage).label} · ${languageFor(c.preferredLanguage).nativeName}'),
              _row(context, Icons.place_outlined, 'Location', c.location ?? '—'),
              _row(context, Icons.schedule_rounded, 'Last call', c.lastCallAt == null ? 'No calls yet' : formatRelative(c.lastCallAt!)),
              const SizedBox(height: 16),
              Row(children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      Navigator.of(sheet).pop();
                      _message(c);
                    },
                    icon: const Icon(Icons.chat_bubble_outline_rounded, size: 18),
                    label: const Text('Message'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: () {
                      Navigator.of(sheet).pop();
                      context.go('/start-call?contact=${c.id}');
                    },
                    icon: const Icon(Icons.videocam_rounded),
                    label: Text('Call ${c.firstName}'),
                  ),
                ),
              ]),
            ],
          ),
        ),
      ),
    );
  }

  Widget _row(BuildContext context, IconData icon, String k, String v) => Container(
        margin: const EdgeInsets.only(top: 8),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(color: context.colors.surface2, borderRadius: BorderRadius.circular(10)),
        child: Row(children: [
          Icon(icon, size: 18, color: context.colors.subtle),
          const SizedBox(width: 10),
          SizedBox(width: 130, child: Text(k, style: TextStyle(color: context.colors.muted))),
          Expanded(child: Text(v, style: const TextStyle(fontWeight: FontWeight.w600), overflow: TextOverflow.ellipsis)),
        ]),
      );

  Future<void> _addContact() async {
    final controller = TextEditingController();
    String? error;
    final email = await showDialog<String>(
      context: context,
      builder: (dialog) => StatefulBuilder(
        builder: (dialog, setDialog) => AlertDialog(
          title: const Text('Add a contact'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Invite someone by email. They’ll get a contact request.', style: TextStyle(color: dialog.colors.muted)),
              const SizedBox(height: 14),
              TextField(
                controller: controller,
                autofocus: true,
                keyboardType: TextInputType.emailAddress,
                decoration: InputDecoration(labelText: 'Email address', prefixIcon: const Icon(Icons.mail_outline_rounded), errorText: error),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.of(dialog).pop(), child: const Text('Cancel')),
            FilledButton(
              onPressed: () {
                final v = controller.text.trim();
                if (!emailPattern.hasMatch(v)) return setDialog(() => error = 'Enter a valid email address.');
                if (_contacts.any((c) => c.email.toLowerCase() == v.toLowerCase())) {
                  return setDialog(() => error = 'This person is already in your contacts.');
                }
                Navigator.of(dialog).pop(v);
              },
              child: const Text('Send request'),
            ),
          ],
        ),
      ),
    );
    controller.dispose();
    if (email == null) return;
    final contact = await UserService().addContact(email);
    if (!mounted) return;
    setState(() => _contacts = [contact, ..._contacts]);
    showToast(context, 'Contact request sent to $email.', icon: Icons.check_circle_outline_rounded);
  }

  @override
  Widget build(BuildContext context) {
    final visible = _visible;
    final width = MediaQuery.sizeOf(context).width;
    final columns = width >= 1100 ? 3 : (width >= 700 ? 2 : 1);
    final online = _contacts.where((c) => c.presence == Presence.online).length;

    return ListView(
      padding: EdgeInsets.all(width >= 700 ? 28 : 16),
      children: [
        ContentWidth(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              PageHeader(
                title: 'Contacts',
                subtitle: '${_contacts.length} people · $online online now',
                trailing: width >= 600
                    ? FilledButton.icon(onPressed: _addContact, icon: const Icon(Icons.person_add_alt_rounded), label: const Text('Add contact'))
                    : IconButton.filled(tooltip: 'Add contact', onPressed: _addContact, icon: const Icon(Icons.person_add_alt_rounded)),
              ),
              TextField(
                controller: _search,
                onChanged: (_) => setState(() {}),
                decoration: const InputDecoration(hintText: 'Search contacts by name or email', prefixIcon: Icon(Icons.search_rounded)),
              ),
              const SizedBox(height: 10),
              SegmentedButton<bool>(
                showSelectedIcon: false,
                segments: const [
                  ButtonSegment(value: false, label: Text('All')),
                  ButtonSegment(value: true, label: Text('Online')),
                ],
                selected: {_onlineOnly},
                onSelectionChanged: (s) => setState(() => _onlineOnly = s.first),
              ),
              const SizedBox(height: 16),
              if (visible.isEmpty)
                Card(
                  child: EmptyState(
                    icon: Icons.people_outline_rounded,
                    title: _search.text.isEmpty ? 'No contacts online' : 'No contacts match “${_search.text}”',
                    message: 'Try another search, or add someone new.',
                    action: OutlinedButton.icon(onPressed: _addContact, icon: const Icon(Icons.person_add_alt_rounded), label: const Text('Add contact')),
                  ),
                )
              else
                LayoutBuilder(builder: (context, box) {
                  final itemWidth = (box.maxWidth - (columns - 1) * 12) / columns;
                  return Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: [for (final c in visible) SizedBox(width: itemWidth, child: _ContactCard(contact: c, onMessage: _message, onProfile: _viewProfile))],
                  );
                }),
            ],
          ),
        ),
      ],
    );
  }
}

class _ContactCard extends StatelessWidget {
  final AppUser contact;
  final ValueChanged<AppUser> onMessage;
  final ValueChanged<AppUser> onProfile;
  const _ContactCard({required this.contact, required this.onMessage, required this.onProfile});

  @override
  Widget build(BuildContext context) {
    final c = contact;
    return AppCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Avatar(name: c.name, size: 52, presence: c.presence),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(c.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16), overflow: TextOverflow.ellipsis),
                Text('${presenceLabels[c.presence]}${c.location == null ? '' : ' · ${c.location}'}',
                    style: TextStyle(color: context.colors.muted, fontSize: 12), overflow: TextOverflow.ellipsis),
                const SizedBox(height: 6),
                StatusBadge(languageFor(c.preferredLanguage).label, tone: Tone.brand, icon: Icons.translate_rounded),
              ]),
            ),
          ]),
          const SizedBox(height: 12),
          Row(children: [
            Icon(Icons.schedule_rounded, size: 14, color: context.colors.subtle),
            const SizedBox(width: 5),
            Text(c.lastCallAt == null ? 'No calls yet' : 'Last call ${formatRelative(c.lastCallAt!)}',
                style: TextStyle(color: context.colors.subtle, fontSize: 12)),
          ]),
          const SizedBox(height: 12),
          const Divider(),
          const SizedBox(height: 10),
          Row(children: [
            Expanded(
              child: FilledButton.icon(
                style: FilledButton.styleFrom(minimumSize: const Size(0, 40)),
                onPressed: () => context.go('/start-call?contact=${c.id}'),
                icon: const Icon(Icons.videocam_rounded, size: 18),
                label: const Text('Call'),
              ),
            ),
            const SizedBox(width: 8),
            IconButton.outlined(tooltip: 'Message ${c.firstName}', onPressed: () => onMessage(c), icon: const Icon(Icons.chat_bubble_outline_rounded, size: 18)),
            const SizedBox(width: 4),
            IconButton.outlined(tooltip: 'View ${c.firstName}’s profile', onPressed: () => onProfile(c), icon: const Icon(Icons.person_outline_rounded, size: 18)),
          ]),
        ],
      ),
    );
  }
}
