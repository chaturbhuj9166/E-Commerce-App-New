class AppUser {
  AppUser({required this.id, required this.rawName, this.email, this.phone, this.photoUrl});

  final String id;
  /// Exactly what the backend stores -- may be empty for a new account, so
  /// Edit Profile doesn't pre-fill (and save) the placeholder as a real name.
  final String rawName;
  final String? email;
  final String? phone;
  final String? photoUrl;

  String get name => rawName.trim().isNotEmpty ? rawName : 'NTSA Customer';
  String get displayName => name;

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        id: json['id'] as String,
        rawName: (json['name'] as String?) ?? '',
        email: json['email'] as String?,
        phone: json['phone'] as String?,
        photoUrl: json['photoUrl'] as String?,
      );
}
