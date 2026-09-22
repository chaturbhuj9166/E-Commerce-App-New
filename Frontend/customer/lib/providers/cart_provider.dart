import 'package:flutter/foundation.dart';
import '../core/api_client.dart';
import '../models/cart_item.dart';

class CartProvider extends ChangeNotifier {
  List<CartItem> items = [];
  bool loading = false;
  String? error;

  int get count => items.fold(0, (sum, i) => sum + i.quantity);
  /// Only items that can actually be checked out.
  int get subtotalPaise => items.where((i) => i.available).fold(0, (sum, i) => sum + i.lineTotalPaise);
  bool get hasUnavailable => items.any((i) => !i.available);
  int quantityOf(String productId, {String? size, String? color}) =>
      items.where((i) => i.product.id == productId && i.size == size && i.color == color).fold(0, (sum, i) => sum + i.quantity);

  // A cart line is product + size + color; blank means "no such option".
  Map<String, dynamic> _variant(String? size, String? color) => {'size': size ?? '', 'color': color ?? ''};

  Future<void> load() async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      final data = await ApiClient.instance.get('/cart') as List;
      items = data.map((e) => CartItem.fromJson(e as Map<String, dynamic>)).toList();
    } catch (e) {
      error = e.toString();
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> setQuantity(String productId, int quantity, {String? size, String? color}) async {
    await ApiClient.instance.put('/cart/$productId', data: {'quantity': quantity, ..._variant(size, color)});
    await load();
  }

  /// Adds on top of whatever is already in the cart instead of resetting it.
  /// With [onlyIfMissing] (Buy Now) an item already in the cart is left as is.
  Future<void> add(String productId, {String? size, String? color, int quantity = 1, bool onlyIfMissing = false}) async {
    // Refetch first: this may run before the cart screen ever loaded it.
    final data = await ApiClient.instance.get('/cart') as List;
    items = data.map((e) => CartItem.fromJson(e as Map<String, dynamic>)).toList();
    final current = quantityOf(productId, size: size, color: color);
    if (onlyIfMissing && current > 0) {
      notifyListeners();
      return;
    }
    await setQuantity(productId, current + quantity, size: size, color: color);
  }

  Future<void> remove(String productId, {String? size, String? color}) async {
    await ApiClient.instance.delete('/cart/$productId', query: _variant(size, color));
    await load();
  }

  void clear() {
    items = [];
    error = null;
    notifyListeners();
  }
}
