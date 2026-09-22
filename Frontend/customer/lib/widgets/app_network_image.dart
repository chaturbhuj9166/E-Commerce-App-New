import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import '../core/app_colors.dart';

/// Every remote image in the app goes through this. On Android it's a cached
/// image; on Flutter web, hosts that don't send CORS headers (admin-pasted
/// URLs from sites like img.magnific.com) can't be decoded by CanvasKit, so
/// the web build falls back to a plain <img> element instead of failing.
class AppNetworkImage extends StatelessWidget {
  const AppNetworkImage(this.url, {super.key, this.width, this.height, this.fit = BoxFit.cover, this.error});

  final String url;
  final double? width;
  final double? height;
  final BoxFit fit;
  final Widget? error;

  Widget _error() => error ?? SizedBox(width: width, height: height, child: Icon(Icons.image_outlined, color: AppColors.textMuted));

  @override
  Widget build(BuildContext context) {
    if (url.isEmpty) return _error();
    if (kIsWeb) {
      return Image.network(url, width: width, height: height, fit: fit, webHtmlElementStrategy: WebHtmlElementStrategy.fallback, errorBuilder: (_, _, _) => _error());
    }
    return CachedNetworkImage(imageUrl: url, width: width, height: height, fit: fit, errorWidget: (_, _, _) => _error());
  }
}

/// The same fallback for places that need an [ImageProvider], e.g.
/// `CircleAvatar.backgroundImage`.
ImageProvider appImageProvider(String url) =>
    kIsWeb ? NetworkImage(url, webHtmlElementStrategy: WebHtmlElementStrategy.fallback) : CachedNetworkImageProvider(url);
