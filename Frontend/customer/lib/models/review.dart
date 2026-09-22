class Review {
  Review({required this.rating, required this.comment, required this.images, required this.reviewerName, required this.createdAt});

  final int rating;
  final String comment;
  final List<String> images;
  final String reviewerName;
  final DateTime createdAt;

  factory Review.fromJson(Map<String, dynamic> json) => Review(
        rating: (json['rating'] as num).toInt(),
        comment: json['comment'] as String,
        images: (json['images'] as List?)?.map((e) => e.toString()).toList() ?? const [],
        reviewerName: _name((json['user'] as Map<String, dynamic>?)?['name'] as String?),
        createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
      );

  static String _name(String? name) => name != null && name.trim().isNotEmpty ? name : 'NTSA Customer';
}
