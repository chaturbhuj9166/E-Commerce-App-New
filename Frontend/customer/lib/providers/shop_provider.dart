import 'package:flutter/foundation.dart';
import '../core/api_client.dart';
import '../models/banner.dart';
import '../models/category.dart';
import '../models/coupon.dart';
import '../models/product.dart';

class ShopProvider extends ChangeNotifier {
  List<ShopCategory> categories = [];
  List<Product> deals = [];
  List<Product> latest = [];
  List<AppBanner> banners = [];
  List<Coupon> coupons = [];
  bool loading = false;
  String? error;

  Future<void> loadHome() async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      final results = await Future.wait([
        ApiClient.instance.get('/categories'),
        ApiClient.instance.get('/products', query: {'deal': 'true'}),
        ApiClient.instance.get('/products'),
        ApiClient.instance.get('/banners'),
      ]);
      categories = (results[0] as List).map((e) => ShopCategory.fromJson(e as Map<String, dynamic>)).toList();
      deals = (results[1] as List).map((e) => Product.fromJson(e as Map<String, dynamic>)).toList();
      latest = (results[2] as List).map((e) => Product.fromJson(e as Map<String, dynamic>)).toList();
      banners = (results[3] as List).map((e) => AppBanner.fromJson(e as Map<String, dynamic>)).toList();
    } catch (e) {
      error = e.toString();
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> loadCategories() async {
    categories = (await ApiClient.instance.get('/categories') as List).map((e) => ShopCategory.fromJson(e as Map<String, dynamic>)).toList();
    notifyListeners();
  }

  Future<void> loadCoupons() async {
    coupons = (await ApiClient.instance.get('/coupons') as List).map((e) => Coupon.fromJson(e as Map<String, dynamic>)).toList();
    notifyListeners();
  }

  Future<List<Product>> searchProducts(String query, {String? categoryId}) async {
    final data = await ApiClient.instance.get('/products', query: {
      if (query.isNotEmpty) 'search': query,
      'categoryId': ?categoryId,
    });
    return (data as List).map((e) => Product.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Product> productDetails(String id) async {
    final data = await ApiClient.instance.get('/products/$id');
    return Product.fromJson(data as Map<String, dynamic>);
  }
}
