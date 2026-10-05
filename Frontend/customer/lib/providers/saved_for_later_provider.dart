import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// A cart line the shopper parked for later. There's no backend for this, so it
/// stores just enough to show the line and re-add it to the cart on its own.
class SavedItem {
  SavedItem({
    required this.productId,
    required this.name,
    required this.image,
    required this.pricePaise,
    this.mrpPaise,
    this.size,
    this.color,
    this.grade,
    this.sizeLabel = 'Size',
    this.quantity = 1,
  });

  final String productId;
  final String name;
  final String image;
  final int pricePaise;
  final int? mrpPaise;
  final String? size;
  final String? color;
  final String? grade;
  final String sizeLabel;
  final int quantity;

  /// Matches the cart's variant text, e.g. "Size: 8 · Color: Black".
  String get variantText => [
        if (size != null) '$sizeLabel: $size',
        if (color != null) 'Color: $color',
        ?grade,
      ].join(' · ');

  /// Same line is same product + variant, so it never saves twice.
  bool sameLine(SavedItem o) => productId == o.productId && size == o.size && color == o.color && grade == o.grade;

  Map<String, dynamic> toJson() => {
        'productId': productId,
        'name': name,
        'image': image,
        'pricePaise': pricePaise,
        'mrpPaise': mrpPaise,
        'size': size,
        'color': color,
        'grade': grade,
        'sizeLabel': sizeLabel,
        'quantity': quantity,
      };

  factory SavedItem.fromJson(Map<String, dynamic> json) => SavedItem(
        productId: json['productId'] as String,
        name: (json['name'] as String?) ?? '',
        image: (json['image'] as String?) ?? '',
        pricePaise: (json['pricePaise'] as num?)?.toInt() ?? 0,
        mrpPaise: (json['mrpPaise'] as num?)?.toInt(),
        size: json['size'] as String?,
        color: json['color'] as String?,
        grade: json['grade'] as String?,
        sizeLabel: (json['sizeLabel'] as String?) ?? 'Size',
        quantity: (json['quantity'] as num?)?.toInt() ?? 1,
      );
}

/// "Saved for later" list, kept on-device with shared_preferences so it
/// survives restarts. Purely local -- no API involved.
class SavedForLaterProvider extends ChangeNotifier {
  static const _prefKey = 'ntsa-saved-for-later';

  List<SavedItem> items = [];
  bool _restored = false;

  Future<void> restore() async {
    if (_restored) return;
    _restored = true;
    try {
      final raw = (await SharedPreferences.getInstance()).getString(_prefKey);
      if (raw != null) {
        items = (jsonDecode(raw) as List).map((e) => SavedItem.fromJson(e as Map<String, dynamic>)).toList();
        notifyListeners();
      }
    } catch (_) {
      // A corrupt / unreadable store just starts empty.
    }
  }

  Future<void> _persist() async {
    try {
      await (await SharedPreferences.getInstance()).setString(_prefKey, jsonEncode(items.map((e) => e.toJson()).toList()));
    } catch (_) {
      // Session still works even if saving fails.
    }
  }

  Future<void> save(SavedItem item) async {
    if (items.any((e) => e.sameLine(item))) return;
    items = [item, ...items];
    notifyListeners();
    await _persist();
  }

  Future<void> remove(SavedItem item) async {
    items = items.where((e) => !e.sameLine(item)).toList();
    notifyListeners();
    await _persist();
  }

  void clear() {
    items = [];
    notifyListeners();
    _persist();
  }
}
