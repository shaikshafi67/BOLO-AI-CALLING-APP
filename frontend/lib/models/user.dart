enum Presence { online, away, busy, offline }

/// A person in the app: the signed-in user or one of their contacts.
/// Field names match the backend's users table (backend/src/models/user.model.ts).
class AppUser {
  final String id;
  final String name;
  final String email;
  final String preferredLanguage;
  final String? avatarUrl;

  // Contact-only details (mock data until the contacts API exists).
  final Presence presence;
  final String? location;
  final DateTime? lastCallAt;

  /// Stock demo footage standing in for this person's camera (asset path).
  final String? demoVideo;
  final String? demoPoster;

  const AppUser({
    required this.id,
    required this.name,
    required this.email,
    required this.preferredLanguage,
    this.avatarUrl,
    this.presence = Presence.offline,
    this.location,
    this.lastCallAt,
    this.demoVideo,
    this.demoPoster,
  });

  String get firstName => name.trim().split(RegExp(r'\s+')).first;

  String get initials {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).take(2);
    return parts.map((p) => p[0].toUpperCase()).join();
  }

  AppUser copyWith({String? name, String? preferredLanguage}) => AppUser(
        id: id,
        name: name ?? this.name,
        email: email,
        preferredLanguage: preferredLanguage ?? this.preferredLanguage,
        avatarUrl: avatarUrl,
        presence: presence,
        location: location,
        lastCallAt: lastCallAt,
        demoVideo: demoVideo,
        demoPoster: demoPoster,
      );
}
