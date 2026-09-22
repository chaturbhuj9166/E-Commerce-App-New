import 'product.dart';

class CartItem {
  CartItem({required this.product, required this.quantity, required this.unitPaise, this.mrpPaise, this.size, this.color, this.active = true});

  final Product product;
  int quantity;
  /// The picked variant ("" from the API means the product has no such option).
  final String? size;
  final String? color;
  /// Price of the picked option, worked out by the Backend.
  final int unitPaise;
  final int? mrpPaise;
  /// false once the admin removes the product; kept in the cart so the
  /// shopper can see and delete it, but it can't be checked out.
  final bool active;

  bool get available => active && product.stock >= quantity;
  int get lineTotalPaise => unitPaise * quantity;
  /// e.g. "Size: 8 · Color: Black", or "" when there's no variant.
  String get variantText => [
        if (size != null) '${product.sizeLabel}: $size',
        if (color != null) 'Color: $color',
      ].join(' · ');

  factory CartItem.fromJson(Map<String, dynamic> json) {
    final product = json['product'] as Map<String, dynamic>;
    final p = Product.fromJson(product);
    String? pick(Object? v) => v == null || v.toString().isEmpty ? null : v.toString();
    return CartItem(
      product: p,
      quantity: (json['quantity'] as num).toInt(),
      unitPaise: (json['unitPaise'] as num?)?.toInt() ?? p.pricePaise,
      mrpPaise: (json['mrpPaise'] as num?)?.toInt(),
      size: pick(json['size']),
      color: pick(json['color']),
      active: product['active'] as bool? ?? true,
    );
  }
}
