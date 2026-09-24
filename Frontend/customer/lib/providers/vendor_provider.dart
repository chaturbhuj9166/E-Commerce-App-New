import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';
import 'package:uuid/uuid.dart';
import '../core/api_client.dart';
import '../core/image_upload.dart';
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
  VendorMessage({required this.id, required this.sender, required this.body, required this.createdAt, this.attachments = const []});
  final String id;
  final String sender; // 'VENDOR' | 'ADMIN'
  final String body;
  final DateTime createdAt;
  /// Photos and short clips sent with the message.
  final List<String> attachments;

  bool get fromAdmin => sender == 'ADMIN';

  factory VendorMessage.fromJson(Map<String, dynamic> json) => VendorMessage(
        id: json['id'] as String,
        sender: json['sender'] as String,
        body: json['body'] as String,
        createdAt: DateTime.parse(json['createdAt'] as String),
        attachments: ((json['attachments'] as List?) ?? const []).cast<String>(),
      );
}

/// One line of the wholesale cart: a product in a picked size/color (null
/// when the product has no such option). A record, so equal picks share a key.
typedef VendorLine = ({String productId, String? size, String? color});

/// Wholesale buyer session -- gated behind the vendor ID/password the super
/// admin hands out after verifying the buyer (Backend/src/routes.js
/// POST /auth/login with role VENDOR, POST /admin/vendors to create one).
/// Kept separate from AuthProvider/CartProvider/WishlistProvider: the
/// customer endpoints those use (`/cart`, `/wishlist`) are customer-only on
/// the backend, so a vendor cart is tracked locally here instead. A vendor
/// login replaces the session token; the customer's is stashed until exit.
class VendorProvider extends ChangeNotifier {
  String? name;
  VendorLimits? limits;
  List<Product> products = [];
  bool productsLoaded = false;
  String? productsError;
  final Map<VendorLine, int> cart = {};
  bool loading = false;
  String? error;
  List<VendorMessage> messages = [];
  // One key per checkout attempt, so retrying after a timeout can't place a
  // second order. Reset once the order goes through or the cart changes.
  String? _checkoutKey;

  static const noLimitsMessage = 'Your account has no order limits configured; please contact NTSA';

  bool get isSignedIn => name != null;
  int get cartCount => cart.values.fold(0, (a, b) => a + b);

  /// The backend rejects every order from a vendor without limits.
  bool get limitsMissing => isSignedIn && limits == null;

  /// Backend caps each line at 10000 units; never offer more than in stock.
  static int maxQuantity(Product p) => p.stock < 10000 ? p.stock : 10000;

  Product? productById(String id) {
    for (final p in products) {
      if (p.id == id) return p;
    }
    return null;
  }

  /// Units of a product across all its sizes/colors (stock is shared).
  int productQuantity(String productId) => cart.entries.where((e) => e.key.productId == productId).fold(0, (sum, e) => sum + e.value);

  /// Most units one line may hold: stock left after the product's other lines.
  int lineMax(VendorLine line) {
    final p = productById(line.productId);
    if (p == null) return 0;
    return maxQuantity(p) - (productQuantity(line.productId) - (cart[line] ?? 0));
  }

  int get subtotalPaise => cart.entries.fold(0, (sum, e) {
        final product = productById(e.key.productId);
        return product == null ? sum : sum + product.wholesaleFor(e.key.size) * e.value;
      });

  Future<bool> login(String username, String password) async {
    loading = true;
    error = null;
    notifyListeners();
    // Keep a signed-in customer's token so a failed login (or leaving the
    // portal later) can put it back.
    await ApiClient.instance.stashCustomerToken();
    try {
      final auth = await ApiClient.instance.post('/auth/login', data: {
        'username': username.trim(),
        'password': password,
        'role': 'VENDOR',
      }) as Map<String, dynamic>;
      await ApiClient.instance.saveToken(auth['token'] as String);
      final me = await ApiClient.instance.get('/me') as Map<String, dynamic>;
      await restore(me);
      return true;
    } catch (e) {
      error = e.toString();
      await ApiClient.instance.restoreCustomerToken();
      return false;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  /// Fills the session from a vendor's GET /me body (login or app restart).
  Future<void> restore(Map<String, dynamic> me) async {
    name = me['name'] as String? ?? 'Wholesale Partner';
    limits = me['limits'] != null ? VendorLimits.fromJson(me['limits'] as Map<String, dynamic>) : null;
    notifyListeners();
    await loadProducts();
  }

  Future<void> loadProducts() async {
    productsError = null;
    notifyListeners();
    try {
      final data = await ApiClient.instance.get('/vendor/products') as List;
      products = data.map((e) => Product.fromJson(e as Map<String, dynamic>)).toList();
      _pruneCart();
    } catch (e) {
      productsError = e.toString();
    }
    productsLoaded = true;
    notifyListeners();
  }

  /// Drops cart lines whose product (or picked option) is gone and caps the
  /// rest at what's orderable.
  void _pruneCart() {
    for (final line in cart.keys.toList()) {
      final p = productById(line.productId);
      final valid = p != null && (line.size == null || p.sizes.contains(line.size)) && (line.color == null || p.colors.contains(line.color));
      final max = valid ? lineMax(line) : 0;
      if (max <= 0) {
        cart.remove(line);
      } else if (cart[line]! > max) {
        cart[line] = max;
      } else {
        continue;
      }
      _checkoutKey = null;
    }
  }

  void setQuantity(String productId, int quantity, {String? size, String? color}) {
    final VendorLine line = (productId: productId, size: size, color: color);
    final max = lineMax(line);
    if (productById(productId) != null && quantity > max) quantity = max;
    if (quantity <= 0) {
      cart.remove(line);
    } else {
      cart[line] = quantity;
    }
    _checkoutKey = null;
    notifyListeners();
  }

  Future<String> checkout({required Map<String, dynamic> address, required String paymentMethod}) async {
    _checkoutKey ??= const Uuid().v4();
    final order = await ApiClient.instance.post('/orders', data: {
      'items': cart.entries.map((e) => {'productId': e.key.productId, 'quantity': e.value, 'size': ?e.key.size, 'color': ?e.key.color}).toList(),
      'address': address,
      'paymentMethod': paymentMethod,
      'checkoutKey': _checkoutKey,
    }) as Map<String, dynamic>;
    cart.clear();
    _checkoutKey = null;
    notifyListeners();
    return order['id'] as String;
  }

  Future<void> loadMessages() async {
    final data = await ApiClient.instance.get('/vendor/messages') as List;
    messages = data.map((e) => VendorMessage.fromJson(e as Map<String, dynamic>)).toList();
    notifyListeners();
  }

  /// Uploads one photo or clip for the admin thread and returns its URL.
  Future<String> uploadAttachment(XFile file) async {
    final form = FormData.fromMap({'file': await mediaPart(file)});
    final data = await ApiClient.instance.post('/vendor/attachments', data: form) as Map<String, dynamic>;
    return data['url'] as String;
  }

  Future<void> sendMessage(String body, {List<String> attachments = const []}) async {
    final data = await ApiClient.instance.post('/vendor/messages', data: {'body': body, 'attachments': attachments}) as Map<String, dynamic>;
    messages = [...messages, VendorMessage.fromJson(data)];
    notifyListeners();
  }

  /// Leaves the portal: puts back the customer token stashed at login, if
  /// any (returns true), otherwise clears the session token.
  Future<bool> signOut() async {
    final restored = await ApiClient.instance.restoreCustomerToken();
    reset();
    return restored;
  }

  /// Clears in-memory vendor state only (tokens untouched).
  void reset() {
    name = null;
    limits = null;
    products = [];
    productsLoaded = false;
    productsError = null;
    messages = [];
    cart.clear();
    _checkoutKey = null;
    error = null;
    notifyListeners();
  }
}
