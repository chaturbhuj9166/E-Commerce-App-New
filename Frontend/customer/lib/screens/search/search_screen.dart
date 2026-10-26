import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/app_colors.dart';
import '../products/product_listing_screen.dart';
import '../../l10n/tr.dart';
import '../../widgets/voice_search_sheet.dart';
import 'photo_search.dart';

/// What the search screen should do the moment it opens, so the mic and camera
/// icons on the Home search bar go straight to voice or photo search.
enum SearchStart { none, voice, photo }

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key, this.start = SearchStart.none});

  final SearchStart start;

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
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (widget.start == SearchStart.voice) _voiceSearch();
      if (widget.start == SearchStart.photo) startPhotoSearch(context);
    });
  }

  Future<void> _voiceSearch() async {
    final heard = await showVoiceSearch(context);
    if (heard == null || heard.isEmpty || !mounted) return;
    _controller.text = heard;
    _search(heard);
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
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => ProductListingScreen(title: context.tr('search.results_for', {'q': q}), searchQuery: q)));
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
            autofocus: widget.start == SearchStart.none,
            maxLength: 100, // backend rejects longer search queries
            onSubmitted: _search,
            decoration: InputDecoration(counterText: '', hintText: context.tr('search.hint'), prefixIcon: const Icon(Icons.search, size: 20), suffixIcon: Row(mainAxisSize: MainAxisSize.min, children: [
              IconButton(icon: const Icon(Icons.mic_none_rounded), tooltip: context.tr('st.search.voice_tooltip'), onPressed: _voiceSearch),
              IconButton(icon: const Icon(Icons.photo_camera_outlined), tooltip: context.tr('st.search.photo_tooltip'), onPressed: () => startPhotoSearch(context)),
            ])),
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
                  Text(context.tr('search.recent'), style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                  TextButton(onPressed: _clearRecent, child: Text(context.tr('search.clear_all'))),
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
            Text(context.tr('search.trending'), style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
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
