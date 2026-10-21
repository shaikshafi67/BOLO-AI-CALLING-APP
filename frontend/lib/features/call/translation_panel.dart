import 'package:flutter/material.dart';
import '../../config/supported_languages.dart';
import '../../core/formatters.dart';
import '../../core/theme.dart';
import '../../models/translation_entry.dart';
import '../../widgets/avatar.dart';

/// Always-dark text colours for the call screen.
const _muted = Color(0xFFA8A29E);
const _subtle = Color(0xFF78716C);

class TranslationStatusLabel extends StatelessWidget {
  final TranslationStatus status;
  const TranslationStatusLabel({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final (icon, label, color) = switch (status) {
      TranslationStatus.idle => (Icons.sensors_rounded, 'Listening', _muted),
      TranslationStatus.processing => (Icons.autorenew_rounded, 'BoloAI is translating…', Brand.ink300),
      TranslationStatus.completed => (Icons.check_circle_outline_rounded, 'Translation ready', const Color(0xFF4ADE80)),
      TranslationStatus.unavailable => (Icons.block_rounded, 'Translation unavailable', const Color(0xFFF87171)),
    };
    return Semantics(
      liveRegion: true,
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        status == TranslationStatus.processing
            ? const SizedBox(width: 13, height: 13, child: CircularProgressIndicator(strokeWidth: 1.6, color: Brand.ink300))
            : Icon(icon, size: 14, color: color),
        const SizedBox(width: 6),
        Text(label, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600)),
      ]),
    );
  }
}

/// "Live Translation" panel: current utterance card + conversation history.
class TranslationPanel extends StatefulWidget {
  final List<TranslationEntry> entries;
  final TranslationEntry? current;
  final TranslationStatus status;
  final String myLanguage;
  final String targetLanguage;
  final VoidCallback? onClose;
  final ScrollController? scrollController;

  const TranslationPanel({
    super.key,
    required this.entries,
    required this.current,
    required this.status,
    required this.myLanguage,
    required this.targetLanguage,
    this.onClose,
    this.scrollController,
  });

  @override
  State<TranslationPanel> createState() => _TranslationPanelState();
}

class _TranslationPanelState extends State<TranslationPanel> {
  late final ScrollController _scroll = widget.scrollController ?? ScrollController();

  @override
  void didUpdateWidget(covariant TranslationPanel old) {
    super.didUpdateWidget(old);
    if (old.entries.length != widget.entries.length) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scroll.hasClients) {
          _scroll.animateTo(_scroll.position.maxScrollExtent, duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
        }
      });
    }
  }

  @override
  void dispose() {
    if (widget.scrollController == null) _scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cur = widget.current;
    return Container(
      color: Brand.callSurface,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 14, 8, 12),
            child: Row(children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(color: Brand.ink700, borderRadius: BorderRadius.circular(8)),
                child: const Icon(Icons.translate_rounded, color: Colors.white, size: 18),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Live Translation', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                  Text('${languageFor(widget.myLanguage).label} → ${languageFor(widget.targetLanguage).label}',
                      style: const TextStyle(color: _muted, fontSize: 12)),
                ]),
              ),
              if (widget.onClose != null)
                IconButton(
                  tooltip: 'Close translation panel',
                  icon: const Icon(Icons.close_rounded, color: _muted),
                  onPressed: widget.onClose,
                ),
            ]),
          ),
          const Divider(height: 1, color: Color(0xFF292524)),
          // Current utterance moving through the pipeline
          Padding(
            padding: const EdgeInsets.all(14),
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.04),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    const Text('AI TRANSLATION', style: TextStyle(color: _muted, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.8)),
                    const Spacer(),
                    TranslationStatusLabel(status: widget.status),
                  ]),
                  const SizedBox(height: 10),
                  Row(children: [
                    Expanded(child: _kv('Source language', languageFor(cur?.sourceLanguage ?? widget.myLanguage).label)),
                    Expanded(child: _kv('Target language', languageFor(cur?.targetLanguage ?? widget.targetLanguage).label)),
                  ]),
                  if (widget.status == TranslationStatus.unavailable) ...[
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(color: const Color(0x33DC2626), borderRadius: BorderRadius.circular(8)),
                      child: const Text('Translation service unavailable. You can still hear the original audio.',
                          style: TextStyle(color: Color(0xFFFCA5A5), fontSize: 12)),
                    ),
                  ] else if (cur != null) ...[
                    const SizedBox(height: 10),
                    _kv('Original speech', '“${cur.originalText}”'),
                    const SizedBox(height: 8),
                    widget.status == TranslationStatus.processing
                        ? _kv('Translation', 'BoloAI is translating…', valueColor: Brand.ink300)
                        : _kv('Translation', '“${cur.translatedText}”', bold: true),
                  ],
                ],
              ),
            ),
          ),
          // History
          Expanded(
            child: ListView.builder(
              controller: _scroll,
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
              itemCount: widget.entries.length,
              itemBuilder: (context, i) => _Bubble(entry: widget.entries[i]),
            ),
          ),
          const Divider(height: 1, color: Color(0xFF292524)),
          const Padding(
            padding: EdgeInsets.fromLTRB(14, 10, 14, 12),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Icon(Icons.info_outline_rounded, size: 14, color: _subtle),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Live speech recognition and translation will appear here once AI translation is switched on.',
                  style: TextStyle(color: _subtle, fontSize: 11),
                ),
              ),
            ]),
          ),
        ],
      ),
    );
  }

  Widget _kv(String k, String v, {bool bold = false, Color? valueColor}) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(k, style: const TextStyle(color: _subtle, fontSize: 11)),
          const SizedBox(height: 2),
          Text(v, style: TextStyle(color: valueColor ?? Colors.white, fontSize: 13, fontWeight: bold ? FontWeight.w600 : FontWeight.w400)),
        ],
      );
}

class _Bubble extends StatelessWidget {
  final TranslationEntry entry;
  const _Bubble({required this.entry});

  @override
  Widget build(BuildContext context) {
    final local = entry.isLocal;
    final align = local ? CrossAxisAlignment.end : CrossAxisAlignment.start;
    return Padding(
      padding: const EdgeInsets.only(top: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        textDirection: local ? TextDirection.rtl : TextDirection.ltr,
        children: [
          Avatar(name: local ? 'You' : entry.speakerName, size: 26),
          const SizedBox(width: 8),
          Flexible(
            child: Column(
              crossAxisAlignment: align,
              children: [
                Text('${local ? 'You' : entry.speakerName} · ${languageFor(entry.sourceLanguage).label} · ${formatTime(entry.timestamp)}',
                    style: const TextStyle(color: _muted, fontSize: 11)),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                  decoration: BoxDecoration(color: Colors.white.withValues(alpha: local ? 0.10 : 0.05), borderRadius: BorderRadius.circular(12)),
                  child: Text(entry.originalText, style: const TextStyle(color: Colors.white, fontSize: 14)),
                ),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                  decoration: BoxDecoration(
                    color: Brand.ink700.withValues(alpha: 0.35),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Brand.ink400.withValues(alpha: 0.35)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('BOLOAI · ${languageFor(entry.targetLanguage).label.toUpperCase()}',
                          style: const TextStyle(color: Brand.ink200, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 0.6)),
                      const SizedBox(height: 2),
                      Text(entry.translatedText, style: const TextStyle(color: Colors.white, fontSize: 14)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
