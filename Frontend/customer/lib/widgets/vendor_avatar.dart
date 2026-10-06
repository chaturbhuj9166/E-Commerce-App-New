import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../core/app_colors.dart';
import '../providers/vendor_provider.dart';
import 'app_network_image.dart';

/// Circular profile photo for the signed-in wholesale partner. When
/// [editable] it is tappable: picks an image and uploads it through
/// [VendorProvider.uploadPhoto], working on Flutter web too (reads bytes,
/// like the customer's Edit Profile). Falls back to the partner's initials,
/// or a storefront icon when there is no name yet.
class VendorAvatar extends StatefulWidget {
  const VendorAvatar({super.key, this.radius = 28, this.editable = true});

  final double radius;
  final bool editable;

  @override
  State<VendorAvatar> createState() => _VendorAvatarState();
}

class _VendorAvatarState extends State<VendorAvatar> {
  Uint8List? _preview; // shown right away while the upload is in flight
  bool _uploading = false;

  Future<void> _pick() async {
    final picked = await showModalBottomSheet<XFile>(
      context: context,
      builder: (context) => SafeArea(
        child: Wrap(children: [
          ListTile(leading: const Icon(Icons.photo_camera_outlined), title: const Text('Take a photo'), onTap: () async => Navigator.of(context).pop(await ImagePicker().pickImage(source: ImageSource.camera, maxWidth: 800))),
          ListTile(leading: const Icon(Icons.photo_library_outlined), title: const Text('Choose from gallery'), onTap: () async => Navigator.of(context).pop(await ImagePicker().pickImage(source: ImageSource.gallery, maxWidth: 800))),
        ]),
      ),
    );
    if (picked == null || !mounted) return;
    final bytes = await picked.readAsBytes();
    if (!mounted) return;
    final messenger = ScaffoldMessenger.of(context);
    setState(() {
      _preview = bytes;
      _uploading = true;
    });
    try {
      await context.read<VendorProvider>().uploadPhoto(picked);
    } catch (_) {
      if (mounted) {
        setState(() => _preview = null);
        messenger.showSnackBar(const SnackBar(content: Text("Couldn't update your photo. Please try again.")));
      }
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final vendor = context.watch<VendorProvider>();
    final photoUrl = vendor.photoUrl;
    final avatar = CircleAvatar(
      radius: widget.radius,
      backgroundColor: AppColors.navy,
      backgroundImage: _preview != null ? MemoryImage(_preview!) : (photoUrl != null ? appImageProvider(photoUrl) : null),
      onBackgroundImageError: _preview != null || photoUrl != null ? (_, _) {} : null,
      child: _preview == null && photoUrl == null ? _placeholder(vendor.name) : null,
    );
    if (!widget.editable) return avatar;
    return GestureDetector(
      onTap: _uploading ? null : _pick,
      child: Stack(
        children: [
          avatar,
          if (_uploading)
            Positioned.fill(
              child: Container(
                decoration: const BoxDecoration(color: Colors.black38, shape: BoxShape.circle),
                child: const Center(child: SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))),
              ),
            )
          else
            Positioned(
              right: 0,
              bottom: 0,
              child: Container(
                padding: const EdgeInsets.all(5),
                decoration: BoxDecoration(color: AppColors.orange, shape: BoxShape.circle, border: Border.all(color: AppColors.surface, width: 1.5)),
                child: const Icon(Icons.edit, color: Colors.white, size: 13),
              ),
            ),
        ],
      ),
    );
  }

  Widget _placeholder(String? name) {
    final trimmed = (name ?? '').trim();
    if (trimmed.isEmpty) return Icon(Icons.storefront_rounded, color: Colors.white, size: widget.radius);
    final parts = trimmed.split(RegExp(r'\s+'));
    final initials = (parts.length > 1 ? '${parts.first[0]}${parts.last[0]}' : parts.first[0]).toUpperCase();
    return Text(initials, style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: widget.radius * 0.7));
  }
}
