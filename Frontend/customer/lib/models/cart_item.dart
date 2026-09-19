import 'product.dart';

class CartItem {
  CartItem({required this.product, required this.quantity});

  final Product product;
  int quantity;

  int get lineTotalPaise => product.pricePaise * quantity;

  factory CartItem.fromJson(Map<String, dynamic> json) => CartItem(
        product: Product.fromJson(json['product'] as Map<String, dynamic>),
        quantity: (json['quantity'] as num).toInt(),
      );
}
