import 'package:flutter/foundation.dart';
import '../core/api_client.dart';
import '../models/product.dart';

class WishlistProvider extends ChangeNotifier {
  List<Product> items = [];
  bool loading = false;
  String? error;

  bool contains(String productId) => items.any((p) => p.id == productId);

  Future<void> load() async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      final data = await ApiClient.instance.get('/wishlist') as List;
      items = data.map((e) => Product.fromJson(e['product'] as Map<String, dynamic>)).toList();
    } catch (e) {
      error = e.toString();
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  /// Throws on failure so the caller can show it (see [toggleOrReport]).
  Future<void> toggle(String productId) async {
    if (contains(productId)) {
      await ApiClient.instance.delete('/wishlist/$productId');
    } else {
      await ApiClient.instance.put('/wishlist/$productId');
    }
    await load();
  }

  /// [toggle] for fire-and-forget taps: returns the error message instead of
  /// throwing, so a failed tap never becomes an unhandled future.
  Future<String?> toggleOrReport(String productId) async {
    try {
      await toggle(productId);
      return null;
    } catch (e) {
      return e.toString();
    }
  }

  void clear() {
    items = [];
    error = null;
    notifyListeners();
  }
}
