class AppUser {
  final String id;
  final String name;
  final String email;
  final String preferredLanguage;
  final String? avatarUrl;

  const AppUser({
    required this.id,
    required this.name,
    required this.email,
    required this.preferredLanguage,
    this.avatarUrl,
  });
}
