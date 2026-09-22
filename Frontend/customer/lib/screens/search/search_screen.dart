import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/app_colors.dart';
import '../products/product_listing_screen.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final _controller = TextEditingController();
  List<String> _recent = [];

  static const _trending = ['air fryer', 'laptop', 'face wash', 'running shoes', 'protein powder', 'curtains', 'kids toys', 'books'];
  static const _prefKey = 'ntsa-recent-searches';

  @override
  void initState() {
    super.initState();
    SharedPreferences.getInstance().then((prefs) {
      if (mounted) setState(() => _recent = prefs.getStringList(_prefKey) ?? []);
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _search(String query) async {
    final q = query.trim();
    if (q.isEmpty) return;
    final prefs = await SharedPreferences.getInstance();
    final updated = [q, ..._recent.where((r) => r != q)].take(8).toList();
    await prefs.setStringList(_prefKey, updated);
    if (!mounted) return;
    setState(() => _recent = updated);
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => ProductListingScreen(title: 'Results for "$q"', searchQuery: q)));
  }

  Future<void> _clearRecent() async {
    await (await SharedPreferences.getInstance()).remove(_prefKey);
    if (mounted) setState(() => _recent = []);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: Padding(
          padding: const EdgeInsets.only(right: 12),
          child: TextField(
            controller: _controller,
            autofocus: true,
            maxLength: 100, // backend rejects longer search queries
            onSubmitted: _search,
            decoration: const InputDecoration(counterText: '', hintText: 'Search for products...', prefixIcon: Icon(Icons.search, size: 20), suffixIcon: Icon(Icons.mic_none_rounded)),
          ),
        ),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (_recent.isNotEmpty) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Recent Searches', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                  TextButton(onPressed: _clearRecent, child: const Text('Clear All')),
                ],
              ),
              ..._recent.map((q) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(Icons.history, color: AppColors.textMuted, size: 20),
                    title: Text(q),
                    onTap: () => _search(q),
                  )),
              const SizedBox(height: 14),
            ],
            const Text('Trending Searches', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _trending
                  .map((t) => ActionChip(
                        label: Text(t),
                        backgroundColor: AppColors.background,
                        side: BorderSide(color: AppColors.border),
                        onPressed: () => _search(t),
                      ))
                  .toList(),
            ),
          ],
        ),
      ),
    );
  }
}
