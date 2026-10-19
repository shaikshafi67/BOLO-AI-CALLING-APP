import 'package:flutter/material.dart';
import '../../core/formatters.dart';
import '../../core/theme.dart';
import '../../models/video_filter.dart';
import '../../services/call_service.dart';

/// In-call text chat with the other person.
class ChatPanel extends StatefulWidget {
  final CallSession session;
  final VoidCallback onClose;
  const ChatPanel({super.key, required this.session, required this.onClose});

  @override
  State<ChatPanel> createState() => _ChatPanelState();
}

class _ChatPanelState extends State<ChatPanel> {
  final _text = TextEditingController();
  final _scroll = ScrollController();

  @override
  void initState() {
    super.initState();
    widget.session.setChatVisible(true);
    widget.session.addListener(_onSession);
  }

  @override
  void dispose() {
    widget.session.removeListener(_onSession);
    widget.session.setChatVisible(false);
    _text.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _onSession() {
    if (!mounted) return;
    setState(() {});
    // Keep the newest message in view.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) _scroll.jumpTo(_scroll.position.maxScrollExtent);
    });
  }

  void _send() {
    widget.session.sendChat(_text.text);
    _text.clear();
  }

  @override
  Widget build(BuildContext context) {
    final messages = widget.session.messages;
    final canSend = widget.session.peer != null;
    return Container(
      color: Brand.callSurface,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 6, 6),
            child: Row(
              children: [
                const Icon(Icons.chat_bubble_outline_rounded, color: Colors.white70, size: 18),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text(
                    'Chat',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 16),
                  ),
                ),
                IconButton(
                  tooltip: 'Close chat',
                  onPressed: widget.onClose,
                  icon: const Icon(Icons.close_rounded, color: Colors.white70),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: Color(0xFF292524)),
          Expanded(
            child: messages.isEmpty
                ? const Center(
                    child: Padding(
                      padding: EdgeInsets.all(24),
                      child: Text(
                        'Messages you send here are only seen during this call.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Color(0xFFA8A29E), fontSize: 13),
                      ),
                    ),
                  )
                : ListView.builder(
                    controller: _scroll,
                    padding: const EdgeInsets.all(12),
                    itemCount: messages.length,
                    itemBuilder: (context, i) => _Bubble(message: messages[i]),
                  ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: EdgeInsets.fromLTRB(12, 8, 8, 10 + MediaQuery.viewInsetsOf(context).bottom),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _text,
                      enabled: canSend,
                      autofocus: true,
                      minLines: 1,
                      maxLines: 4,
                      maxLength: 1000,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _send(),
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        counterText: '',
                        hintText: canSend ? 'Type a message' : 'Chat opens when someone joins',
                        hintStyle: const TextStyle(color: Color(0xFF78716C)),
                        filled: true,
                        fillColor: const Color(0xFF292524),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(22), borderSide: BorderSide.none),
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  IconButton.filled(tooltip: 'Send', onPressed: canSend ? _send : null, icon: const Icon(Icons.send_rounded, size: 20)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Bubble extends StatelessWidget {
  final ChatMessage message;
  const _Bubble({required this.message});

  @override
  Widget build(BuildContext context) {
    final mine = message.mine;
    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        constraints: const BoxConstraints(maxWidth: 300),
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 6),
        decoration: BoxDecoration(
          color: mine ? Brand.ink600 : const Color(0xFF292524),
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(14),
            topRight: const Radius.circular(14),
            bottomLeft: Radius.circular(mine ? 14 : 4),
            bottomRight: Radius.circular(mine ? 4 : 14),
          ),
        ),
        child: Column(
          crossAxisAlignment: mine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            if (!mine)
              Text(
                message.name,
                style: const TextStyle(color: Brand.marigold300, fontSize: 11, fontWeight: FontWeight.w600),
              ),
            SelectableText(message.text, style: const TextStyle(color: Colors.white, fontSize: 14)),
            const SizedBox(height: 2),
            Text(formatTime(message.at), style: const TextStyle(color: Colors.white54, fontSize: 10)),
          ],
        ),
      ),
    );
  }
}

/// Picks a look for your camera; the other person sees the filtered video.
Future<void> showFilterSheet(BuildContext context, CallSession session) {
  return showModalBottomSheet<void>(
    context: context,
    backgroundColor: Brand.callSurface,
    showDragHandle: true,
    builder: (sheet) => ListenableBuilder(
      listenable: session,
      builder: (context, _) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Camera filters',
                style: TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 4),
              const Text(
                'Natural and Soft glow gently brighten and smooth your picture. The other person sees the filter too.',
                style: TextStyle(color: Color(0xFFA8A29E), fontSize: 13),
              ),
              const SizedBox(height: 14),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final f in VideoFilter.values)
                    ChoiceChip(
                      label: Text(f.label),
                      selected: session.filter == f,
                      avatar: f == VideoFilter.natural || f == VideoFilter.glow ? const Icon(Icons.auto_awesome_rounded, size: 16) : null,
                      onSelected: (_) => session.setFilter(f),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    ),
  );
}
