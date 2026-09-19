import 'package:flutter/foundation.dart';
import '../core/api_client.dart';
import '../models/cart_item.dart';

class CartProvider extends ChangeNotifier {
  List<CartItem> items = [];
  bool loading = false;

  int get count => items.fold(0, (sum, i) => sum + i.quantity);
  int get subtotalPaise => items.fold(0, (sum, i) => sum + i.lineTotalPaise);

  Future<void> load() async {
    loading = true;
    notifyListeners();
    try {
      final data = await ApiClient.instance.get('/cart') as List;
      items = data.map((e) => CartItem.fromJson(e as Map<String, dynamic>)).toList();
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> setQuantity(String productId, int quantity) async {
    await ApiClient.instance.put('/cart/$productId', data: {'quantity': quantity});
    await load();
  }

  Future<void> remove(String productId) async {
    await ApiClient.instance.delete('/cart/$productId');
    await load();
  }
}
