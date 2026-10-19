import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import '../../core/app_state.dart';
import '../../core/theme.dart';
import '../../services/call_service.dart';
import '../../services/session.dart';
import '../../widgets/avatar.dart';
import '../../widgets/common.dart';

/// Camera/mic check before a call. Opens the real camera and microphone
/// (demo mode shows a placeholder); the call then takes over the same stream.
class CameraPreviewCard extends StatefulWidget {
  final String name;
  final bool showSpeaker;
  const CameraPreviewCard({super.key, required this.name, this.showSpeaker = true});

  @override
  State<CameraPreviewCard> createState() => _CameraPreviewCardState();
}

class _CameraPreviewCardState extends State<CameraPreviewCard> {
  final _call = AppState.instance.call;
  final _renderer = RTCVideoRenderer();
  MediaStream? _stream;
  String? _error;

  @override
  void initState() {
    super.initState();
    if (kDemoMode) return;
    LocalMedia.previewShown = true;
    _call.addListener(_applyToggles);
    _open();
  }

  Future<void> _open() async {
    try {
      await _renderer.initialize();
      final stream = await LocalMedia.preview();
      if (!mounted) return;
      _renderer.srcObject = stream;
      setState(() => _stream = stream);
      _applyToggles();
    } on CallException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (e) {
      if (mounted) setState(() => _error = 'Camera preview unavailable.');
    }
  }

  void _applyToggles() {
    final s = _stream;
    if (s == null) return;
    for (final t in s.getVideoTracks()) {
      t.enabled = _call.cameraOn;
    }
    for (final t in s.getAudioTracks()) {
      t.enabled = _call.micOn;
    }
  }

  @override
  void dispose() {
    if (!kDemoMode) {
      _call.removeListener(_applyToggles);
      LocalMedia.previewShown = false;
      _renderer.srcObject = null;
      _renderer.dispose();
      // Stops the camera unless the call already took it over.
      LocalMedia.releasePreview();
    }
    super.dispose();
  }

  bool get _showVideo => _call.cameraOn && (_stream?.getVideoTracks().isNotEmpty ?? false);

  @override
  Widget build(BuildContext context) {
    final call = _call;
    final name = widget.name;
    final showSpeaker = widget.showSpeaker;
    final status = kDemoMode
        ? (call.cameraOn ? 'Camera preview (mock)' : 'Camera is off')
        : _error ?? (!call.cameraOn ? 'Camera is off' : _stream == null ? 'Starting camera…' : 'No camera found: voice only');
    return ListenableBuilder(
      listenable: call,
      builder: (context, _) => ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: AspectRatio(
          aspectRatio: 16 / 10,
          child: Container(
            color: Brand.callSurface,
            child: Stack(
              children: [
                if (_showVideo)
                  Positioned.fill(
                    child: RTCVideoView(_renderer, mirror: true, objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover),
                  )
                else
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Avatar(name: name, size: 76),
                          const SizedBox(height: 10),
                          Text(status, textAlign: TextAlign.center, style: const TextStyle(color: Colors.white60, fontSize: 13)),
                        ],
                      ),
                    ),
                  ),
                Positioned(
                  left: 12,
                  top: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(color: Colors.black54, borderRadius: BorderRadius.circular(6)),
                    child: Row(children: [
                      Icon(call.micOn ? Icons.graphic_eq_rounded : Icons.mic_off_rounded,
                          size: 14, color: call.micOn ? Brand.successBright : const Color(0xFFF87171)),
                      const SizedBox(width: 6),
                      Text(call.micOn ? 'Mic is working' : 'Microphone muted', style: const TextStyle(color: Colors.white, fontSize: 12)),
                    ]),
                  ),
                ),
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: 12,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _RoundToggle(
                        on: call.cameraOn,
                        onIcon: Icons.videocam_rounded,
                        offIcon: Icons.videocam_off_rounded,
                        label: call.cameraOn ? 'Turn camera off' : 'Turn camera on',
                        onTap: () => call.update(cameraOn: !call.cameraOn),
                      ),
                      const SizedBox(width: 12),
                      _RoundToggle(
                        on: call.micOn,
                        onIcon: Icons.mic_rounded,
                        offIcon: Icons.mic_off_rounded,
                        label: call.micOn ? 'Mute microphone' : 'Unmute microphone',
                        onTap: () => call.update(micOn: !call.micOn),
                      ),
                      if (showSpeaker) ...[
                        const SizedBox(width: 12),
                        _RoundToggle(
                          on: call.speakerOn,
                          onIcon: Icons.volume_up_rounded,
                          offIcon: Icons.volume_off_rounded,
                          label: call.speakerOn ? 'Mute speaker' : 'Unmute speaker',
                          onTap: () => call.update(speakerOn: !call.speakerOn),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _RoundToggle extends StatelessWidget {
  final bool on;
  final IconData onIcon;
  final IconData offIcon;
  final String label;
  final VoidCallback onTap;
  const _RoundToggle({required this.on, required this.onIcon, required this.offIcon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: label,
      child: Semantics(
        button: true,
        toggled: on,
        label: label,
        excludeSemantics: true,
        child: Material(
          color: on ? Colors.white.withValues(alpha: 0.16) : Brand.danger,
          shape: const CircleBorder(),
          child: InkWell(
            customBorder: const CircleBorder(),
            onTap: onTap,
            child: SizedBox.square(dimension: 48, child: Icon(on ? onIcon : offIcon, color: Colors.white, size: 22)),
          ),
        ),
      ),
    );
  }
}

/// My language / translate-to pickers plus the AI toggles.
class CallLanguageSettings extends StatelessWidget {
  final bool showToggles;
  const CallLanguageSettings({super.key, this.showToggles = true});

  @override
  Widget build(BuildContext context) {
    final call = AppState.instance.call;
    return ListenableBuilder(
      listenable: call,
      builder: (context, _) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          LanguageDropdown(
            key: ValueKey('my-${call.myLanguage}'),
            label: 'My language',
            value: call.myLanguage,
            enabled: !call.autoDetect,
            onChanged: (v) => call.update(myLanguage: v),
          ),
          Align(
            child: IconButton(
              tooltip: 'Swap languages',
              icon: Icon(Icons.swap_vert_rounded, color: context.brand),
              onPressed: call.swapLanguages,
            ),
          ),
          LanguageDropdown(
            key: ValueKey('to-${call.targetLanguage}'),
            label: 'Translate my speech to',
            value: call.targetLanguage,
            onChanged: (v) => call.update(targetLanguage: v),
          ),
          if (call.myLanguage == call.targetLanguage)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text('Both languages are the same, so translation will be skipped.', style: TextStyle(color: context.accent, fontSize: 12)),
            ),
          if (showToggles) ...[
            const SizedBox(height: 8),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              secondary: const Icon(Icons.record_voice_over_outlined),
              title: const Text('AI voice translation'),
              subtitle: const Padding(padding: EdgeInsets.only(top: 4), child: Align(alignment: Alignment.centerLeft, child: ComingSoonTag())),
              value: call.voiceTranslation,
              onChanged: (v) => call.update(voiceTranslation: v),
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              secondary: const Icon(Icons.closed_caption_outlined),
              title: const Text('Live captions'),
              subtitle: const Text('Show translated subtitles during the call'),
              value: call.liveCaptions,
              onChanged: (v) => call.update(liveCaptions: v),
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              secondary: const Icon(Icons.manage_search_rounded),
              title: const Text('Auto language detection'),
              subtitle: const Padding(padding: EdgeInsets.only(top: 4), child: Align(alignment: Alignment.centerLeft, child: ComingSoonTag())),
              value: call.autoDetect,
              onChanged: (v) => call.update(autoDetect: v),
            ),
          ],
        ],
      ),
    );
  }
}
