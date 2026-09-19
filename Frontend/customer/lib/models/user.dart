class AppUser {
  AppUser({required this.id, required this.name, this.email, this.phone, this.photoUrl});

  final String id;
  final String name;
  final String? email;
  final String? phone;
  final String? photoUrl;

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        id: json['id'] as String,
        name: (json['name'] as String?)?.trim().isNotEmpty == true ? json['name'] as String : 'NTSA Customer',
        email: json['email'] as String?,
        phone: json['phone'] as String?,
        photoUrl: json['photoUrl'] as String?,
      );
}
