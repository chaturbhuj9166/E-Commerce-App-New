import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import '../core/app_colors.dart';
import '../core/image_upload.dart';

/// A photo or short clip attached to a message in the wholesale chat. Shows
/// a small tile in the bubble; tapping opens it full screen.
class ChatAttachment extends StatelessWidget {
  const ChatAttachment({super.key, required this.url, this.size = 110, this.onRemove});

  final String url;
  final double size;

  /// When set, a small × appears -- used in the compose strip before sending.
  final VoidCallback? onRemove;

  @override
  Widget build(BuildContext context) {
    final video = isVideoUrl(url);
    final tile = ClipRRect(
      borderRadius: BorderRadius.circular(10),
      child: Container(
        width: size,
        height: size * 0.78,
        color: AppColors.navy.withValues(alpha: 0.12),
        child: video
            ? const Center(child: Icon(Icons.play_circle_fill_rounded, size: 34, color: Colors.white))
            : CachedNetworkImage(
                imageUrl: url,
                fit: BoxFit.cover,
                errorWidget: (_, _, _) => Icon(Icons.broken_image_outlined, color: AppColors.textMuted),
              ),
      ),
    );
    return Stack(
      clipBehavior: Clip.none,
      children: [
        GestureDetector(
          onTap: () => showDialog<void>(
            context: context,
            builder: (_) => _AttachmentViewer(url: url, video: video),
          ),
          child: tile,
        ),
        if (onRemove != null)
          Positioned(
            top: -6,
            right: -6,
            child: GestureDetector(
              onTap: onRemove,
              child: const CircleAvatar(radius: 11, backgroundColor: AppColors.navy, child: Icon(Icons.close_rounded, size: 14, color: Colors.white)),
            ),
          ),
      ],
    );
  }
}

class _AttachmentViewer extends StatefulWidget {
  const _AttachmentViewer({required this.url, required this.video});
  final String url;
  final bool video;

  @override
  State<_AttachmentViewer> createState() => _AttachmentViewerState();
}

class _AttachmentViewerState extends State<_AttachmentViewer> {
  VideoPlayerController? _controller;

  @override
  void initState() {
    super.initState();
    if (widget.video) {
      _controller = VideoPlayerController.networkUrl(Uri.parse(widget.url))
        ..initialize().then((_) {
          if (mounted) setState(() => _controller!.play());
        });
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    return Dialog(
      backgroundColor: Colors.black,
      insetPadding: const EdgeInsets.all(14),
      child: Stack(
        alignment: Alignment.center,
        children: [
          if (!widget.video)
            InteractiveViewer(child: CachedNetworkImage(imageUrl: widget.url, fit: BoxFit.contain))
          else if (controller != null && controller.value.isInitialized)
            AspectRatio(aspectRatio: controller.value.aspectRatio, child: VideoPlayer(controller))
          else
            const Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator(color: Colors.white)),
          if (widget.video && controller != null && controller.value.isInitialized)
            IconButton(
              iconSize: 56,
              onPressed: () => setState(() => controller.value.isPlaying ? controller.pause() : controller.play()),
              icon: Icon(controller.value.isPlaying ? Icons.pause_circle_filled_rounded : Icons.play_circle_fill_rounded, color: Colors.white70),
            ),
          Positioned(
            top: 4,
            right: 4,
            child: IconButton(onPressed: () => Navigator.of(context).pop(), icon: const Icon(Icons.close_rounded, color: Colors.white)),
          ),
        ],
      ),
    );
  }
}
