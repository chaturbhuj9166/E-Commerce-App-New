import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/app_colors.dart';
import '../../l10n/tr.dart';
import '../../models/product.dart';
import '../../providers/shop_provider.dart';
import '../../providers/wishlist_provider.dart';
import '../../widgets/product_card.dart';
import '../products/product_details_screen.dart';

/// Photo search: pick a photo (camera or gallery), then show the catalog
/// products that look most like it.
Future<void> startPhotoSearch(BuildContext context) async {
  final source = await showModalBottomSheet<ImageSource>(
    context: context,
    useSafeArea: true,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(22))),
    builder: (sheet) => Padding(
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(width: 42, height: 4, decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2))),
          const SizedBox(height: 18),
          Text(sheet.tr('st.photo.title'), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
          const SizedBox(height: 6),
          Text(sheet.tr('st.photo.hint'), textAlign: TextAlign.center, style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(child: _SourceTile(icon: Icons.photo_camera_rounded, label: sheet.tr('st.photo.take'), onTap: () => Navigator.of(sheet).pop(ImageSource.camera))),
              const SizedBox(width: 12),
              Expanded(child: _SourceTile(icon: Icons.photo_library_rounded, label: sheet.tr('st.photo.choose'), onTap: () => Navigator.of(sheet).pop(ImageSource.gallery))),
            ],
          ),
        ],
      ),
    ),
  );
  if (source == null || !context.mounted) return;
  XFile? photo;
  try {
    // Downscaled on the device: smaller upload, and the model resizes anyway.
    photo = await ImagePicker().pickImage(source: source, maxWidth: 1280, imageQuality: 85);
  } catch (_) {
    if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(context.tr('st.photo.pick_failed'))));
    return;
  }
  if (photo == null || !context.mounted) return;
  Navigator.of(context).push(MaterialPageRoute(builder: (_) => PhotoSearchResultsScreen(photo: photo!)));
}

class _SourceTile extends StatelessWidget {
  const _SourceTile({required this.icon, required this.label, required this.onTap});
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 10),
        decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.border)),
        child: Column(
          children: [
            Icon(icon, size: 30, color: AppColors.orange),
            const SizedBox(height: 10),
            Text(label, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          ],
        ),
      ),
    );
  }
}

class PhotoSearchResultsScreen extends StatefulWidget {
  const PhotoSearchResultsScreen({super.key, required this.photo});
  final XFile photo;

  @override
  State<PhotoSearchResultsScreen> createState() => _PhotoSearchResultsScreenState();
}

class _PhotoSearchResultsScreenState extends State<PhotoSearchResultsScreen> {
  Uint8List? _bytes;
  List<Product> _products = [];
  bool _confident = true;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    widget.photo.readAsBytes().then((b) {
      if (mounted) setState(() => _bytes = b);
    });
    _search();
  }

  Future<void> _search() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final result = await context.read<ShopProvider>().visualSearch(widget.photo);
      if (!mounted) return;
      setState(() {
        _products = result.products;
        _confident = result.confident;
        _loading = false;
      });
    } on ApiException catch (e) {
      // 422 carries a readable reason ("could not read that photo").
      if (mounted) {
        setState(() {
          _error = e.statusCode == 422 ? e.message : context.tr('st.photo.failed');
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = context.tr('st.photo.failed');
          _loading = false;
        });
      }
    }
  }

  Future<void> _toggleWishlist(String id) async {
    final error = await context.read<WishlistProvider>().toggleOrReport(id);
    if (error != null && mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error)));
  }

  @override
  Widget build(BuildContext context) {
    final wishlist = context.watch<WishlistProvider>();
    return Scaffold(
      appBar: AppBar(title: Text(context.tr('st.photo.title'))),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: SizedBox(
                      width: 64,
                      height: 64,
                      child: _bytes == null ? ColoredBox(color: AppColors.background) : Image.memory(_bytes!, fit: BoxFit.cover),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(context.tr('st.photo.your_photo'), style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
                        const SizedBox(height: 2),
                        Text(
                          _loading
                              ? context.tr('st.photo.searching')
                              : _products.isEmpty
                                  ? context.tr('st.photo.none')
                                  : _confident
                                      ? context.tr('st.photo.results_title')
                                      : context.tr('st.photo.closest'),
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                        ),
                        if (!_loading && _products.isNotEmpty && !_confident)
                          Padding(padding: const EdgeInsets.only(top: 3), child: Text(context.tr('st.photo.closest_note'), style: TextStyle(color: AppColors.textSecondary, fontSize: 12))),
                      ],
                    ),
                  ),
                  IconButton(onPressed: () => startPhotoSearch(context), icon: const Icon(Icons.photo_camera_outlined), tooltip: context.tr('st.search.photo_tooltip')),
                ],
              ),
            ),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _error != null
                      ? Center(
                          child: Column(mainAxisSize: MainAxisSize.min, children: [
                            Padding(padding: const EdgeInsets.symmetric(horizontal: 24), child: Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.danger))),
                            const SizedBox(height: 12),
                            OutlinedButton(onPressed: _search, child: Text(context.tr('common.retry'))),
                          ]),
                        )
                      : _products.isEmpty
                          ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(context.tr('st.photo.none'), textAlign: TextAlign.center, style: TextStyle(color: AppColors.textMuted))))
                          : GridView.builder(
                              padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                              itemCount: _products.length,
                              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 0.63),
                              itemBuilder: (context, i) {
                                final p = _products[i];
                                return ProductCard(
                                  product: p,
                                  wished: wishlist.contains(p.id),
                                  onWishlist: () => _toggleWishlist(p.id),
                                  onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => ProductDetailsScreen(productId: p.id))),
                                );
                              },
                            ),
            ),
          ],
        ),
      ),
    );
  }
}
