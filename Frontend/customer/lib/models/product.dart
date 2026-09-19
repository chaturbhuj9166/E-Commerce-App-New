import 'category.dart' show ShopCategory;
import 'review.dart';

class Product {
  Product({
    required this.id,
    required this.name,
    required this.description,
    required this.pricePaise,
    required this.stock,
    required this.images,
    required this.deal,
    this.mrpPaise,
    this.wholesalePaise,
    this.colors = const [],
    this.sizes = const [],
    this.colorImages = const {},
    this.attributes = const [],
    this.category,
    this.rating,
    this.reviewCount = 0,
    this.reviews = const [],
    this.refundWindowHours = 24,
  });

  final String id;
  final String name;
  final String description;
  final int pricePaise;
  final int? mrpPaise;
  /// Only present on GET /vendor/products -- the price a signed-in
  /// wholesale buyer pays, always <= pricePaise.
  final int? wholesalePaise;
  final int stock;
  final List<String> images;
  /// Informational variant chips (screen 9's color/size selectors) -- picking
  /// one doesn't change price or stock; there's no per-variant inventory.
  final List<String> colors;
  final List<String> sizes;
  /// e.g. {"Black": "https://...", "White": "https://..."} -- when set for a
  /// color, picking that color chip shows this photo instead of the default.
  final Map<String, String> colorImages;
  /// Extra admin-defined specs, e.g. [("Capacity", "20L")] -- shown as a
  /// "Specifications" list on the product page.
  final List<(String label, String value)> attributes;
  final bool deal;
  final ShopCategory? category;
  final double? rating;
  final int reviewCount;
  /// Only present on GET /products/:id (the list endpoint omits the body).
  final List<Review> reviews;
  final int refundWindowHours;

  double get price => pricePaise / 100;
  String get image => images.isNotEmpty ? images.first : '';

  factory Product.fromJson(Map<String, dynamic> json) => Product(
        id: json['id'] as String,
        name: json['name'] as String,
        description: (json['description'] as String?) ?? '',
        pricePaise: (json['pricePaise'] as num).toInt(),
        mrpPaise: (json['mrpPaise'] as num?)?.toInt(),
        wholesalePaise: (json['wholesalePaise'] as num?)?.toInt(),
        stock: (json['stock'] as num?)?.toInt() ?? 0,
        images: (json['images'] as List?)?.map((e) => e.toString()).toList() ?? const [],
        colors: (json['colors'] as List?)?.map((e) => e.toString()).toList() ?? const [],
        sizes: (json['sizes'] as List?)?.map((e) => e.toString()).toList() ?? const [],
        colorImages: (json['colorImages'] as Map?)?.map((k, v) => MapEntry(k.toString(), v.toString())) ?? const {},
        attributes: (json['attributes'] as List?)
                ?.map((e) => ((e as Map<String, dynamic>)['label'].toString(), e['value'].toString()))
                .toList() ??
            const [],
        deal: json['deal'] as bool? ?? false,
        category: json['category'] != null ? ShopCategory.fromJson(json['category']) : null,
        rating: (json['rating'] as num?)?.toDouble(),
        reviewCount: (json['reviewCount'] as num?)?.toInt() ?? 0,
        reviews: (json['reviews'] as List?)?.map((e) => Review.fromJson(e as Map<String, dynamic>)).toList() ?? const [],
        refundWindowHours: (json['refundWindowHours'] as num?)?.toInt() ?? 24,
      );
}
