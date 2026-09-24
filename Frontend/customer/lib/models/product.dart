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
    this.condition = 'NEW',
    this.conditionNote,
    this.mrpPaise,
    this.wholesalePaise,
    this.colors = const [],
    this.sizes = const [],
    this.sizeLabel = 'Size',
    this.sizePrices = const {},
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
  /// Variant choices the shopper must make before buying. [sizes] holds any
  /// size-like option (shoe sizes, phone storage...), named by [sizeLabel].
  /// Stock is shared across variants.
  final List<String> colors;
  final List<String> sizes;
  final String sizeLabel;
  /// Per-option price overrides, e.g. {"256GB": (price, mrp, wholesale)};
  /// options without an entry cost [pricePaise]. `wholesale` is only sent to
  /// signed-in vendors (GET /vendor/products).
  final Map<String, ({int price, int? mrp, int? wholesale})> sizePrices;
  /// e.g. {"Black": "https://...", "White": "https://..."} -- when set for a
  /// color, picking that color chip shows this photo instead of the default.
  final Map<String, String> colorImages;
  /// Extra admin-defined specs, e.g. [("Capacity", "20L")] -- shown as a
  /// "Specifications" list on the product page.
  final List<(String label, String value)> attributes;
  final bool deal;
  /// NEW / REFURBISHED / OPEN_BOX / USED, with an optional line of detail.
  final String condition;
  final String? conditionNote;
  final ShopCategory? category;
  final double? rating;
  final int reviewCount;
  /// Only present on GET /products/:id (the list endpoint omits the body).
  final List<Review> reviews;
  final int refundWindowHours;

  double get price => pricePaise / 100;
  String get image => images.isNotEmpty ? images.first : '';
  bool get hasVariants => sizes.isNotEmpty || colors.isNotEmpty;
  bool get isNewStock => condition == 'NEW';
  /// Short label for the badge on listings, e.g. "Refurbished".
  String get conditionLabel => const {
        'REFURBISHED': 'Refurbished',
        'OPEN_BOX': 'Open box',
        'USED': 'Used',
      }[condition] ?? 'New';

  /// Price / MRP for a picked option (the base price when none is picked yet).
  int priceFor(String? size) => sizePrices[size]?.price ?? pricePaise;
  int? mrpFor(String? size) => sizePrices.containsKey(size) ? sizePrices[size]!.mrp : mrpPaise;
  int wholesaleFor(String? size) => sizePrices[size]?.wholesale ?? wholesalePaise ?? priceFor(size);

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
        sizeLabel: (json['sizeLabel'] as String?) ?? 'Size',
        sizePrices: (json['sizePrices'] as Map?)?.map((k, v) => MapEntry(k.toString(), (price: ((v as Map)['pricePaise'] as num).toInt(), mrp: (v['mrpPaise'] as num?)?.toInt(), wholesale: (v['wholesalePaise'] as num?)?.toInt()))) ?? const {},
        colorImages: (json['colorImages'] as Map?)?.map((k, v) => MapEntry(k.toString(), v.toString())) ?? const {},
        attributes: (json['attributes'] as List?)
                ?.map((e) => ((e as Map<String, dynamic>)['label'].toString(), e['value'].toString()))
                .toList() ??
            const [],
        deal: json['deal'] as bool? ?? false,
        condition: (json['condition'] as String?) ?? 'NEW',
        conditionNote: json['conditionNote'] as String?,
        category: json['category'] != null ? ShopCategory.fromJson(json['category']) : null,
        rating: (json['rating'] as num?)?.toDouble(),
        reviewCount: (json['reviewCount'] as num?)?.toInt() ?? 0,
        reviews: (json['reviews'] as List?)?.map((e) => Review.fromJson(e as Map<String, dynamic>)).toList() ?? const [],
        refundWindowHours: (json['refundWindowHours'] as num?)?.toInt() ?? 24,
      );
}
