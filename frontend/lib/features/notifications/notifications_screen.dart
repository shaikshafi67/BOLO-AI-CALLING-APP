import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/app_state.dart';
import '../../core/formatters.dart';
import '../../core/theme.dart';
import '../../models/app_notification.dart';
import '../../widgets/common.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  bool _unreadOnly = false;
  final _store = AppState.instance.notifications;

  (IconData, Color) _style(NotificationKind k) => switch (k) {
        NotificationKind.incomingCall => (Icons.phone_callback_rounded, Brand.success),
        NotificationKind.callEnded => (Icons.call_end_rounded, context.colors.muted),
        NotificationKind.missedCall => (Icons.phone_missed_rounded, Brand.danger),
        NotificationKind.system => (Icons.campaign_outlined, context.brand),
        NotificationKind.contactRequest => (Icons.person_add_alt_rounded, const Color(0xFF0369A1)),
      };

  List<Widget> _actions(AppNotification n) => switch (n.kind) {
        NotificationKind.incomingCall => [
            FilledButton.icon(
              style: FilledButton.styleFrom(backgroundColor: Brand.success, minimumSize: const Size(0, 38)),
              onPressed: () {
                _store.markRead(n.id);
                context.go('/incoming');
              },
              icon: const Icon(Icons.videocam_rounded, size: 18),
              label: const Text('Answer'),
            ),
            OutlinedButton(
              style: OutlinedButton.styleFrom(minimumSize: const Size(0, 38)),
              onPressed: () {
                _store.remove(n.id);
                showToast(context, 'Call declined.');
              },
              child: const Text('Decline'),
            ),
          ],
        NotificationKind.contactRequest => [
            FilledButton(
              style: FilledButton.styleFrom(minimumSize: const Size(0, 38)),
              onPressed: () {
                _store.remove(n.id);
                showToast(context, 'Contact added.', icon: Icons.check_circle_outline_rounded);
              },
              child: const Text('Accept'),
            ),
            TextButton(onPressed: () => _store.remove(n.id), child: const Text('Ignore')),
          ],
        NotificationKind.missedCall => [
            OutlinedButton.icon(
              style: OutlinedButton.styleFrom(minimumSize: const Size(0, 38)),
              onPressed: () => context.go('/start-call?contact=${n.contactId}'),
              icon: const Icon(Icons.videocam_outlined, size: 18),
              label: const Text('Call back'),
            ),
          ],
        _ => [],
      };

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 700;
    return ListenableBuilder(
      listenable: _store,
      builder: (context, _) {
        final items = _unreadOnly ? _store.items.where((n) => !n.read).toList() : _store.items;
        final unread = _store.unreadCount;
        return ListView(
          padding: EdgeInsets.all(wide ? 28 : 16),
          children: [
            ContentWidth(
              maxWidth: 760,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  PageHeader(
                    title: 'Notifications',
                    subtitle: unread == 0 ? 'You’re all caught up.' : 'You have $unread unread notification${unread == 1 ? '' : 's'}.',
                  ),
                  Row(children: [
                    SegmentedButton<bool>(
                      showSelectedIcon: false,
                      segments: [
                        ButtonSegment(value: false, label: Text('All (${_store.items.length})')),
                        ButtonSegment(value: true, label: Text('Unread ($unread)')),
                      ],
                      selected: {_unreadOnly},
                      onSelectionChanged: (s) => setState(() => _unreadOnly = s.first),
                    ),
                    const Spacer(),
                    TextButton.icon(
                      onPressed: unread == 0 ? null : _store.markAllRead,
                      icon: const Icon(Icons.done_all_rounded, size: 18),
                      label: const Text('Mark all read'),
                    ),
                  ]),
                  const SizedBox(height: 14),
                  Card(
                    clipBehavior: Clip.antiAlias,
                    child: items.isEmpty
                        ? EmptyState(
                            icon: Icons.notifications_off_outlined,
                            title: 'No notifications',
                            message: _unreadOnly ? 'You’ve read everything.' : 'New activity will show up here.',
                          )
                        : Column(children: [
                            for (var i = 0; i < items.length; i++) ...[
                              if (i > 0) const Divider(),
                              _tile(items[i]),
                            ],
                          ]),
                  ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _tile(AppNotification n) {
    final (icon, color) = _style(n.kind);
    final actions = _actions(n);
    return Dismissible(
      key: ValueKey(n.id),
      direction: DismissDirection.endToStart,
      background: Container(
        color: Brand.danger,
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        child: const Icon(Icons.delete_outline_rounded, color: Colors.white),
      ),
      onDismissed: (_) => _store.remove(n.id),
      child: InkWell(
        onTap: () => _store.markRead(n.id),
        child: Container(
          color: n.read ? null : context.brand.withValues(alpha: 0.05),
          padding: const EdgeInsets.fromLTRB(16, 14, 8, 14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12)),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      if (!n.read) ...[
                        Container(width: 7, height: 7, decoration: BoxDecoration(color: context.brand, shape: BoxShape.circle)),
                        const SizedBox(width: 6),
                      ],
                      Expanded(
                        child: Text(n.title,
                            style: TextStyle(fontWeight: n.read ? FontWeight.w500 : FontWeight.w700, color: n.read ? context.colors.muted : context.colors.fg)),
                      ),
                      Text(formatRelative(n.createdAt), style: TextStyle(fontSize: 12, color: context.colors.subtle)),
                    ]),
                    const SizedBox(height: 3),
                    Text(n.message, style: TextStyle(color: context.colors.muted, fontSize: 14)),
                    if (actions.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      Wrap(spacing: 8, runSpacing: 8, children: actions),
                    ],
                  ],
                ),
              ),
              IconButton(
                tooltip: 'Remove notification',
                icon: Icon(Icons.close_rounded, size: 18, color: context.colors.subtle),
                onPressed: () => _store.remove(n.id),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
