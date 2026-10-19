import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../config/supported_languages.dart';
import '../../core/formatters.dart';
import '../../core/mock_data.dart';
import '../../core/theme.dart';
import '../../models/user.dart';
import '../../services/api_client.dart';
import '../../services/history_store.dart';
import '../../services/session.dart';
import '../../services/user_service.dart';
import '../../widgets/avatar.dart';
import '../../widgets/common.dart';

class ContactsScreen extends StatefulWidget {
  final String? initialQuery;
  const ContactsScreen({super.key, this.initialQuery});

  @override
  State<ContactsScreen> createState() => _ContactsScreenState();
}

/// Your contacts are the people you've had calls with (from call history).
/// Searching also looks up everyone registered on BoloAI (GET /api/users/search).
class _ContactsScreenState extends State<ContactsScreen> {
  final _store = HistoryStore.instance;
  List<AppUser> _demoContacts = [...mockContacts];
  List<AppUser> get _contacts => kDemoMode ? _demoContacts : _store.people;
  late final _search = TextEditingController(text: widget.initialQuery ?? '');
  bool _onlineOnly = false;

  Timer? _debounce;
  List<AppUser> _found = const [];
  bool _searching = false;
  String? _searchError;

  @override
  void initState() {
    super.initState();
    _store.addListener(_onStore);
    if (_search.text.isNotEmpty) _lookUp();
  }

  @override
  void dispose() {
    _store.removeListener(_onStore);
    _debounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  void _onStore() {
    if (mounted) setState(() {});
  }

  void _onQueryChanged(String _) {
    setState(() {});
    if (kDemoMode) return;
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), _lookUp);
  }

  Future<void> _lookUp() async {
    final q = _search.text.trim();
    if (q.length < 2) {
      setState(() {
        _found = const [];
        _searchError = null;
      });
      return;
    }
    setState(() => _searching = true);
    try {
      final results = await UserService().search(q);
      if (!mounted || _search.text.trim() != q) return;
      results.forEach(_store.remember);
      setState(() {
        _found = results;
        _searchError = null;
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _searchError = e.code == 'unreachable' ? 'Can’t reach the BoloAI server.' : 'Search failed (${e.code}).');
    } finally {
      if (mounted) setState(() => _searching = false);
    }
  }

  /// Search results who aren't already in your contacts.
  List<AppUser> get _others {
    final known = _contacts.map((c) => c.id).toSet();
    return _found.where((u) => !known.contains(u.id)).toList();
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
              Avatar(name: c.name, size: 84, presence: kDemoMode ? c.presence : null),
              const SizedBox(height: 12),
              Text(c.name, style: AppTheme.serif(32, color: context.colors.fg)),
              if (kDemoMode) Text(presenceLabels[c.presence]!, style: TextStyle(color: context.colors.muted)),
              const SizedBox(height: 16),
              if (c.email.isNotEmpty) _row(context, Icons.mail_outline_rounded, 'Email', c.email),
              _row(context, Icons.translate_rounded, 'Preferred language',
                  '${languageFor(c.preferredLanguage).label} · ${languageFor(c.preferredLanguage).nativeName}'),
              if (kDemoMode) _row(context, Icons.place_outlined, 'Location', c.location ?? '—'),
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
    final contact = await UserService.demoContact(email);
    if (!mounted) return;
    setState(() => _demoContacts = [contact, ..._demoContacts]);
    showToast(context, 'Contact request sent to $email.', icon: Icons.check_circle_outline_rounded);
  }

  @override
  Widget build(BuildContext context) {
    final visible = _visible;
    final width = MediaQuery.sizeOf(context).width;
    final columns = width >= 1100 ? 3 : (width >= 700 ? 2 : 1);
    final online = _contacts.where((c) => c.presence == Presence.online).length;
    final others = _others;
    final query = _search.text.trim();
    final searchable = !kDemoMode && query.length >= 2;

    return ListView(
      padding: EdgeInsets.all(width >= 700 ? 28 : 16),
      children: [
        ContentWidth(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              PageHeader(
                title: 'Contacts',
                subtitle: kDemoMode ? '${_contacts.length} people · $online online now' : '${_contacts.length} people you’ve talked to',
                trailing: !kDemoMode
                    ? null
                    : width >= 600
                    ? FilledButton.icon(onPressed: _addContact, icon: const Icon(Icons.person_add_alt_rounded), label: const Text('Add contact'))
                    : IconButton.filled(tooltip: 'Add contact', onPressed: _addContact, icon: const Icon(Icons.person_add_alt_rounded)),
              ),
              TextField(
                controller: _search,
                onChanged: _onQueryChanged,
                decoration: InputDecoration(
                  hintText: kDemoMode ? 'Search contacts by name or email' : 'Search contacts, or find anyone on BoloAI by name',
                  prefixIcon: const Icon(Icons.search_rounded),
                  suffixIcon: _searching
                      ? const Padding(padding: EdgeInsets.all(14), child: SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)))
                      : null,
                ),
              ),
              if (kDemoMode) ...[
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
              ],
              const SizedBox(height: 16),
              if (_searchError != null) ...[
                Text(_searchError!, style: const TextStyle(color: Brand.danger, fontSize: 13)),
                const SizedBox(height: 10),
              ],
              if (visible.isEmpty && !(searchable && others.isNotEmpty))
                Card(
                  child: kDemoMode
                      ? EmptyState(
                          icon: Icons.people_outline_rounded,
                          title: _search.text.isEmpty ? 'No contacts online' : 'No contacts match “${_search.text}”',
                          message: 'Try another search, or add someone new.',
                          action: OutlinedButton.icon(onPressed: _addContact, icon: const Icon(Icons.person_add_alt_rounded), label: const Text('Add contact')),
                        )
                      : EmptyState(
                          icon: Icons.people_outline_rounded,
                          title: query.isEmpty
                              ? 'No contacts yet'
                              : _searching
                                  ? 'Searching…'
                                  : 'No one matches “$query”',
                          message: query.isEmpty
                              ? 'People you have calls with appear here. Search above to find anyone on BoloAI.'
                              : 'Check the spelling, or search by their name as they registered it.',
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
              if (searchable && others.isNotEmpty) ...[
                const SizedBox(height: 22),
                Text('Others on BoloAI', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16, color: context.colors.fg)),
                const SizedBox(height: 10),
                LayoutBuilder(builder: (context, box) {
                  final itemWidth = (box.maxWidth - (columns - 1) * 12) / columns;
                  return Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: [for (final c in others) SizedBox(width: itemWidth, child: _ContactCard(contact: c, onMessage: _message, onProfile: _viewProfile))],
                  );
                }),
              ],
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
            Avatar(name: c.name, size: 52, presence: kDemoMode ? c.presence : null),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(c.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16), overflow: TextOverflow.ellipsis),
                Text(kDemoMode ? '${presenceLabels[c.presence]}${c.location == null ? '' : ' · ${c.location}'}' : c.email.isNotEmpty ? c.email : 'Speaks ${languageFor(c.preferredLanguage).label}',
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
