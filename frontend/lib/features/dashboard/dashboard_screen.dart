import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../config/supported_languages.dart';
import '../../core/app_state.dart';
import '../../core/formatters.dart';
import '../../core/media.dart';
import '../../core/mock_data.dart';
import '../../core/theme.dart';
import '../../models/user.dart';
import '../../services/session.dart';
import '../../widgets/avatar.dart';
import '../../widgets/common.dart';
import '../call/call_widgets.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 700;
    final online = mockContacts.where((c) => c.presence == Presence.online).toList();

    return ListView(
      padding: EdgeInsets.fromLTRB(wide ? 28 : 16, wide ? 28 : 8, wide ? 28 : 16, 32),
      children: [
        ContentWidth(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              ListenableBuilder(
                listenable: Listenable.merge([Session.instance, AppState.instance.call]),
                builder: (context, _) {
                  final name = Session.instance.user?.firstName ?? 'there';
                  final call = AppState.instance.call;
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('${greeting()}, $name', style: AppTheme.serif(wide ? 46 : 38, color: context.colors.fg)),
                      const SizedBox(height: 6),
                      Text('Ready to connect without language barriers?', style: TextStyle(color: context.colors.muted, fontSize: 15)),
                      const SizedBox(height: 10),
                      StatusBadge(
                        'Default: ${languageFor(call.myLanguage).label} → ${languageFor(call.targetLanguage).label}',
                        tone: Tone.brand,
                        icon: Icons.translate_rounded,
                      ),
                    ],
                  );
                },
              ),
              const SizedBox(height: 22),
              _ActionCards(wide: wide),
              const SizedBox(height: 22),
              _StatsGrid(wide: wide),
              const SizedBox(height: 22),
              if (wide)
                IntrinsicHeight(
                  child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    const Expanded(flex: 3, child: _WeeklyChart()),
                    const SizedBox(width: 16),
                    Expanded(flex: 2, child: _OnlineNow(contacts: online)),
                  ]),
                )
              else ...[
                const _WeeklyChart(),
                const SizedBox(height: 16),
                _OnlineNow(contacts: online),
              ],
              const SizedBox(height: 22),
              _RecentCalls(),
              const SizedBox(height: 20),
              const PrototypeNotice(
                title: 'Sample data.',
                message: 'Statistics and call history here are mock data until the BoloAI backend database is connected.',
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ActionCards extends StatelessWidget {
  final bool wide;
  const _ActionCards({required this.wide});

  @override
  Widget build(BuildContext context) {
    final start = Semantics(
      button: true,
      label: 'Start a new call',
      child: Material(
        color: Brand.ink800,
        borderRadius: BorderRadius.circular(14),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () => context.go('/start-call'),
          child: SizedBox(
            height: 200,
            child: Stack(
              fit: StackFit.expand,
              children: [
                Align(
                  alignment: Alignment.centerRight,
                  child: FractionallySizedBox(
                    widthFactor: 0.62,
                    heightFactor: 1,
                    child: Image.asset(Media.family, fit: BoxFit.cover, alignment: const Alignment(-0.3, 0)),
                  ),
                ),
                const DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Brand.ink800, Brand.ink800, Color(0xCC1B2C74), Color(0x221B2C74)],
                      stops: [0, 0.38, 0.55, 1],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.videocam_rounded, color: Brand.marigold300),
                      const Spacer(),
                      const Text('Start a new call', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w600)),
                      const SizedBox(height: 4),
                      const SizedBox(
                        width: 190,
                        child: Text('Create a room, pick your languages and invite someone.',
                            style: TextStyle(color: Colors.white70, fontSize: 13, height: 1.35)),
                      ),
                      const SizedBox(height: 10),
                      Row(children: const [
                        Text('Start now', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                        SizedBox(width: 6),
                        Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 18),
                      ]),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );

    final join = AppCard(
      onTap: () => context.go('/join-call'),
      padding: const EdgeInsets.all(20),
      child: SizedBox(
        height: wide ? 160 : null,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Icons.login_rounded, color: context.brand),
            SizedBox(height: wide ? 0 : 14),
            if (wide) const Spacer(),
            const Text('Join a call', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w600)),
            const SizedBox(height: 4),
            Text.rich(
              TextSpan(children: [
                const TextSpan(text: 'Have a room code like '),
                TextSpan(text: 'BOLO-4829', style: TextStyle(fontWeight: FontWeight.w600, color: context.colors.fg, fontFamily: 'monospace')),
                const TextSpan(text: '? Jump right in.'),
              ]),
              style: TextStyle(color: context.colors.muted, fontSize: 13),
            ),
            const SizedBox(height: 10),
            Row(children: [
              Text('Enter code', style: TextStyle(color: context.brand, fontWeight: FontWeight.w600)),
              const SizedBox(width: 6),
              Icon(Icons.arrow_forward_rounded, color: context.brand, size: 18),
            ]),
          ],
        ),
      ),
    );

    if (wide) {
      return Row(children: [Expanded(flex: 4, child: start), const SizedBox(width: 16), Expanded(flex: 3, child: join)]);
    }
    return Column(children: [start, const SizedBox(height: 12), join]);
  }
}

class _StatsGrid extends StatelessWidget {
  final bool wide;
  const _StatsGrid({required this.wide});

  static const _icons = [Icons.call_outlined, Icons.schedule_rounded, Icons.translate_rounded, Icons.closed_caption_outlined];

  @override
  Widget build(BuildContext context) {
    final cards = [
      for (var i = 0; i < mockStats.length; i++)
        AppCard(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                Expanded(child: Text(mockStats[i].label, style: TextStyle(color: context.colors.muted, fontSize: 13))),
                Icon(_icons[i], size: 18, color: context.brand),
              ]),
              const SizedBox(height: 10),
              Text(mockStats[i].value, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w700, letterSpacing: -0.5)),
              const SizedBox(height: 4),
              Row(children: [
                Icon(
                  mockStats[i].trend > 0 ? Icons.trending_up_rounded : mockStats[i].trend < 0 ? Icons.trending_down_rounded : Icons.remove_rounded,
                  size: 15,
                  color: mockStats[i].trend > 0 ? Brand.success : mockStats[i].trend < 0 ? Brand.warning : context.colors.subtle,
                ),
                const SizedBox(width: 4),
                Expanded(child: Text(mockStats[i].change, style: TextStyle(fontSize: 12, color: context.colors.muted), overflow: TextOverflow.ellipsis)),
              ]),
            ],
          ),
        ),
    ];
    final perRow = wide ? 4 : 2;
    return Column(
      children: [
        for (var r = 0; r < cards.length; r += perRow) ...[
          if (r > 0) const SizedBox(height: 12),
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (var i = r; i < r + perRow && i < cards.length; i++) ...[
                  if (i > r) const SizedBox(width: 12),
                  Expanded(child: cards[i]),
                ],
              ],
            ),
          ),
        ],
      ],
    );
  }
}

/// Single-series bar chart: tap or hover a bar to see its value.
class _WeeklyChart extends StatefulWidget {
  const _WeeklyChart();

  @override
  State<_WeeklyChart> createState() => _WeeklyChartState();
}

class _WeeklyChartState extends State<_WeeklyChart> {
  int? _selected;
  static const _days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  @override
  Widget build(BuildContext context) {
    final total = mockWeeklyMinutes.reduce((a, b) => a + b);
    const ceiling = 100;
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Call minutes this week', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
          const SizedBox(height: 2),
          Text(_selected == null ? '$total minutes total' : '${_days[_selected!]}: ${mockWeeklyMinutes[_selected!]} minutes',
              style: TextStyle(color: context.colors.muted, fontSize: 13)),
          const SizedBox(height: 16),
          Semantics(
            label: 'Bar chart of call minutes per day: '
                '${[for (var i = 0; i < 7; i++) '${_days[i]} ${mockWeeklyMinutes[i]}'].join(', ')}',
            child: SizedBox(
              height: 150,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  for (var i = 0; i < 7; i++)
                    Expanded(
                      child: MouseRegion(
                        onEnter: (_) => setState(() => _selected = i),
                        onExit: (_) => setState(() => _selected = null),
                        child: GestureDetector(
                          behavior: HitTestBehavior.opaque,
                          onTap: () => setState(() => _selected = _selected == i ? null : i),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              Expanded(
                                child: Align(
                                  alignment: Alignment.bottomCenter,
                                  child: FractionallySizedBox(
                                    heightFactor: mockWeeklyMinutes[i] / ceiling,
                                    child: AnimatedContainer(
                                      duration: const Duration(milliseconds: 150),
                                      width: 26,
                                      decoration: BoxDecoration(
                                        color: _selected == i ? context.brand : context.brand.withValues(alpha: 0.65),
                                        borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(_days[i], style: TextStyle(fontSize: 11, color: context.colors.subtle)),
                            ],
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _OnlineNow extends StatelessWidget {
  final List<AppUser> contacts;
  const _OnlineNow({required this.contacts});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.fromLTRB(18, 14, 8, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            const Expanded(child: Text('Online now', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16))),
            TextButton(onPressed: () => context.go('/contacts'), child: const Text('All contacts')),
          ]),
          for (final c in contacts.take(4))
            ListTile(
              contentPadding: const EdgeInsets.only(right: 4),
              leading: Avatar(name: c.name, size: 38, presence: c.presence),
              title: Text(c.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
              subtitle: Text(c.location ?? '', style: TextStyle(fontSize: 12, color: context.colors.subtle)),
              trailing: IconButton(
                tooltip: 'Call ${c.firstName}',
                icon: Icon(Icons.videocam_outlined, color: context.brand),
                onPressed: () => context.go('/start-call?contact=${c.id}'),
              ),
            ),
        ],
      ),
    );
  }
}

class _RecentCalls extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 8, 6),
            child: Row(children: [
              const Expanded(child: Text('Recent calls', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16))),
              TextButton(onPressed: () => context.go('/history'), child: const Text('View all')),
            ]),
          ),
          const Divider(),
          for (final call in mockCallHistory.take(5)) ...[
            CallRow(call: call, onTap: () => context.go('/start-call?contact=${call.contactId}')),
            if (call != mockCallHistory.take(5).last) const Divider(indent: 70),
          ],
        ],
      ),
    );
  }
}
