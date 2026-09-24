import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import '../core/app_colors.dart';
import '../models/banner.dart';
import 'app_network_image.dart';

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

  @override
  void didUpdateWidget(BannerSlider oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.banners == widget.banners) return;
    if (_page >= _banners.length) {
      _page = 0;
      if (_controller.hasClients) _controller.jumpToPage(0);
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _measure(_banners[_page.clamp(0, _banners.length - 1)]);
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _measure(AppBanner banner) {
    // A clip reports its own shape once it has loaded (see _BannerVideo).
    if (banner.videoUrl != null) return;
    if (banner.imageUrl == null) {
      if (mounted) setState(() => _aspectRatio = 2.6);
      return;
    }
    final stream = appImageProvider(banner.imageUrl!).resolve(const ImageConfiguration());
    late ImageStreamListener listener;
    listener = ImageStreamListener((info, _) {
      stream.removeListener(listener);
      try {
        final ratio = info.image.width / info.image.height;
        if (mounted) setState(() => _aspectRatio = ratio.clamp(1.4, 3.2));
      } catch (_) {
        // The web <img> fallback exposes no pixel data (info.image throws
        // UnsupportedError), so the default ratio stays.
      }
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
              child: _BannerCard(
                banner: banners[i],
                onShopNow: widget.onShopNow,
                // Only the banner on screen plays; the neighbours PageView
                // builds ahead stay paused.
                playing: i == _page,
                onRatio: (ratio) {
                  if (mounted && i == _page) setState(() => _aspectRatio = ratio.clamp(1.4, 3.2));
                },
              ),
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
  const _BannerCard({required this.banner, required this.onShopNow, this.playing = true, this.onRatio});
  final AppBanner banner;
  final VoidCallback onShopNow;
  final bool playing;
  final ValueChanged<double>? onRatio;

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
            if (banner.videoUrl != null)
              _BannerVideo(url: banner.videoUrl!, poster: banner.imageUrl, playing: playing, onRatio: onRatio)
            else if (banner.imageUrl != null)
              AppNetworkImage(banner.imageUrl!, fit: BoxFit.cover, error: const SizedBox.shrink()),
            // A scrim so the title/button stay readable over any photo.
            if (banner.imageUrl != null || banner.videoUrl != null) Container(color: Colors.black.withValues(alpha: 0.32)),
            Padding(
              padding: const EdgeInsets.all(18),
              child: Row(
                children: [
                  Expanded(
                    // A wide image can leave the card under 100px tall, so the
                    // text block scales down instead of overflowing.
                    child: LayoutBuilder(
                      builder: (context, c) => FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerLeft,
                        child: SizedBox(
                          width: c.maxWidth,
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(banner.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700, height: 1.25)),
                              if (banner.subtitle != null) ...[
                                const SizedBox(height: 4),
                                Text(banner.subtitle!, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white70, fontSize: 12)),
                              ],
                              const SizedBox(height: 12),
                              ElevatedButton(
                                onPressed: onShopNow,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.orange,
                                  foregroundColor: Colors.white,
                                  minimumSize: const Size(110, 36),
                                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                  visualDensity: VisualDensity.compact,
                                  padding: const EdgeInsets.symmetric(horizontal: 16),
                                ),
                                child: Text(banner.buttonText, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                  if (banner.imageUrl == null && banner.videoUrl == null) Icon(Icons.shopping_bag_rounded, color: Colors.white.withValues(alpha: 0.85), size: 56),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}


/// The clip behind a banner: muted, looping, and started only while its page
/// is the one on screen. The poster image fills the card until the first
/// frame is ready, and a clip that will not load simply leaves the poster.
class _BannerVideo extends StatefulWidget {
  const _BannerVideo({required this.url, this.poster, required this.playing, this.onRatio});

  final String url;
  final String? poster;
  final bool playing;
  final ValueChanged<double>? onRatio;

  @override
  State<_BannerVideo> createState() => _BannerVideoState();
}

class _BannerVideoState extends State<_BannerVideo> {
  VideoPlayerController? _controller;
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final controller = VideoPlayerController.networkUrl(Uri.parse(widget.url));
    _controller = controller;
    try {
      await controller.initialize();
      await controller.setLooping(true);
      // Autoplay with sound would be rude, and browsers block it outright.
      await controller.setVolume(0);
      if (!mounted) return;
      setState(() => _ready = true);
      final size = controller.value.size;
      if (size.height > 0) widget.onRatio?.call(size.width / size.height);
      if (widget.playing) await controller.play();
    } catch (_) {
      // A missing or unplayable clip leaves the poster image showing.
      if (mounted) setState(() => _ready = false);
    }
  }

  @override
  void didUpdateWidget(_BannerVideo old) {
    super.didUpdateWidget(old);
    if (old.url != widget.url) {
      _controller?.dispose();
      _controller = null;
      _ready = false;
      _load();
      return;
    }
    final controller = _controller;
    if (!_ready || controller == null) return;
    widget.playing ? controller.play() : controller.pause();
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    if (!_ready || controller == null) {
      return widget.poster != null
          ? AppNetworkImage(widget.poster!, fit: BoxFit.cover, error: const SizedBox.shrink())
          : const SizedBox.shrink();
    }
    // The card is already sized to the clip's own shape, so cover fills it.
    return FittedBox(
      fit: BoxFit.cover,
      clipBehavior: Clip.hardEdge,
      child: SizedBox(
        width: controller.value.size.width,
        height: controller.value.size.height,
        child: VideoPlayer(controller),
      ),
    );
  }
}
