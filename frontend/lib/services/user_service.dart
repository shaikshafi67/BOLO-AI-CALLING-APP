import '../core/mock_data.dart';
import '../models/user.dart';

/// Profiles and contacts.
///
/// TODO: Connect backend database — routes already in backend/src/routes/user.routes.ts:
///   POST  /api/users                (create profile: name, preferredLanguage)
///   GET   /api/users/me             (load profile)
///   PATCH /api/users/me/language    (update preferred language)
///   GET   /api/users/search?q=      (find people)
/// Send the Firebase ID token as `Authorization: Bearer <token>`
/// (FirebaseAuth.instance.currentUser!.getIdToken()).
class UserService {
  Future<List<AppUser>> contacts() async => mockContacts;

  /// Prototype: creates a local-only contact entry.
  Future<AppUser> addContact(String email) async {
    await Future.delayed(const Duration(milliseconds: 500));
    final raw = email.split('@').first.replaceAll(RegExp(r'[._-]+'), ' ');
    final name = raw.split(' ').where((p) => p.isNotEmpty).map((p) => p[0].toUpperCase() + p.substring(1)).join(' ');
    return AppUser(id: 'c_${DateTime.now().millisecondsSinceEpoch}', name: name.isEmpty ? email : name, email: email, preferredLanguage: 'en');
  }
}
