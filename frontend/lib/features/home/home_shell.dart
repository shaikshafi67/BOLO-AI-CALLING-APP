import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/app_state.dart';
import '../../core/theme.dart';
import '../../services/session.dart';
import '../../widgets/avatar.dart';
import '../../widgets/brand.dart';

class _Dest {
  final String path;
  final String label;
  final IconData icon;
  final IconData selectedIcon;
  const _Dest(this.path, this.label, this.icon, this.selectedIcon);
}

/// Phone bottom bar (the middle slot is a "start call" button).
const _phoneDests = [
  _Dest(
    '/home',
    'Home',
    Icons.space_dashboard_outlined,
    Icons.space_dashboard_rounded,
  ),
  _Dest(
    '/contacts',
    'Contacts',
    Icons.people_outline_rounded,
    Icons.people_rounded,
  ),
  _Dest('/start-call', 'Call', Icons.videocam_outlined, Icons.videocam_rounded),
  _Dest('/history', 'History', Icons.history_rounded, Icons.history_rounded),
  _Dest(
    '/notifications',
    'Alerts',
    Icons.notifications_none_rounded,
    Icons.notifications_rounded,
  ),
];

/// Tablet/desktop side rail: every section.
const _railDests = [
  _Dest(
    '/home',
    'Dashboard',
    Icons.space_dashboard_outlined,
    Icons.space_dashboard_rounded,
  ),
  _Dest(
    '/start-call',
    'Start call',
    Icons.videocam_outlined,
    Icons.videocam_rounded,
  ),
  _Dest('/join-call', 'Join call', Icons.login_rounded, Icons.login_rounded),
  _Dest(
    '/contacts',
    'Contacts',
    Icons.people_outline_rounded,
    Icons.people_rounded,
  ),
  _Dest(
    '/history',
    'Call history',
    Icons.history_rounded,
    Icons.history_rounded,
  ),
  _Dest(
    '/notifications',
    'Notifications',
    Icons.notifications_none_rounded,
    Icons.notifications_rounded,
  ),
  _Dest(
    '/settings',
    'Settings',
    Icons.settings_outlined,
    Icons.settings_rounded,
  ),
  _Dest(
    '/profile',
    'Profile',
    Icons.person_outline_rounded,
    Icons.person_rounded,
  ),
];

/// Wraps every signed-in page except the full-screen call.
class HomeShell extends StatelessWidget {
  final String location;
  final Widget child;
  const HomeShell({super.key, required this.location, required this.child});

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 840;
    return ListenableBuilder(
      listenable: AppState.instance.notifications,
      builder: (context, _) {
        final unread = AppState.instance.notifications.unreadCount;
        return wide ? _wide(context, unread) : _phone(context, unread);
      },
    );
  }

  Widget _badge(IconData icon, int count, bool show) {
    final i = Icon(icon);
    return show && count > 0 ? Badge(label: Text('$count'), child: i) : i;
  }

  Widget _phone(BuildContext context, int unread) {
    final index = _phoneDests.indexWhere((d) => d.path == location);
    return Scaffold(
      appBar: AppBar(
        titleSpacing: 16,
        title: const Logo(size: 30),
        actions: [
          IconButton(
            tooltip: 'Settings',
            icon: const Icon(Icons.settings_outlined),
            onPressed: () => context.go('/settings'),
          ),
          Padding(
            padding: const EdgeInsets.only(right: 12, left: 4),
            child: _ProfileButton(onTap: () => context.go('/profile')),
          ),
        ],
      ),
      body: child,
      bottomNavigationBar: _maybeNoSelection(
        context,
        none: index < 0,
        child: NavigationBar(
          selectedIndex: index < 0 ? 0 : index,
          onDestinationSelected: (i) => context.go(_phoneDests[i].path),
          destinations: [
            for (final d in _phoneDests)
              d.path == '/start-call'
                  ? NavigationDestination(
                      icon: const _CallFab(),
                      selectedIcon: const _CallFab(),
                      label: d.label,
                      tooltip: 'Start a call',
                    )
                  : NavigationDestination(
                      icon: _badge(d.icon, unread, d.path == '/notifications'),
                      selectedIcon: _badge(
                        d.selectedIcon,
                        unread,
                        d.path == '/notifications',
                      ),
                      label: d.label,
                    ),
          ],
        ),
      ),
    );
  }

  /// NavigationBar always marks one tab as selected. On pages without a tab
  /// (Profile, Settings, Join call) render every tab in the unselected style.
  Widget _maybeNoSelection(
    BuildContext context, {
    required bool none,
    required Widget child,
  }) {
    if (!none) return child;
    final theme = Theme.of(context);
    final subtle = context.colors.subtle;
    return Theme(
      data: theme.copyWith(
        navigationBarTheme: theme.navigationBarTheme.copyWith(
          indicatorColor: Colors.transparent,
          iconTheme: WidgetStatePropertyAll(
            IconThemeData(color: subtle, size: 24),
          ),
          labelTextStyle: WidgetStatePropertyAll(
            TextStyle(
              fontFamily: Fonts.sans,
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: subtle,
            ),
          ),
        ),
      ),
      child: child,
    );
  }

  Widget _wide(BuildContext context, int unread) {
    final index = _railDests.indexWhere((d) => d.path == location);
    final extended = MediaQuery.sizeOf(context).width >= 1180;
    return Scaffold(
      body: Row(
        children: [
          NavigationRail(
            extended: extended,
            minExtendedWidth: 232,
            selectedIndex: index < 0 ? null : index,
            onDestinationSelected: (i) => context.go(_railDests[i].path),
            labelType: extended
                ? NavigationRailLabelType.none
                : NavigationRailLabelType.all,
            leading: Padding(
              padding: const EdgeInsets.fromLTRB(8, 20, 8, 20),
              child: extended ? const Logo(size: 32) : const LogoMark(size: 34),
            ),
            trailing: Expanded(
              child: Align(
                alignment: Alignment.bottomCenter,
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: IconButton(
                    tooltip: 'Log out',
                    icon: const Icon(Icons.logout_rounded),
                    onPressed: () => Session.instance.signOut(),
                  ),
                ),
              ),
            ),
            destinations: [
              for (final d in _railDests)
                NavigationRailDestination(
                  icon: _badge(d.icon, unread, d.path == '/notifications'),
                  selectedIcon: _badge(
                    d.selectedIcon,
                    unread,
                    d.path == '/notifications',
                  ),
                  label: Text(d.label),
                ),
            ],
          ),
          VerticalDivider(width: 1, color: context.colors.line),
          Expanded(child: child),
        ],
      ),
    );
  }
}

class _CallFab extends StatelessWidget {
  const _CallFab();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 48,
      height: 36,
      decoration: BoxDecoration(
        color: Brand.ink700,
        borderRadius: BorderRadius.circular(12),
      ),
      child: const Icon(Icons.videocam_rounded, color: Colors.white, size: 22),
    );
  }
}

class _ProfileButton extends StatelessWidget {
  final VoidCallback onTap;
  const _ProfileButton({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: Session.instance,
      builder: (context, _) {
        final user = Session.instance.user;
        return Tooltip(
          message: 'Profile',
          child: InkWell(
            customBorder: const CircleBorder(),
            onTap: onTap,
            child: Avatar(name: user?.name ?? 'You', size: 34, presence: null),
          ),
        );
      },
    );
  }
}
