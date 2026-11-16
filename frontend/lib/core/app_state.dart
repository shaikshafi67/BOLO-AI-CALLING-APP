import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/app_notification.dart';
import '../services/api_client.dart';

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

/// Notifications kept on the server (GET /api/notifications), e.g. missed
/// calls. Changes show at once and are saved in the background; the server
/// sends `notifications:changed` when it adds one.
class NotificationsController extends ChangeNotifier {
  List<AppNotification> items = [];

  int get unreadCount => items.where((n) => !n.read).length;

  bool _loading = false;

  Future<void> load() async {
    if (_loading) return;
    _loading = true;
    try {
      final rows = await ApiClient.get('/api/notifications') as List;
      items = [for (final r in rows) AppNotification.fromJson(Map<String, dynamic>.from(r as Map))];
      notifyListeners();
    } on ApiException catch (e) {
      // No profile yet means nothing to show; otherwise keep what we have.
      if (e.notFound) {
        items = [];
        notifyListeners();
      } else {
        debugPrint('[notifications] load failed: $e');
      }
    } finally {
      _loading = false;
    }
  }

  void clear() {
    items = [];
    notifyListeners();
  }

  void markRead(String id) {
    if (!items.any((n) => n.id == id && !n.read)) return;
    items = [for (final n in items) n.id == id ? n.markRead() : n];
    notifyListeners();
    _save(ApiClient.patch('/api/notifications/$id/read', const {}));
  }

  void markAllRead() {
    items = [for (final n in items) n.markRead()];
    notifyListeners();
    _save(ApiClient.post('/api/notifications/read-all', const {}));
  }

  void remove(String id) {
    items = items.where((n) => n.id != id).toList();
    notifyListeners();
    _save(ApiClient.delete('/api/notifications/$id'));
  }

  void _save(Future<dynamic> request) {
    request.catchError((Object e) {
      debugPrint('[notifications] not saved: $e');
      return null;
    });
  }
}
