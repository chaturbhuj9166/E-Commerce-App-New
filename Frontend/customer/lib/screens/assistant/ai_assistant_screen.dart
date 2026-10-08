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
    _ChatMessage.bot(text: 'Hi! Tell me what you\'re looking for — you can add a budget or a colour too.\nTry: "shoes under 1000", "white shirt", or "headphones between 500 and 2000".'),
  ];
  bool _loading = false;

  static const _stopWords = {
    'i', 'a', 'an', 'the', 'me', 'my', 'need', 'needs', 'want', 'wants', 'show', 'find', 'looking', 'look', 'for', 'some',
    'please', 'get', 'buy', 'have', 'has', 'is', 'are', 'with', 'and', 'to', 'of', 'you', 'can', 'do', 'there', 'any', 'good',
    'mujhe', 'chahiye', 'ek', 'ka', 'ki', 'ke', 'hai', 'dikhao', 'dikha', 'de', 'kuch', 'wala', 'wali', 'bhai', 'pls',
    'plz', 'item', 'product', 'products', 'something', 'suggest', 'recommend',
  };

  // Colour words the shopper might use (English + common Hindi), mapped to the
  // colour the catalog stores, so "safed"/"white" both match a white product.
  static const _colors = {
    'white': 'white', 'safed': 'white', 'black': 'black', 'kala': 'black', 'kaala': 'black',
    'red': 'red', 'lal': 'red', 'laal': 'red', 'blue': 'blue', 'neela': 'blue', 'green': 'green', 'hara': 'green',
    'yellow': 'yellow', 'peela': 'yellow', 'pink': 'pink', 'gulabi': 'pink', 'grey': 'grey', 'gray': 'grey',
    'brown': 'brown', 'purple': 'purple', 'orange': 'orange', 'gold': 'gold', 'golden': 'gold',
    'silver': 'silver', 'navy': 'navy', 'beige': 'beige', 'maroon': 'maroon', 'cream': 'cream',
  };
  // Words that are part of a price/colour phrase, stripped out of the search term.
  static const _filterWords = {
    'rs', 'rupees', 'rupay', 'rupaye', 'under', 'below', 'less', 'than', 'within', 'upto', 'max', 'maximum',
    'above', 'over', 'more', 'min', 'minimum', 'between', 'se', 'kam', 'andar', 'niche', 'tak', 'upar', 'zyada', 'jyada',
    'daam', 'cheap', 'cheapest', 'sasta', 'costly', 'mehnga', 'expensive', 'premium', 'best', 'top', 'popular', 'rated',
    'budget', 'lowest', 'color', 'colour', 'rang', 'price', 'cost',
  };

  String _clean(String q) => q
      .toLowerCase()
      .split(RegExp(r'\s+'))
      .where((w) => w.isNotEmpty && !_stopWords.contains(w.replaceAll(RegExp(r'[^a-z]'), '')))
      .join(' ')
      .trim();

  // Pulls a price range, a colour and a sort out of the shopper's sentence, and
  // leaves the rest (e.g. "shoes") as the thing to search for.
  ({String term, int? minPrice, int? maxPrice, String? color, String? sort}) _parse(String raw) {
    var q = raw.toLowerCase();
    int? minP, maxP;
    final cur = r'(?:rs\.?|rupees?|rupay|rupaye|₹)?';
    final range = RegExp('(\\d{2,7})\\s*$cur\\s*(?:-|to|and|se)\\s*(\\d{2,7})').firstMatch(q);
    if (range != null) {
      final a = int.parse(range.group(1)!), b = int.parse(range.group(2)!);
      minP = a < b ? a : b;
      maxP = a < b ? b : a;
      q = q.replaceRange(range.start, range.end, ' ');
    } else {
      final under = RegExp('(?:under|below|less than|within|upto|up to|max|maximum)\\s*$cur\\s*(\\d{2,7})').firstMatch(q)
          ?? RegExp('(\\d{2,7})\\s*$cur\\s*(?:se kam|ke andar|ke niche|ke neeche|tak|se niche)').firstMatch(q);
      if (under != null) {
        maxP = int.parse(under.group(1)!);
        q = q.replaceRange(under.start, under.end, ' ');
      }
      final over = RegExp('(?:above|over|more than|min|minimum)\\s*$cur\\s*(\\d{2,7})').firstMatch(q)
          ?? RegExp('(\\d{2,7})\\s*$cur\\s*(?:se upar|se zyada|se jyada)').firstMatch(q);
      if (over != null) {
        minP = int.parse(over.group(1)!);
        q = q.replaceRange(over.start, over.end, ' ');
      }
    }
    String? color;
    for (final w in q.split(RegExp(r'[^a-z]+'))) {
      if (_colors.containsKey(w)) {
        color = _colors[w];
        break;
      }
    }
    String? sort;
    if (RegExp(r'cheap|sasta|lowest|budget|kam daam').hasMatch(q)) {
      sort = 'price_asc';
    } else if (RegExp(r'costly|mehnga|expensive|premium').hasMatch(q)) {
      sort = 'price_desc';
    } else if (RegExp(r'best|top|popular|rated').hasMatch(q)) {
      sort = 'rating';
    }
    final words = q.split(RegExp(r'\s+')).map((w) => w.replaceAll(RegExp(r'[^a-z]'), '')).where((w) {
      return w.isNotEmpty && !_stopWords.contains(w) && !_filterWords.contains(w) && !_colors.containsKey(w);
    }).toList();
    return (term: words.join(' ').trim(), minPrice: minP, maxPrice: maxP, color: color, sort: sort);
  }

  // Keeps only products that actually come in the asked-for colour -- matched
  // against the product's colour options, its name, or its listed attributes.
  List<Product> _filterByColor(List<Product> products, String color) {
    final c = color.toLowerCase();
    return products.where((p) =>
        p.colors.any((x) => x.toLowerCase().contains(c)) ||
        p.name.toLowerCase().contains(c) ||
        p.attributes.any((a) => a.$2.toLowerCase().contains(c))).toList();
  }

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
      final p = _parse(query);
      final term = p.term.isEmpty ? _clean(query) : p.term;
      var results = await shop.searchProducts(term, minPrice: p.minPrice, maxPrice: p.maxPrice, sort: p.sort);
      // Nothing on the cleaned term? try the raw sentence (still price-filtered).
      if (results.isEmpty && term.isNotEmpty && term != query.toLowerCase()) {
        results = await shop.searchProducts(query, minPrice: p.minPrice, maxPrice: p.maxPrice, sort: p.sort);
      }
      // Still nothing? fall back to a matching category, keeping the price range.
      if (results.isEmpty) {
        final words = {...term.split(' '), ...query.toLowerCase().split(' ')};
        for (final c in shop.categories) {
          if (words.any((w) => w.isNotEmpty && c.name.toLowerCase().contains(w))) {
            results = await shop.searchProducts('', categoryId: c.id, minPrice: p.minPrice, maxPrice: p.maxPrice, sort: p.sort);
            if (results.isNotEmpty) break;
          }
        }
      }
      // Narrow to the asked-for colour; if that leaves nothing, keep the rest
      // and say the exact colour wasn't found.
      var colorMissed = false;
      if (p.color != null && results.isNotEmpty) {
        final filtered = _filterByColor(results, p.color!);
        if (filtered.isNotEmpty) {
          results = filtered;
        } else {
          colorMissed = true;
        }
      }
      if (!mounted) return;
      if (results.isEmpty) {
        setState(() => _messages.add(_ChatMessage.bot(text: 'I couldn\'t find anything matching that. Try describing it differently, or browse categories from Home.')));
      } else {
        final bits = <String>[];
        if (p.term.isNotEmpty) bits.add(p.term);
        if (p.color != null) bits.add(p.color!);
        if (p.minPrice != null && p.maxPrice != null) {
          bits.add('₹${p.minPrice}–₹${p.maxPrice}');
        } else if (p.maxPrice != null) {
          bits.add('under ₹${p.maxPrice}');
        } else if (p.minPrice != null) {
          bits.add('above ₹${p.minPrice}');
        }
        final summary = colorMissed
            ? 'I couldn\'t find ${p.color} ones exactly, but here are the closest matches:'
            : bits.isEmpty
                ? 'Here\'s what I found:'
                : 'Here\'s what I found for ${bits.join(' · ')}:';
        setState(() => _messages.add(_ChatMessage.bot(text: summary, products: results.take(8).toList())));
      }
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
