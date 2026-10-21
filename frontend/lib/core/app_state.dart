import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/app_notification.dart';

/// App-wide settings and state, kept deliberately simple: one ChangeNotifier
/// per concern, saved to the device with shared_preferences. Widgets listen
/// with `ListenableBuilder(listenable: AppState.instance.xxx, ...)`.
class AppState {
  AppState._();
  static final AppState instance = AppState._();

  final theme = ThemeController();
  final call = CallSettingsController();
  final notifications = NotificationsController();

  SharedPreferences? _prefs;

  Future<void> load() async {
    try {
      _prefs = await SharedPreferences.getInstance();
    } catch (_) {
      // Storage unavailable (e.g. some test environments): run with defaults.
      return;
    }
    theme._load(_prefs!);
    call._load(_prefs!);
  }

  SharedPreferences? get prefs => _prefs;
}

class ThemeController extends ChangeNotifier {
  static const _key = 'boloai.theme';
  ThemeMode _mode = ThemeMode.system;
  ThemeMode get mode => _mode;

  void _load(SharedPreferences p) {
    _mode = ThemeMode.values.firstWhere((m) => m.name == p.getString(_key), orElse: () => ThemeMode.system);
  }

  void setMode(ThemeMode mode) {
    _mode = mode;
    AppState.instance.prefs?.setString(_key, mode.name);
    notifyListeners();
  }
}

/// Call preferences used by Start Call, Join Call, Settings and the call screen.
class CallSettingsController extends ChangeNotifier {
  String myLanguage = 'hi';
  String targetLanguage = 'en';
  bool voiceTranslation = true;
  bool liveCaptions = true;
  bool autoDetect = false;
  bool micOn = true;
  bool cameraOn = true;
  bool speakerOn = true;

  void _load(SharedPreferences p) {
    myLanguage = p.getString('boloai.myLanguage') ?? myLanguage;
    targetLanguage = p.getString('boloai.targetLanguage') ?? targetLanguage;
    voiceTranslation = p.getBool('boloai.voiceTranslation') ?? voiceTranslation;
    liveCaptions = p.getBool('boloai.liveCaptions') ?? liveCaptions;
    autoDetect = p.getBool('boloai.autoDetect') ?? autoDetect;
  }

  void update({
    String? myLanguage,
    String? targetLanguage,
    bool? voiceTranslation,
    bool? liveCaptions,
    bool? autoDetect,
    bool? micOn,
    bool? cameraOn,
    bool? speakerOn,
  }) {
    this.myLanguage = myLanguage ?? this.myLanguage;
    this.targetLanguage = targetLanguage ?? this.targetLanguage;
    this.voiceTranslation = voiceTranslation ?? this.voiceTranslation;
    this.liveCaptions = liveCaptions ?? this.liveCaptions;
    this.autoDetect = autoDetect ?? this.autoDetect;
    this.micOn = micOn ?? this.micOn;
    this.cameraOn = cameraOn ?? this.cameraOn;
    this.speakerOn = speakerOn ?? this.speakerOn;

    final p = AppState.instance.prefs;
    p?.setString('boloai.myLanguage', this.myLanguage);
    p?.setString('boloai.targetLanguage', this.targetLanguage);
    p?.setBool('boloai.voiceTranslation', this.voiceTranslation);
    p?.setBool('boloai.liveCaptions', this.liveCaptions);
    p?.setBool('boloai.autoDetect', this.autoDetect);
    notifyListeners();
  }

  void swapLanguages() => update(myLanguage: targetLanguage, targetLanguage: myLanguage);

  void reset() => update(
        myLanguage: 'hi',
        targetLanguage: 'en',
        voiceTranslation: true,
        liveCaptions: true,
        autoDetect: false,
      );
}

class NotificationsController extends ChangeNotifier {
  // TODO: Connect backend database — load from GET /api/notifications and
  // receive incoming-call pushes over the signaling socket / FCM.
  List<AppNotification> items = [];

  int get unreadCount => items.where((n) => !n.read).length;

  void markRead(String id) {
    items = [for (final n in items) n.id == id ? n.markRead() : n];
    notifyListeners();
  }

  void add(AppNotification n) {
    items = [n, ...items];
    notifyListeners();
  }

  void markAllRead() {
    items = [for (final n in items) n.markRead()];
    notifyListeners();
  }

  void remove(String id) {
    items = items.where((n) => n.id != id).toList();
    notifyListeners();
  }
}
