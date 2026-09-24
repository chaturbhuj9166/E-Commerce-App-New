import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/app_colors.dart';
import '../../models/product.dart';
import '../../providers/cart_provider.dart';
import '../../providers/shop_provider.dart';
import '../../providers/wishlist_provider.dart';
import '../../widgets/app_network_image.dart';
import '../../widgets/primary_button.dart';
import '../../widgets/price_tag.dart';
import '../../widgets/rating_stars.dart';
import '../cart/cart_screen.dart';
import 'write_review_screen.dart';

class ProductDetailsScreen extends StatefulWidget {
  const ProductDetailsScreen({super.key, required this.productId});

  final String productId;

  @override
  State<ProductDetailsScreen> createState() => _ProductDetailsScreenState();
}

class _ProductDetailsScreenState extends State<ProductDetailsScreen> {
  Product? _product;
  int _activeImage = 0;
  String? _selectedColor;
  String? _selectedSize;
  // Only a customer who has actually received this product may review it
  // (Backend enforces this too on submit -- this just controls whether the
  // button shows at all, matching the client's requirement).
  bool _canReview = false;
  bool _hasReviewed = false;
  // Separate flags so tapping one button doesn't spin the other one too.
  bool _addingToCart = false;
  bool _buyingNow = false;
  String? _error;
  // colorImages URLs usually aren't part of `images`, so the selected
  // color's photo is shown directly until the shopper taps a thumbnail.
  bool _showColorImage = false;
  // Set when the shopper tries to buy without picking a size/option.
  bool _missingSize = false;

  bool get _busy => _addingToCart || _buyingNow;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (_error != null) setState(() => _error = null);
    final List<Object?> results;
    try {
      results = await Future.wait([
        context.read<ShopProvider>().productDetails(widget.productId),
        ApiClient.instance.get('/products/${widget.productId}/review-eligibility').catchError((_) => {'canReview': false, 'hasReviewed': false}),
      ]);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
      return;
    }
    if (!mounted) return;
    final p = results[0] as Product;
    final eligibility = results[1] as Map<String, dynamic>;
    final firstLoad = _product == null;
    setState(() {
      _product = p;
      _canReview = eligibility['canReview'] as bool? ?? false;
      _hasReviewed = eligibility['hasReviewed'] as bool? ?? false;
      // A reload (after posting a review) keeps the shopper's picks.
      if (firstLoad || !p.colors.contains(_selectedColor)) _selectedColor = p.colors.isNotEmpty ? p.colors.first : null;
      // No default size: shoes, phones etc. must be picked on purpose.
      if (firstLoad || !p.sizes.contains(_selectedSize)) _selectedSize = null;
      if (_activeImage >= p.images.length) _activeImage = 0;
      if (firstLoad) _showColorImage = true;
    });
  }

  Future<void> _toggleWishlist(String id) async {
    final error = await context.read<WishlistProvider>().toggleOrReport(id);
    if (error != null && mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error)));
  }

  Future<void> _addToCart({bool buyNow = false}) async {
    final p = _product!;
    if (p.sizes.isNotEmpty && _selectedSize == null) {
      setState(() => _missingSize = true);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Please select a ${p.sizeLabel.toLowerCase()} first')));
      return;
    }
    setState(() => buyNow ? _buyingNow = true : _addingToCart = true);
    try {
      await context.read<CartProvider>().add(widget.productId, size: _selectedSize, color: _selectedColor, onlyIfMissing: buyNow);
      if (!mounted) return;
      if (buyNow) {
        Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CartScreen()));
      } else {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Added to cart')));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => buyNow ? _buyingNow = false : _addingToCart = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = _product;
    final wishlist = context.watch<WishlistProvider>();
    final colorImage = p != null && _showColorImage && _selectedColor != null ? p.colorImages[_selectedColor] : null;
    final mainImage = colorImage ?? (p == null || p.images.isEmpty ? null : p.images[_activeImage.clamp(0, p.images.length - 1)]);
    // GET /products/:id has no aggregate rating, so average the reviews it includes.
    final rating = p == null || p.reviews.isEmpty ? p?.rating : p.reviews.fold<int>(0, (s, r) => s + r.rating) / p.reviews.length;
    final reviewCount = p == null || p.reviews.isEmpty ? p?.reviewCount : p.reviews.length;
    return Scaffold(
      appBar: AppBar(
        actions: p == null
            ? null
            : [
                IconButton(
                  icon: Icon(wishlist.contains(p.id) ? Icons.favorite : Icons.favorite_border, color: wishlist.contains(p.id) ? AppColors.danger : null),
                  onPressed: () => _toggleWishlist(p.id),
                ),
                IconButton(icon: const Icon(Icons.share_outlined), onPressed: () {}),
              ],
      ),
      body: p == null
          ? Center(
              child: _error == null
                  ? const CircularProgressIndicator()
                  : Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(mainAxisSize: MainAxisSize.min, children: [
                        Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.danger)),
                        const SizedBox(height: 12),
                        OutlinedButton(onPressed: _load, child: const Text('Retry')),
                      ]),
                    ),
            )
          : SafeArea(
              child: Column(
                children: [
                  Expanded(
                    child: ListView(
                      children: [
                        AspectRatio(
                          aspectRatio: 1,
                          child: mainImage == null
                              ? Container(color: AppColors.background, child: Icon(Icons.image_outlined, size: 64, color: AppColors.textMuted))
                              : AppNetworkImage(mainImage),
                        ),
                        if (p.images.length > 1)
                          SizedBox(
                            height: 64,
                            child: ListView.separated(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                              scrollDirection: Axis.horizontal,
                              itemCount: p.images.length,
                              separatorBuilder: (context, index) => const SizedBox(width: 8),
                              itemBuilder: (_, i) => GestureDetector(
                                onTap: () => setState(() {
                                  _activeImage = i;
                                  _showColorImage = false;
                                }),
                                child: Container(
                                  width: 56,
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(color: i == _activeImage && colorImage == null ? AppColors.navy : AppColors.border, width: i == _activeImage && colorImage == null ? 2 : 1),
                                  ),
                                  child: ClipRRect(borderRadius: BorderRadius.circular(9), child: AppNetworkImage(p.images[i], width: 56, height: 48)),
                                ),
                              ),
                            ),
                          ),
                        Padding(
                          padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(p.name, style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w700)),
                              // Refurbished / open-box stock is called out before the price.
                              if (!p.isNewStock) ...[
                                const SizedBox(height: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                                  decoration: BoxDecoration(color: AppColors.orange.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(8)),
                                  child: Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Icon(Icons.info_outline_rounded, size: 16, color: AppColors.orange),
                                      const SizedBox(width: 6),
                                      Expanded(
                                        child: Text(
                                          p.conditionNote?.isNotEmpty == true ? '${p.conditionLabel} · ${p.conditionNote}' : '${p.conditionLabel} item — not brand-new stock',
                                          style: const TextStyle(fontSize: 12.5, color: AppColors.orange, fontWeight: FontWeight.w600),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                              const SizedBox(height: 6),
                              RatingStars(rating: rating, reviewCount: reviewCount, size: 14),
                              const SizedBox(height: 10),
                              PriceTag(pricePaise: p.priceFor(_selectedSize, _selectedColor), mrpPaise: p.mrpFor(_selectedSize, _selectedColor), size: 22),
                              if (p.sizePrices.isNotEmpty && _selectedSize == null)
                                Padding(
                                  padding: const EdgeInsets.only(top: 2),
                                  child: Text('Price depends on the ${p.sizeLabel.toLowerCase()} you choose', style: TextStyle(fontSize: 12, color: AppColors.orange, fontWeight: FontWeight.w500)),
                                ),
                              const SizedBox(height: 4),
                              Text('Inclusive of all taxes', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                              const SizedBox(height: 14),
                              Text(
                                p.stock > 0 ? 'In stock (${p.stock} left)' : 'Out of stock',
                                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: p.stock > 0 ? AppColors.success : AppColors.danger),
                              ),
                              if (p.colors.isNotEmpty) ...[
                                const SizedBox(height: 16),
                                Text('Color : ${_selectedColor ?? ''}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                                const SizedBox(height: 8),
                                Wrap(
                                  spacing: 8,
                                  children: p.colors.map((c) => ChoiceChip(
                                        label: Text(p.extraFor(c) > 0 ? '$c  (+${formatPaise(p.extraFor(c))})' : c),
                                        selected: _selectedColor == c,
                                        onSelected: (_) => setState(() {
                                          _selectedColor = c;
                                          // Jump the photo to this color's own image, when the
                                          // admin has set one, instead of leaving whatever was
                                          // showing (e.g. a different color's photo).
                                          _showColorImage = true;
                                          final i = p.colorImages[c] == null ? -1 : p.images.indexOf(p.colorImages[c]!);
                                          if (i != -1) _activeImage = i;
                                        }),
                                      )).toList(),
                                ),
                              ],
                              if (p.sizes.isNotEmpty) ...[
                                const SizedBox(height: 14),
                                Text(
                                  _selectedSize == null ? 'Select ${p.sizeLabel}' : '${p.sizeLabel} : $_selectedSize',
                                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: _missingSize ? AppColors.danger : null),
                                ),
                                const SizedBox(height: 8),
                                Wrap(
                                  spacing: 8,
                                  runSpacing: 8,
                                  children: p.sizes.map((s) {
                                    final extra = p.sizePrices[s] != null ? p.priceFor(s) - p.pricePaise : 0;
                                    return ChoiceChip(
                                      label: Text(extra > 0 ? '$s  (+${formatPaise(extra)})' : s),
                                      selected: _selectedSize == s,
                                      side: _missingSize ? const BorderSide(color: AppColors.danger) : null,
                                      onSelected: (_) => setState(() {
                                        _selectedSize = s;
                                        _missingSize = false;
                                      }),
                                    );
                                  }).toList(),
                                ),
                                if (_missingSize)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 6),
                                    child: Text('Please select a ${p.sizeLabel.toLowerCase()} to continue', style: const TextStyle(color: AppColors.danger, fontSize: 12)),
                                  ),
                              ],
                              const SizedBox(height: 14),
                              const Divider(),
                              const SizedBox(height: 6),
                              const Text('Description', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                              const SizedBox(height: 6),
                              Text(p.description, style: TextStyle(color: AppColors.textSecondary, fontSize: 13.5, height: 1.5)),
                              if (p.attributes.isNotEmpty) ...[
                                const SizedBox(height: 16),
                                const Divider(),
                                const SizedBox(height: 6),
                                const Text('Specifications', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                                const SizedBox(height: 8),
                                ...p.attributes.map((a) => Padding(
                                      padding: const EdgeInsets.symmetric(vertical: 4),
                                      child: Row(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          SizedBox(width: 120, child: Text(a.$1, style: TextStyle(color: AppColors.textMuted, fontSize: 13))),
                                          Expanded(child: Text(a.$2, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500))),
                                        ],
                                      ),
                                    )),
                              ],
                              const SizedBox(height: 6),
                              Row(children: [
                                Icon(Icons.replay_rounded, size: 16, color: AppColors.textSecondary),
                                const SizedBox(width: 6),
                                Text('Refundable within ${p.refundWindowHours} hours of delivery', style: TextStyle(fontSize: 12.5, color: AppColors.textSecondary)),
                              ]),
                              const SizedBox(height: 16),
                              const Divider(),
                              const SizedBox(height: 6),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text('Reviews (${p.reviews.length})', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                                  if (_canReview)
                                    TextButton(
                                      onPressed: () async {
                                        final posted = await Navigator.of(context).push<bool>(MaterialPageRoute(builder: (_) => WriteReviewScreen(productId: p.id, productName: p.name)));
                                        if (posted == true) _load();
                                      },
                                      child: Text(_hasReviewed ? 'Edit your review' : 'Write a Review'),
                                    ),
                                ],
                              ),
                              if (p.reviews.isEmpty)
                                Padding(padding: const EdgeInsets.symmetric(vertical: 12), child: Text('No reviews yet. Be the first to review this product.', style: TextStyle(color: AppColors.textMuted, fontSize: 13))),
                              ...p.reviews.map((r) => Padding(
                                    padding: const EdgeInsets.only(bottom: 14),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Text(r.reviewerName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                                            const SizedBox(width: 8),
                                            RatingStars(rating: r.rating.toDouble(), size: 11),
                                          ],
                                        ),
                                        const SizedBox(height: 4),
                                        Text(r.comment, style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                                        if (r.images.isNotEmpty) ...[
                                          const SizedBox(height: 8),
                                          SizedBox(
                                            height: 60,
                                            child: ListView.separated(
                                              scrollDirection: Axis.horizontal,
                                              itemCount: r.images.length,
                                              separatorBuilder: (context, index) => const SizedBox(width: 6),
                                              itemBuilder: (context, i) => ClipRRect(
                                                borderRadius: BorderRadius.circular(8),
                                                child: AppNetworkImage(r.images[i], width: 60, height: 60),
                                              ),
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                  )),
                              const SizedBox(height: 20),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  SafeArea(
                    top: false,
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
                      child: Row(
                        children: [
                          Expanded(
                            child: PrimaryButton(
                              label: 'Add to Cart',
                              loading: _addingToCart,
                              onPressed: p.stock == 0 || _busy ? null : () => _addToCart(),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: PrimaryButton(
                              label: 'Buy Now',
                              orange: true,
                              loading: _buyingNow,
                              onPressed: p.stock == 0 || _busy ? null : () => _addToCart(buyNow: true),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}
