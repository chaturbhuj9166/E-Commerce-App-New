import 'package:flutter/material.dart';

/// The Home screen's top banner/slider -- fully admin-managed (image, text
/// and color come from the backend, not hardcoded).
class AppBanner {
  AppBanner({required this.title, this.subtitle, this.imageUrl, this.backgroundColor, required this.buttonText});

  final String title;
  final String? subtitle;
  final String? imageUrl;
  final Color? backgroundColor;
  final String buttonText;

  factory AppBanner.fromJson(Map<String, dynamic> json) => AppBanner(
        title: json['title'] as String,
        subtitle: json['subtitle'] as String?,
        imageUrl: json['imageUrl'] as String?,
        backgroundColor: _parseHex(json['backgroundColor'] as String?),
        buttonText: (json['buttonText'] as String?) ?? 'Shop Now',
      );

  static Color? _parseHex(String? hex) {
    if (hex == null || !RegExp(r'^#[0-9A-Fa-f]{6}$').hasMatch(hex)) return null;
    return Color(int.parse('FF${hex.substring(1)}', radix: 16));
  }
}
