import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import '../../config/supported_languages.dart';
import '../../core/app_state.dart';
import '../../core/formatters.dart';
import '../../core/mock_data.dart';
import '../../core/theme.dart';
import '../../models/translation_entry.dart';
import '../../models/user.dart';
import '../../services/call_service.dart';
import '../../services/session.dart';
import '../../widgets/avatar.dart';
import '../../widgets/brand.dart';
import '../../widgets/common.dart';
import 'call_ended_view.dart';
import 'remote_video.dart';
import 'translation_panel.dart';

/// Presenter-only scenarios to demonstrate every call state during a demo.
enum DemoScenario { normal, unstable, reconnecting, translationUnavailable }

class ActiveCallScreen extends StatefulWidget {
  final String roomCode;
  final String? contactId;
  const ActiveCallScreen({super.key, required this.roomCode, this.contactId});

  @override
  State<ActiveCallScreen> createState() => _ActiveCallScreenState();
}

class _ActiveCallScreenState extends State<ActiveCallScreen> {
  late final AppUser _remote =
      widget.contactId == null ? contactById(demoContactId) : contactById(widget.contactId);
  final _call = AppState.instance.call;

  ConnectionStateKind _connection = ConnectionStateKind.connecting;
  StreamSubscription<ConnectionStateKind>? _connSub;
  DemoScenario _scenario = DemoScenario.normal;

  late bool _micOn = _call.micOn;
  late bool _cameraOn = _call.cameraOn;
  late bool _speakerOn = _call.speakerOn;
  late bool _captionsOn = _call.liveCaptions;
  bool _translateOn = true;
  bool _panelOpen = false;
  bool _ended = false;

  Timer? _clock;
  Duration _elapsed = Duration.zero;

  late List<TranslationEntry> _entries = demoTranscript(_remote.name);
  late TranslationEntry? _current = _entries.last;
  TranslationStatus _pipeline = TranslationStatus.completed;
  Timer? _demoTimer;
  Timer? _demoFinish;
  int _queueIndex = 0;

  /// Bumped on every state change so the phone bottom sheet can listen.
  final _stateTick = ValueNotifier<int>(0);

  @override
  void setState(VoidCallback fn) {
    super.setState(fn);
    _stateTick.value++;
  }

  @override
  void initState() {
    super.initState();
    if (!roomCodePattern.hasMatch(widget.roomCode)) {
      WidgetsBinding.instance.addPostFrameCallback((_) => context.go('/join-call'));
      return;
    }
    _connect();
  }

  void _connect() {
    _connSub?.cancel();
    _connSub = CallService().connect().listen((s) {
      if (!mounted) return;
      setState(() => _connection = s);
      if (s == ConnectionStateKind.connected) {
        _clock ??= Timer.periodic(const Duration(seconds: 1), (_) {
          if (mounted && !_ended) setState(() => _elapsed += const Duration(seconds: 1));
        });
        _scheduleNextLine();
      }
    });
  }

  ConnectionStateKind get _effectiveConnection {
    if (_connection != ConnectionStateKind.connected) return _connection;
    return switch (_scenario) {
      DemoScenario.unstable => ConnectionStateKind.unstable,
      DemoScenario.reconnecting => ConnectionStateKind.reconnecting,
      _ => ConnectionStateKind.connected,
    };
  }

  bool get _inCall => _effectiveConnection == ConnectionStateKind.connected || _effectiveConnection == ConnectionStateKind.unstable;

  TranslationStatus get _status {
    if (_scenario == DemoScenario.translationUnavailable) return TranslationStatus.unavailable;
    if (!_translateOn) return TranslationStatus.idle;
    return _pipeline;
  }

  /// Plays the scripted demo lines: "translating…" for a moment, then "ready".
  /// TODO: Connect Speech-to-Text and Translation APIs — replace with a
  /// subscription to the real transcript stream from the backend.
  void _scheduleNextLine() {
    _demoTimer?.cancel();
    if (_queueIndex >= demoQueue.length) return;
    _demoTimer = Timer(const Duration(seconds: 6), () {
      if (!mounted || _ended) return;
      if (!_inCall || _status == TranslationStatus.unavailable || !_translateOn) {
        _scheduleNextLine();
        return;
      }
      final line = demoQueue[_queueIndex];
      final entry = TranslationEntry(
        id: 'live_$_queueIndex',
        isLocal: line.local,
        speakerName: line.local ? 'You' : _remote.name,
        sourceLanguage: line.local ? 'hi' : 'en',
        targetLanguage: line.local ? 'en' : 'hi',
        originalText: line.local ? line.hi : line.en,
        translatedText: line.local ? line.en : line.hi,
        timestamp: DateTime.now(),
      );
      setState(() {
        _current = entry;
        _pipeline = TranslationStatus.processing;
      });
      _demoFinish = Timer(const Duration(milliseconds: 1800), () {
        if (!mounted) return;
        setState(() {
          _entries = [..._entries, entry];
          _pipeline = TranslationStatus.completed;
          _queueIndex++;
        });
        _scheduleNextLine();
      });
    });
  }

  @override
  void dispose() {
    _connSub?.cancel();
    _clock?.cancel();
    _demoTimer?.cancel();
    _demoFinish?.cancel();
    _stateTick.dispose();
    super.dispose();
  }

  void _endCall() {
    _clock?.cancel();
    _demoTimer?.cancel();
    _demoFinish?.cancel();
    setState(() => _ended = true);
  }

  void _rejoin() {
    setState(() {
      _ended = false;
      _elapsed = Duration.zero;
      _scenario = DemoScenario.normal;
      _connection = ConnectionStateKind.connecting;
      _clock = null;
      _queueIndex = 0;
      _entries = demoTranscript(_remote.name);
      _current = _entries.last;
      _pipeline = TranslationStatus.completed;
    });
    _connect();
  }

  void _toggleTranslate() {
    showToast(context, _translateOn ? 'Translation paused. You’ll hear the original audio only.' : 'Translation resumed.');
    setState(() => _translateOn = !_translateOn);
  }

  void _screenShare() => showToast(context, 'Screen sharing will be available once WebRTC is connected.');

  void _togglePanel(bool wide) {
    if (wide) {
      setState(() => _panelOpen = !_panelOpen);
      return;
    }
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Brand.callSurface,
      showDragHandle: false,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      clipBehavior: Clip.antiAlias,
      builder: (context) => FractionallySizedBox(
        heightFactor: 0.8,
        // Rebuilds whenever the call state changes, so the sheet stays live.
        child: ValueListenableBuilder<int>(
          valueListenable: _stateTick,
          builder: (context, _, _) => TranslationPanel(
            entries: _entries,
            current: _current,
            status: _status,
            myLanguage: _call.myLanguage,
            targetLanguage: _call.targetLanguage,
            onClose: () => Navigator.of(context).pop(),
          ),
        ),
      ),
    );
  }

  void _openMore(bool phone) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Brand.callSurface,
      showDragHandle: true,
      builder: (sheet) {
        Widget item(IconData icon, String label, VoidCallback onTap, {bool active = false}) => ListTile(
              leading: Icon(icon, color: active ? Brand.marigold300 : const Color(0xFFA8A29E)),
              title: Text(label, style: TextStyle(color: active ? Brand.marigold300 : Colors.white)),
              trailing: active ? const Icon(Icons.check_rounded, color: Brand.marigold300, size: 18) : null,
              onTap: () {
                Navigator.of(sheet).pop();
                onTap();
              },
            );
        return SafeArea(
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (phone) ...[
                  item(_speakerOn ? Icons.volume_up_rounded : Icons.volume_off_rounded, _speakerOn ? 'Mute speaker' : 'Unmute speaker',
                      () => setState(() => _speakerOn = !_speakerOn)),
                  item(Icons.translate_rounded, _translateOn ? 'Pause translation' : 'Resume translation', _toggleTranslate),
                  item(Icons.screen_share_outlined, 'Share screen', _screenShare),
                ],
                item(Icons.copy_rounded, 'Copy room code', () {
                  Clipboard.setData(ClipboardData(text: widget.roomCode));
                  showToast(context, 'Room code ${widget.roomCode} copied.');
                }),
                const Divider(color: Color(0xFF292524)),
                const Padding(
                  padding: EdgeInsets.fromLTRB(16, 6, 16, 2),
                  child: Row(children: [
                    Icon(Icons.science_outlined, size: 16, color: Brand.marigold300),
                    SizedBox(width: 8),
                    Text('PRESENTER DEMO: SIMULATE STATE',
                        style: TextStyle(color: Brand.marigold300, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.6)),
                  ]),
                ),
                item(Icons.wifi_off_rounded, 'Connection unstable', () => setState(() => _scenario = DemoScenario.unstable),
                    active: _scenario == DemoScenario.unstable),
                item(Icons.sync_rounded, 'Reconnecting', () => setState(() => _scenario = DemoScenario.reconnecting),
                    active: _scenario == DemoScenario.reconnecting),
                item(Icons.block_rounded, 'Translation unavailable', () => setState(() => _scenario = DemoScenario.translationUnavailable),
                    active: _scenario == DemoScenario.translationUnavailable),
                item(Icons.restart_alt_rounded, 'Back to normal', () => setState(() => _scenario = DemoScenario.normal),
                    active: _scenario == DemoScenario.normal),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_ended) {
      return CallEndedView(
        contact: _remote,
        duration: _elapsed,
        translatedLines: _entries.length,
        onRejoin: _rejoin,
        onDone: () => context.go('/home'),
      );
    }

    final size = MediaQuery.sizeOf(context);
    final wide = size.width >= 1000;
    final phone = size.width < 600;

    return CallbackShortcuts(
      bindings: {
        const SingleActivator(LogicalKeyboardKey.keyM): () => setState(() => _micOn = !_micOn),
        const SingleActivator(LogicalKeyboardKey.keyV): () => setState(() => _cameraOn = !_cameraOn),
        const SingleActivator(LogicalKeyboardKey.keyC): () => setState(() => _captionsOn = !_captionsOn),
        const SingleActivator(LogicalKeyboardKey.keyT): () => _togglePanel(wide),
      },
      child: Focus(
        autofocus: true,
        child: AnnotatedRegion<SystemUiOverlayStyle>(
          value: SystemUiOverlayStyle.light,
          child: Scaffold(
            backgroundColor: Brand.callBackground,
            body: SafeArea(
              child: Column(
                children: [
                  _TopBar(
                    roomCode: widget.roomCode,
                    connection: _effectiveConnection,
                    from: _call.myLanguage,
                    to: _call.targetLanguage,
                    elapsed: _elapsed,
                  ),
                  Expanded(
                    child: Row(
                      children: [
                        Expanded(child: Padding(padding: const EdgeInsets.fromLTRB(8, 0, 8, 8), child: _stage(phone))),
                        if (wide && _panelOpen)
                          SizedBox(
                            width: 380,
                            child: TranslationPanel(
                              entries: _entries,
                              current: _current,
                              status: _status,
                              myLanguage: _call.myLanguage,
                              targetLanguage: _call.targetLanguage,
                              onClose: () => setState(() => _panelOpen = false),
                            ),
                          ),
                      ],
                    ),
                  ),
                  _controls(phone, wide),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _stage(bool phone) {
    final conn = _effectiveConnection;
    final remoteSpeaking = _inCall && _status == TranslationStatus.processing && !(_current?.isLocal ?? true);
    final localSpeaking = _inCall && _micOn && _status == TranslationStatus.processing && (_current?.isLocal ?? false);
    final me = Session.instance.user;

    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: Stack(
        fit: StackFit.expand,
        children: [
          RemoteVideo(contact: _remote, speaking: remoteSpeaking),

          // Name tag
          Positioned(
            left: 12,
            top: 12,
            child: _Chip(child: Text('${_remote.name}  ·  Speaks ${languageFor(_remote.preferredLanguage).label}',
                style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500))),
          ),

          // Local preview (self view)
          Positioned(
            right: 12,
            top: phone ? 56 : null,
            bottom: phone ? null : 110,
            width: phone ? 96 : 180,
            child: AspectRatio(
              aspectRatio: phone ? 3 / 4 : 16 / 10,
              child: Container(
                decoration: BoxDecoration(
                  color: const Color(0xFF292524),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: localSpeaking ? Brand.marigold400 : Colors.white24, width: localSpeaking ? 2.5 : 1.5),
                ),
                child: Stack(children: [
                  Center(
                    child: _cameraOn
                        ? Avatar(name: me?.name ?? 'You', size: phone ? 42 : 52)
                        : const Icon(Icons.videocam_off_rounded, color: Colors.white38),
                  ),
                  Positioned(
                    left: 6,
                    bottom: 6,
                    child: _Chip(
                      small: true,
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        if (!_micOn) ...[const Icon(Icons.mic_off_rounded, size: 11, color: Color(0xFFF87171)), const SizedBox(width: 3)],
                        Text(me?.firstName ?? 'You', style: const TextStyle(color: Colors.white, fontSize: 11)),
                      ]),
                    ),
                  ),
                ]),
              ),
            ),
          ),

          if (!_micOn && _inCall && conn != ConnectionStateKind.unstable)
            const Positioned(top: 12, left: 0, right: 0, child: Center(child: _Pill(color: Brand.danger, icon: Icons.mic_off_rounded, text: 'You’re muted'))),
          if (conn == ConnectionStateKind.unstable)
            const Positioned(
              top: 12,
              left: 0,
              right: 0,
              child: Center(child: _Pill(color: Color(0xFFEA580C), icon: Icons.wifi_off_rounded, text: 'Connection unstable: video quality reduced')),
            ),
          if (_inCall && _status == TranslationStatus.unavailable)
            Positioned(
              top: phone ? 56 : 52,
              left: 12,
              right: phone ? 120 : null,
              child: const _Chip(
                child: Text('Translation unavailable. The call continues with original audio.',
                    style: TextStyle(color: Color(0xFFFCA5A5), fontSize: 12)),
              ),
            ),

          if (_inCall && _captionsOn && _translateOn && _current != null)
            Positioned(left: 12, right: 12, bottom: 14, child: Center(child: _Caption(entry: _current!, status: _status))),

          if (conn == ConnectionStateKind.connecting || conn == ConnectionStateKind.reconnecting)
            _ConnectingOverlay(reconnecting: conn == ConnectionStateKind.reconnecting, name: _remote.name),
        ],
      ),
    );
  }

  Widget _controls(bool phone, bool wide) {
    final buttons = <Widget>[
      _CallButton(
        icon: _micOn ? Icons.mic_rounded : Icons.mic_off_rounded,
        label: _micOn ? 'Mute microphone (M)' : 'Unmute microphone (M)',
        state: _micOn ? _BtnState.normal : _BtnState.off,
        onTap: () => setState(() => _micOn = !_micOn),
      ),
      _CallButton(
        icon: _cameraOn ? Icons.videocam_rounded : Icons.videocam_off_rounded,
        label: _cameraOn ? 'Turn camera off (V)' : 'Turn camera on (V)',
        state: _cameraOn ? _BtnState.normal : _BtnState.off,
        onTap: () => setState(() => _cameraOn = !_cameraOn),
      ),
      if (!phone)
        _CallButton(
          icon: _speakerOn ? Icons.volume_up_rounded : Icons.volume_off_rounded,
          label: _speakerOn ? 'Mute speaker' : 'Unmute speaker',
          state: _speakerOn ? _BtnState.normal : _BtnState.off,
          onTap: () => setState(() => _speakerOn = !_speakerOn),
        ),
      _CallButton(
        icon: _captionsOn ? Icons.closed_caption_rounded : Icons.closed_caption_disabled_outlined,
        label: _captionsOn ? 'Hide captions (C)' : 'Show captions (C)',
        state: _captionsOn ? _BtnState.active : _BtnState.normal,
        onTap: () => setState(() => _captionsOn = !_captionsOn),
      ),
      if (!phone)
        _CallButton(
          icon: Icons.translate_rounded,
          label: _translateOn ? 'Pause translation' : 'Resume translation',
          state: _translateOn ? _BtnState.active : _BtnState.normal,
          onTap: _toggleTranslate,
        ),
      _CallButton(
        icon: Icons.forum_outlined,
        label: 'Translation panel (T)',
        state: wide && _panelOpen ? _BtnState.active : _BtnState.normal,
        onTap: () => _togglePanel(wide),
      ),
      if (!phone) _CallButton(icon: Icons.screen_share_outlined, label: 'Share screen', onTap: _screenShare),
      _CallButton(icon: Icons.more_horiz_rounded, label: 'More options', onTap: () => _openMore(phone)),
    ];

    return Padding(
      padding: const EdgeInsets.fromLTRB(8, 4, 8, 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          for (final b in buttons) Padding(padding: EdgeInsets.symmetric(horizontal: phone ? 3 : 5), child: b),
          SizedBox(width: phone ? 6 : 14),
          _CallButton(icon: Icons.call_end_rounded, label: 'End call', state: _BtnState.danger, onTap: _endCall, wide: true),
        ],
      ),
    );
  }
}

class _TopBar extends StatelessWidget {
  final String roomCode;
  final ConnectionStateKind connection;
  final String from;
  final String to;
  final Duration elapsed;
  const _TopBar({required this.roomCode, required this.connection, required this.from, required this.to, required this.elapsed});

  @override
  Widget build(BuildContext context) {
    final (label, color) = switch (connection) {
      ConnectionStateKind.connecting => ('Connecting…', const Color(0xFFFBBF24)),
      ConnectionStateKind.connected => ('Excellent connection', const Color(0xFF4ADE80)),
      ConnectionStateKind.reconnecting => ('Reconnecting…', const Color(0xFFFBBF24)),
      ConnectionStateKind.unstable => ('Connection unstable', const Color(0xFFFB923C)),
      ConnectionStateKind.ended => ('Call ended', const Color(0xFFA8A29E)),
    };
    final phone = MediaQuery.sizeOf(context).width < 600;
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 8, 14, 8),
      child: Row(
        children: [
          const LogoMark(size: 30),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  const Icon(Icons.lock_rounded, size: 13, color: Color(0xFF4ADE80)),
                  const SizedBox(width: 4),
                  Text(roomCode, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, letterSpacing: 0.8, fontSize: 14)),
                ]),
                Semantics(
                  liveRegion: true,
                  child: Row(children: [
                    Container(width: 7, height: 7, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
                    const SizedBox(width: 6),
                    Text(label, style: const TextStyle(color: Color(0xFFD6D3D1), fontSize: 12)),
                  ]),
                ),
              ],
            ),
          ),
          if (!phone) ...[
            _Chip(
              color: Brand.ink700.withValues(alpha: 0.5),
              child: Text('${languageFor(from).label} → ${languageFor(to).label}',
                  style: const TextStyle(color: Brand.ink100, fontSize: 12, fontWeight: FontWeight.w600)),
            ),
            const SizedBox(width: 8),
          ],
          _Chip(
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              const Icon(Icons.schedule_rounded, size: 13, color: Color(0xFFA8A29E)),
              const SizedBox(width: 5),
              Text(formatDuration(elapsed),
                  style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600, fontFeatures: [FontFeature.tabularFigures()])),
            ]),
          ),
        ],
      ),
    );
  }
}

class _Caption extends StatelessWidget {
  final TranslationEntry entry;
  final TranslationStatus status;
  const _Caption({required this.entry, required this.status});

  @override
  Widget build(BuildContext context) {
    final processing = status == TranslationStatus.processing;
    final unavailable = status == TranslationStatus.unavailable;
    return Semantics(
      liveRegion: true,
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 220),
        child: Container(
          key: ValueKey('${entry.id}-$status'),
          constraints: const BoxConstraints(maxWidth: 640),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.72), borderRadius: BorderRadius.circular(12)),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '${entry.isLocal ? 'YOU' : entry.speakerName.toUpperCase()}  ·  ${languageFor(entry.sourceLanguage).label.toUpperCase()} → ${languageFor(entry.targetLanguage).label.toUpperCase()}',
                style: const TextStyle(color: Colors.white54, fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 0.7),
              ),
              const SizedBox(height: 4),
              Text(
                unavailable || processing ? entry.originalText : entry.translatedText,
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: processing ? Colors.white70 : Colors.white,
                  fontSize: processing ? 16 : 19,
                  fontStyle: processing ? FontStyle.italic : FontStyle.normal,
                  fontWeight: FontWeight.w500,
                ),
              ),
              if (processing) ...[
                const SizedBox(height: 4),
                const Text('BoloAI is translating…', style: TextStyle(color: Brand.ink300, fontSize: 11)),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _ConnectingOverlay extends StatelessWidget {
  final bool reconnecting;
  final String name;
  const _ConnectingOverlay({required this.reconnecting, required this.name});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Brand.callBackground.withValues(alpha: 0.88),
      alignment: Alignment.center,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const LogoMark(size: 64),
          const SizedBox(height: 18),
          Text(reconnecting ? 'Reconnecting…' : 'Connecting to $name…',
              style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Text(
              reconnecting ? 'Your network dropped. Trying to restore the call.' : 'Setting up a secure connection and the translation pipeline',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Color(0xFFA8A29E), fontSize: 13),
            ),
          ),
          const SizedBox(height: 18),
          const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Brand.ink300)),
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  final Widget child;
  final bool small;
  final Color? color;
  const _Chip({required this.child, this.small = false, this.color});

  @override
  Widget build(BuildContext context) => Container(
        padding: EdgeInsets.symmetric(horizontal: small ? 6 : 10, vertical: small ? 2 : 5),
        decoration: BoxDecoration(color: color ?? Colors.black.withValues(alpha: 0.55), borderRadius: BorderRadius.circular(small ? 5 : 8)),
        child: child,
      );
}

class _Pill extends StatelessWidget {
  final Color color;
  final IconData icon;
  final String text;
  const _Pill({required this.color, required this.icon, required this.text});

  @override
  Widget build(BuildContext context) => Semantics(
        liveRegion: true,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(color: color.withValues(alpha: 0.92), borderRadius: BorderRadius.circular(999)),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            Icon(icon, size: 14, color: Colors.white),
            const SizedBox(width: 6),
            Text(text, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
          ]),
        ),
      );
}

enum _BtnState { normal, off, active, danger }

class _CallButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final _BtnState state;
  final bool wide;
  const _CallButton({required this.icon, required this.label, required this.onTap, this.state = _BtnState.normal, this.wide = false});

  @override
  Widget build(BuildContext context) {
    final bg = switch (state) {
      _BtnState.normal => Colors.white.withValues(alpha: 0.12),
      _BtnState.off => const Color(0xE6EF4444),
      _BtnState.active => Brand.ink600,
      _BtnState.danger => Brand.danger,
    };
    return Tooltip(
      message: label,
      child: Semantics(
        button: true,
        label: label,
        excludeSemantics: true,
        child: Material(
          color: bg,
          borderRadius: BorderRadius.circular(16),
          child: InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: onTap,
            child: SizedBox(width: wide ? 64 : 48, height: 48, child: Icon(icon, color: Colors.white, size: 22)),
          ),
        ),
      ),
    );
  }
}
