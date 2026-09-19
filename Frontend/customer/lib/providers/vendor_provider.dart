import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';
import '../core/api_client.dart';
import '../models/product.dart';

class VendorLimits {
  VendorLimits({required this.minPaise, required this.maxPaise});
  final int minPaise;
  final int maxPaise;

  factory VendorLimits.fromJson(Map<String, dynamic> json) =>
      VendorLimits(minPaise: (json['minPaise'] as num).toInt(), maxPaise: (json['maxPaise'] as num).toInt());
}

/// One message in the wholesale portal's "Message Admin" thread.
class VendorMessage {
  VendorMessage({required this.id, required this.sender, required this.body, required this.createdAt});
  final String id;
  final String sender; // 'VENDOR' | 'ADMIN'
  final String body;
  final DateTime createdAt;

  bool get fromAdmin => sender == 'ADMIN';

  factory VendorMessage.fromJson(Map<String, dynamic> json) => VendorMessage(
        id: json['id'] as String,
        sender: json['sender'] as String,
        body: json['body'] as String,
        createdAt: DateTime.parse(json['createdAt'] as String),
      );
}

/// Wholesale buyer session -- gated behind the vendor ID/password the super
/// admin hands out after verifying the buyer (Backend/src/routes.js
/// POST /auth/login with role VENDOR, POST /admin/vendors to create one).
/// Kept separate from AuthProvider/CartProvider/WishlistProvider: the
/// customer endpoints those use (`/cart`, `/wishlist`) are customer-only on
/// the backend, so a vendor cart is tracked locally here instead, and a
/// vendor login replaces the current session token entirely.
class VendorProvider extends ChangeNotifier {
  String? name;
  VendorLimits? limits;
  List<Product> products = [];
  final Map<String, int> cart = {};
  bool loading = false;
  String? error;
  List<VendorMessage> messages = [];

  bool get isSignedIn => name != null;
  int get cartCount => cart.values.fold(0, (a, b) => a + b);

  int get subtotalPaise => cart.entries.fold(0, (sum, e) {
        final product = products.firstWhere((p) => p.id == e.key, orElse: () => products.first);
        return sum + (product.wholesalePaise ?? product.pricePaise) * e.value;
      });

  Future<bool> login(String username, String password) async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      final auth = await ApiClient.instance.post('/auth/login', data: {
        'username': username.trim(),
        'password': password,
        'role': 'VENDOR',
      }) as Map<String, dynamic>;
      await ApiClient.instance.saveToken(auth['token'] as String);
      final me = await ApiClient.instance.get('/me') as Map<String, dynamic>;
      name = me['name'] as String;
      limits = me['limits'] != null ? VendorLimits.fromJson(me['limits'] as Map<String, dynamic>) : null;
      await loadProducts();
      return true;
    } catch (e) {
      error = e.toString();
      await ApiClient.instance.clearToken();
      return false;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> loadProducts() async {
    final data = await ApiClient.instance.get('/vendor/products') as List;
    products = data.map((e) => Product.fromJson(e as Map<String, dynamic>)).toList();
    notifyListeners();
  }

  void setQuantity(String productId, int quantity) {
    if (quantity <= 0) {
      cart.remove(productId);
    } else {
      cart[productId] = quantity;
    }
    notifyListeners();
  }

  Future<String> checkout({required Map<String, dynamic> address, required String paymentMethod}) async {
    final order = await ApiClient.instance.post('/orders', data: {
      'items': cart.entries.map((e) => {'productId': e.key, 'quantity': e.value}).toList(),
      'address': address,
      'paymentMethod': paymentMethod,
      'checkoutKey': const Uuid().v4(),
    }) as Map<String, dynamic>;
    cart.clear();
    notifyListeners();
    return order['id'] as String;
  }

  Future<void> loadMessages() async {
    final data = await ApiClient.instance.get('/vendor/messages') as List;
    messages = data.map((e) => VendorMessage.fromJson(e as Map<String, dynamic>)).toList();
    notifyListeners();
  }

  Future<void> sendMessage(String body) async {
    final data = await ApiClient.instance.post('/vendor/messages', data: {'body': body}) as Map<String, dynamic>;
    messages = [...messages, VendorMessage.fromJson(data)];
    notifyListeners();
  }

  Future<void> signOut() async {
    await ApiClient.instance.clearToken();
    name = null;
    limits = null;
    products = [];
    messages = [];
    cart.clear();
    notifyListeners();
  }
}
