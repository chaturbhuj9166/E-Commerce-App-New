import 'package:flutter/foundation.dart';
import '../core/api_client.dart';
import '../models/product.dart';

class WishlistProvider extends ChangeNotifier {
  List<Product> items = [];
  bool loading = false;

  bool contains(String productId) => items.any((p) => p.id == productId);

  Future<void> load() async {
    loading = true;
    notifyListeners();
    try {
      final data = await ApiClient.instance.get('/wishlist') as List;
      items = data.map((e) => Product.fromJson(e['product'] as Map<String, dynamic>)).toList();
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> toggle(String productId) async {
    if (contains(productId)) {
      await ApiClient.instance.delete('/wishlist/$productId');
    } else {
      await ApiClient.instance.put('/wishlist/$productId');
    }
    await load();
  }
}
