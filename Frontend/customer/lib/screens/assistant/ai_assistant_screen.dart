import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/app_colors.dart';
import '../../models/product.dart';
import '../../providers/shop_provider.dart';
import '../../widgets/app_network_image.dart';
import '../../widgets/price_tag.dart';
import '../products/product_details_screen.dart';

/// A lightweight shopping assistant: the shopper describes what they're
/// after in plain words and it searches the catalog (matching name and
/// description) for it. There's no real language model behind this -- it's
/// a keyword-cleaning heuristic over GET /products -- but it gives the same
/// "type what you want, see matching products" experience the client asked
/// for without needing a paid AI API key.
class AiAssistantScreen extends StatefulWidget {
  const AiAssistantScreen({super.key});

  @override
  State<AiAssistantScreen> createState() => _AiAssistantScreenState();
}

class _ChatMessage {
  _ChatMessage.user(this.text) : isUser = true, products = null;
  _ChatMessage.bot({this.text, this.products}) : isUser = false;

  final bool isUser;
  final String? text;
  final List<Product>? products;
}

class _AiAssistantScreenState extends State<AiAssistantScreen> {
  final _controller = TextEditingController();
  final _scroll = ScrollController();
  final List<_ChatMessage> _messages = [
    _ChatMessage.bot(text: 'Hi! Tell me what you\'re looking for -- e.g. "something to carry my laptop" or "shoes for running" -- and I\'ll find it for you.'),
  ];
  bool _loading = false;

  static const _stopWords = {
    'i', 'a', 'an', 'the', 'me', 'my', 'need', 'needs', 'want', 'wants', 'show', 'find', 'looking', 'look', 'for', 'some',
    'please', 'get', 'buy', 'have', 'has', 'is', 'are', 'with', 'and', 'to', 'of', 'you', 'can', 'do', 'there', 'any', 'good',
    'mujhe', 'chahiye', 'ek', 'ka', 'ki', 'ke', 'hai', 'dikhao', 'dikha', 'de', 'kuch', 'wala', 'wali', 'bhai', 'pls',
    'plz', 'item', 'product', 'products', 'something', 'suggest', 'recommend',
  };

  String _clean(String q) => q
      .toLowerCase()
      .split(RegExp(r'\s+'))
      .where((w) => w.isNotEmpty && !_stopWords.contains(w.replaceAll(RegExp(r'[^a-z]'), '')))
      .join(' ')
      .trim();

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) _scroll.animateTo(_scroll.position.maxScrollExtent, duration: const Duration(milliseconds: 200), curve: Curves.easeOut);
    });
  }

  Future<void> _send(String raw) async {
    final query = raw.trim();
    if (query.isEmpty || _loading) return;
    _controller.clear();
    final shop = context.read<ShopProvider>();
    setState(() {
      _messages.add(_ChatMessage.user(query));
      _loading = true;
    });
    _scrollToEnd();
    try {
      final cleaned = _clean(query);
      var results = await shop.searchProducts(cleaned.isEmpty ? query : cleaned);
      if (results.isEmpty && cleaned.isNotEmpty && cleaned != query.toLowerCase()) {
        results = await shop.searchProducts(query);
      }
      if (results.isEmpty) {
        final words = {...cleaned.split(' '), ...query.toLowerCase().split(' ')};
        for (final c in shop.categories) {
          if (words.any((w) => w.isNotEmpty && c.name.toLowerCase().contains(w))) {
            results = await shop.searchProducts('', categoryId: c.id);
            if (results.isNotEmpty) break;
          }
        }
      }
      if (!mounted) return;
      setState(() => _messages.add(results.isEmpty
          ? _ChatMessage.bot(text: 'I couldn\'t find anything matching that. Try describing it differently, or browse categories from Home.')
          : _ChatMessage.bot(products: results.take(8).toList())));
    } catch (e) {
      if (mounted) setState(() => _messages.add(_ChatMessage.bot(text: 'Something went wrong while searching. Please try again.')));
    } finally {
      if (mounted) {
        setState(() => _loading = false);
        _scrollToEnd();
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    _scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.smart_toy_rounded, color: AppColors.orange, size: 22),
            const SizedBox(width: 8),
            const Text('Shopping Assistant'),
          ],
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView.builder(
                controller: _scroll,
                padding: const EdgeInsets.all(14),
                itemCount: _messages.length + (_loading ? 1 : 0),
                itemBuilder: (context, i) {
                  if (i == _messages.length) {
                    return const Align(alignment: Alignment.centerLeft, child: Padding(padding: EdgeInsets.symmetric(vertical: 8), child: SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))));
                  }
                  final m = _messages[i];
                  if (m.isUser) {
                    return Align(
                      alignment: Alignment.centerRight,
                      child: Container(
                        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                        margin: const EdgeInsets.symmetric(vertical: 5),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(color: AppColors.navy, borderRadius: BorderRadius.circular(14)),
                        child: Text(m.text ?? '', style: const TextStyle(color: Colors.white, fontSize: 13.5)),
                      ),
                    );
                  }
                  return Align(
                    alignment: Alignment.centerLeft,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (m.text != null)
                          Container(
                            constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
                            margin: const EdgeInsets.symmetric(vertical: 5),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                            decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.border)),
                            child: Text(m.text!, style: TextStyle(color: AppColors.textPrimary, fontSize: 13.5)),
                          ),
                        if (m.products != null)
                          SizedBox(
                            height: 190,
                            child: ListView.separated(
                              scrollDirection: Axis.horizontal,
                              itemCount: m.products!.length,
                              separatorBuilder: (context, i) => const SizedBox(width: 10),
                              itemBuilder: (context, i) => _AssistantProductCard(product: m.products![i]),
                            ),
                          ),
                      ],
                    ),
                  );
                },
              ),
            ),
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _controller,
                        decoration: const InputDecoration(hintText: 'Describe what you need…'),
                        onSubmitted: _send,
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton.filled(
                      onPressed: _loading ? null : () => _send(_controller.text),
                      style: IconButton.styleFrom(backgroundColor: AppColors.orange),
                      icon: const Icon(Icons.send_rounded, color: Colors.white),
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

class _AssistantProductCard extends StatelessWidget {
  const _AssistantProductCard({required this.product});
  final Product product;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => ProductDetailsScreen(productId: product.id))),
      child: Container(
        width: 130,
        decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                child: SizedBox.expand(
                  child: product.image.isEmpty
                      ? Container(color: AppColors.background, child: Icon(Icons.image_outlined, color: AppColors.textMuted))
                      : AppNetworkImage(product.image, fit: BoxFit.cover),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 6, 8, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(product.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 11.5)),
                  const SizedBox(height: 3),
                  PriceTag(pricePaise: product.pricePaise, mrpPaise: product.mrpPaise, size: 12.5),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
