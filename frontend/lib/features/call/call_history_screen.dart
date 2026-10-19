import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../config/supported_languages.dart';
import '../../core/formatters.dart';
import '../../core/theme.dart';
import '../../models/call_history_entry.dart';
import '../../services/history_store.dart';
import '../../widgets/avatar.dart';
import '../../widgets/common.dart';
import 'call_widgets.dart';

class CallHistoryScreen extends StatefulWidget {
  const CallHistoryScreen({super.key});

  @override
  State<CallHistoryScreen> createState() => _CallHistoryScreenState();
}

const _ranges = {'all': ('All time', 100000), '7': ('Last 7 days', 7), '30': ('Last 30 days', 30), '90': ('Last 90 days', 90)};
const _pageSize = 6;

class _CallHistoryScreenState extends State<CallHistoryScreen> {
  final _store = HistoryStore.instance;
  String _query = '';
  String _language = 'all';
  String _range = 'all';
  int _page = 0;

  List<CallHistoryEntry> get _filtered {
    final cutoff = DateTime.now().subtract(Duration(days: _ranges[_range]!.$2));
    final q = _query.toLowerCase();
    return _store.calls.where((c) {
      final matchesQuery = q.isEmpty || c.participantName.toLowerCase().contains(q) || c.roomCode.toLowerCase().contains(q);
      final matchesLang = _language == 'all' || c.sourceLanguage == _language || c.targetLanguage == _language;
      return matchesQuery && matchesLang && c.timestamp.isAfter(cutoff);
    }).toList();
  }

  void _showDetails(CallHistoryEntry c) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (sheet) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(children: [
                Avatar(name: c.participantName, size: 52),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(c.participantName, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                    Text(c.direction == CallDirection.incoming ? 'Incoming call' : 'Outgoing call', style: TextStyle(color: context.colors.muted)),
                  ]),
                ),
                outcomeBadge(c.outcome),
              ]),
              const SizedBox(height: 18),
              Wrap(spacing: 10, runSpacing: 10, children: [
                _detail(context, 'Room code', c.roomCode),
                _detail(context, 'Language pair', '${languageFor(c.sourceLanguage).label} → ${languageFor(c.targetLanguage).label}'),
                _detail(context, 'Duration', c.duration > Duration.zero ? formatDuration(c.duration) : '—'),
                _detail(context, 'Date', '${formatCallDate(c.timestamp)}, ${formatTime(c.timestamp)}'),
                _detail(context, 'Translated lines', '${c.translatedLines}'),
              ]),
              const SizedBox(height: 12),
              Text('Call transcripts will appear here once live translation is available.',
                  style: TextStyle(fontSize: 12, color: context.colors.subtle)),
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: () {
                  Navigator.of(sheet).pop();
                  context.go('/start-call?contact=${c.contactId}');
                },
                icon: const Icon(Icons.videocam_rounded),
                label: const Text('Call again'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _detail(BuildContext context, String k, String v) => Container(
        width: 160,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: context.colors.surface2, borderRadius: BorderRadius.circular(10)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(k, style: TextStyle(fontSize: 11, color: context.colors.subtle)),
          const SizedBox(height: 3),
          Text(v, style: const TextStyle(fontWeight: FontWeight.w600)),
        ]),
      );

  @override
  void initState() {
    super.initState();
    _store.load();
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(listenable: _store, builder: (context, _) => _build(context));

  Widget _build(BuildContext context) {
    final filtered = _filtered;
    final pages = (filtered.length / _pageSize).ceil().clamp(1, 999);
    final page = _page.clamp(0, pages - 1);
    final rows = filtered.skip(page * _pageSize).take(_pageSize).toList();
    final wide = MediaQuery.sizeOf(context).width >= 700;

    return ListView(
      padding: EdgeInsets.all(wide ? 28 : 16),
      children: [
        ContentWidth(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              PageHeader(
                title: 'Call history',
                subtitle: 'Every conversation, with the languages you used.',
                trailing: IconButton(
                  tooltip: 'Refresh',
                  onPressed: _store.loading ? null : _store.load,
                  icon: _store.loading
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.refresh_rounded),
                ),
              ),
              if (_store.error != null) ...[
                Text('${_store.error} Showing the calls loaded earlier.', style: const TextStyle(color: Brand.danger, fontSize: 13)),
                const SizedBox(height: 10),
              ],
              TextField(
                onChanged: (v) => setState(() {
                  _query = v;
                  _page = 0;
                }),
                decoration: const InputDecoration(hintText: 'Search by contact or room code', prefixIcon: Icon(Icons.search_rounded)),
              ),
              const SizedBox(height: 10),
              Row(children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    initialValue: _language,
                    isExpanded: true,
                    decoration: const InputDecoration(labelText: 'Language', prefixIcon: Icon(Icons.translate_rounded, size: 20)),
                    items: [
                      const DropdownMenuItem(value: 'all', child: Text('All languages')),
                      for (final l in allLanguages) DropdownMenuItem(value: l.code, child: Text(l.label)),
                    ],
                    onChanged: (v) => setState(() {
                      _language = v ?? 'all';
                      _page = 0;
                    }),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    initialValue: _range,
                    isExpanded: true,
                    decoration: const InputDecoration(labelText: 'Date', prefixIcon: Icon(Icons.calendar_today_outlined, size: 18)),
                    items: [for (final e in _ranges.entries) DropdownMenuItem(value: e.key, child: Text(e.value.$1))],
                    onChanged: (v) => setState(() {
                      _range = v ?? 'all';
                      _page = 0;
                    }),
                  ),
                ),
              ]),
              const SizedBox(height: 16),
              Card(
                clipBehavior: Clip.antiAlias,
                child: !_store.loadedOnce
                    ? const Padding(padding: EdgeInsets.all(40), child: Center(child: CircularProgressIndicator()))
                    : _store.calls.isEmpty
                    ? EmptyState(
                        icon: Icons.history_rounded,
                        title: 'No calls yet',
                        message: 'Calls you make or join will show up here.',
                        action: FilledButton.icon(
                          onPressed: () => context.go('/start-call'),
                          icon: const Icon(Icons.videocam_rounded),
                          label: const Text('Start a call'),
                        ),
                      )
                    : rows.isEmpty
                    ? EmptyState(
                        icon: Icons.history_rounded,
                        title: 'No calls found',
                        message: 'Try a different search or clear the filters.',
                        action: OutlinedButton(
                          onPressed: () => setState(() {
                            _query = '';
                            _language = 'all';
                            _range = 'all';
                            _page = 0;
                          }),
                          child: const Text('Clear filters'),
                        ),
                      )
                    : Column(
                        children: [
                          for (var i = 0; i < rows.length; i++) ...[
                            if (i > 0) const Divider(indent: 70),
                            CallRow(
                              call: rows[i],
                              onTap: () => _showDetails(rows[i]),
                              trailing: IconButton(
                                tooltip: 'Call ${rows[i].participantName} again',
                                icon: Icon(Icons.videocam_outlined, color: context.brand),
                                onPressed: () => context.go('/start-call?contact=${rows[i].contactId}'),
                              ),
                            ),
                          ],
                          const Divider(),
                          Padding(
                            padding: const EdgeInsets.fromLTRB(16, 4, 8, 4),
                            child: Row(children: [
                              Expanded(
                                child: Text(
                                  'Showing ${page * _pageSize + 1}–${page * _pageSize + rows.length} of ${filtered.length}',
                                  style: TextStyle(color: context.colors.muted, fontSize: 13),
                                ),
                              ),
                              IconButton(
                                tooltip: 'Previous page',
                                onPressed: page == 0 ? null : () => setState(() => _page = page - 1),
                                icon: const Icon(Icons.chevron_left_rounded),
                              ),
                              Text('${page + 1} / $pages', style: const TextStyle(fontWeight: FontWeight.w600)),
                              IconButton(
                                tooltip: 'Next page',
                                onPressed: page >= pages - 1 ? null : () => setState(() => _page = page + 1),
                                icon: const Icon(Icons.chevron_right_rounded),
                              ),
                            ]),
                          ),
                        ],
                      ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
