/// Named ShopCategory (not Category) because Flutter's own foundation
/// library already exports a `Category` annotation type.
class ShopCategory {
  ShopCategory({required this.id, required this.name, required this.icon});

  final String id;
  final String name;
  final String icon;

  factory ShopCategory.fromJson(Map<String, dynamic> json) => ShopCategory(
        id: json['id'] as String,
        name: json['name'] as String,
        icon: (json['icon'] as String?) ?? 'shopping_bag',
      );
}
