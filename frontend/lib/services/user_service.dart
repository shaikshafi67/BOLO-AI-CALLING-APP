import '../models/user.dart';
import 'api_client.dart';

/// Profiles and people search (backend/src/routes/user.routes.ts).
class UserService {
  /// GET /api/users/me, or null when this account has no profile yet.
  Future<AppUser?> me() async {
    try {
      return _fromJson(await ApiClient.get('/api/users/me') as Map);
    } on ApiException catch (e) {
      if (e.notFound) return null;
      rethrow;
    }
  }

  /// POST /api/users. Returns the existing profile if one was created meanwhile.
  Future<AppUser?> createProfile({required String name, required String preferredLanguage}) async {
    try {
      return _fromJson(await ApiClient.post('/api/users', {'name': name, 'preferredLanguage': preferredLanguage}) as Map);
    } on ApiException catch (e) {
      if (e.status == 409) return me();
      rethrow;
    }
  }

  /// PATCH /api/users/me/language
  Future<void> updateLanguage(String code) => ApiClient.patch('/api/users/me/language', {'preferredLanguage': code});

  /// GET /api/users/search?q= — registered people whose name matches.
  Future<List<AppUser>> search(String query) async {
    final q = query.trim();
    if (q.isEmpty) return const [];
    final rows = await ApiClient.get('/api/users/search?q=${Uri.encodeQueryComponent(q)}') as List;
    return [for (final r in rows) _fromJson(r as Map)];
  }

  /// Demo mode only: a made-up contact for the "Add contact" dialog.
  static Future<AppUser> demoContact(String email) async {
    await Future.delayed(const Duration(milliseconds: 500));
    final raw = email.split('@').first.replaceAll(RegExp(r'[._-]+'), ' ');
    final name = raw.split(' ').where((p) => p.isNotEmpty).map((p) => p[0].toUpperCase() + p.substring(1)).join(' ');
    return AppUser(id: 'c_${DateTime.now().millisecondsSinceEpoch}', name: name.isEmpty ? email : name, email: email, preferredLanguage: 'en');
  }

  static AppUser _fromJson(Map j) => AppUser(
        id: '${j['id']}',
        name: '${j['name'] ?? ''}',
        email: '${j['email'] ?? ''}',
        preferredLanguage: '${j['preferredLanguage'] ?? 'en'}',
        avatarUrl: j['avatarUrl'] as String?,
      );
}
