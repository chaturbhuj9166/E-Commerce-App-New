import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import '../core/app_colors.dart';
import '../models/banner.dart';

/// The Home screen's top banner -- swipeable when the admin has configured
/// more than one (GET /banners). Falls back to a default look if the admin
/// hasn't set anything up yet, so Home never looks broken.
class BannerSlider extends StatefulWidget {
  const BannerSlider({super.key, required this.banners, required this.onShopNow});

  final List<AppBanner> banners;
  final VoidCallback onShopNow;

  @override
  State<BannerSlider> createState() => _BannerSliderState();
}

class _BannerSliderState extends State<BannerSlider> {
  final _controller = PageController();
  int _page = 0;
  // Matches whichever banner is currently shown, so the box is always
  // exactly that image's own shape -- no cropping, no leftover background
  // showing at the sides. Reasonable default while a size hasn't loaded yet.
  double _aspectRatio = 2.3;

  static final _fallback = AppBanner(title: 'Great Products\nBetter Living', backgroundColor: AppColors.navy, buttonText: 'Shop Now');

  List<AppBanner> get _banners => widget.banners.isEmpty ? [_fallback] : widget.banners;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _measure(_banners.first));
  }

  void _measure(AppBanner banner) {
    if (banner.imageUrl == null) {
      setState(() => _aspectRatio = 2.6);
      return;
    }
    final stream = CachedNetworkImageProvider(banner.imageUrl!).resolve(const ImageConfiguration());
    late ImageStreamListener listener;
    listener = ImageStreamListener((info, _) {
      final ratio = info.image.width / info.image.height;
      if (mounted) setState(() => _aspectRatio = ratio.clamp(1.4, 3.2));
      stream.removeListener(listener);
    }, onError: (error, stack) => stream.removeListener(listener));
    stream.addListener(listener);
  }

  @override
  Widget build(BuildContext context) {
    final banners = _banners;
    return Column(
      children: [
        AspectRatio(
          aspectRatio: _aspectRatio,
          child: PageView.builder(
            controller: _controller,
            itemCount: banners.length,
            onPageChanged: (i) {
              setState(() => _page = i);
              _measure(banners[i]);
            },
            itemBuilder: (context, i) => Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: _BannerCard(banner: banners[i], onShopNow: widget.onShopNow),
            ),
          ),
        ),
        if (banners.length > 1) ...[
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(banners.length, (i) => AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  width: i == _page ? 18 : 6,
                  height: 6,
                  decoration: BoxDecoration(color: i == _page ? AppColors.orange : AppColors.border, borderRadius: BorderRadius.circular(4)),
                )),
          ),
        ],
      ],
    );
  }
}

class _BannerCard extends StatelessWidget {
  const _BannerCard({required this.banner, required this.onShopNow});
  final AppBanner banner;
  final VoidCallback onShopNow;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: Container(
        // No padding here -- it must not inset the image layer below, or a
        // band of the plain background color shows around the edges instead
        // of the photo filling the whole card.
        decoration: BoxDecoration(color: banner.backgroundColor ?? AppColors.navy),
        child: Stack(
          fit: StackFit.expand,
          children: [
            // The surrounding box is already sized to this image's exact
            // aspect ratio (see _BannerSliderState._measure), so cover fills
            // it edge to edge without cropping or leaving gaps.
            if (banner.imageUrl != null)
              CachedNetworkImage(imageUrl: banner.imageUrl!, fit: BoxFit.cover, errorWidget: (context, url, error) => const SizedBox.shrink()),
            // A scrim so the title/button stay readable over any photo.
            if (banner.imageUrl != null) Container(color: Colors.black.withValues(alpha: 0.32)),
            Padding(
              padding: const EdgeInsets.all(18),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(banner.title, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700, height: 1.25)),
                        if (banner.subtitle != null) ...[
                          const SizedBox(height: 4),
                          Text(banner.subtitle!, style: const TextStyle(color: Colors.white70, fontSize: 12)),
                        ],
                        const SizedBox(height: 12),
                        ElevatedButton(
                          onPressed: onShopNow,
                          style: ElevatedButton.styleFrom(backgroundColor: AppColors.orange, foregroundColor: Colors.white, minimumSize: const Size(110, 36), padding: const EdgeInsets.symmetric(horizontal: 16)),
                          child: Text(banner.buttonText, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                        ),
                      ],
                    ),
                  ),
                  if (banner.imageUrl == null) Icon(Icons.shopping_bag_rounded, color: Colors.white.withValues(alpha: 0.85), size: 56),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
