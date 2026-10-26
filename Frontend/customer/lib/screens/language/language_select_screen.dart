import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/app_colors.dart';
import '../../l10n/app_languages.dart';
import '../../l10n/tr.dart';
import '../../providers/locale_provider.dart';
import '../../widgets/primary_button.dart';

/// Picks the language the whole app is shown in.
///
/// Shown right after sign-in ([goAfterLogin]) and reachable any time from
/// Account -> Language. Tapping a language applies it straight away, so the
/// heading, button and every other screen switch to it as a live preview;
/// Continue just moves on.
class LanguageSelectScreen extends StatefulWidget {
  /// [next] is the screen to land on after Continue (the first screen after
  /// sign-in). Leave it null when opened from Account: Continue then goes back.
  const LanguageSelectScreen({super.key, this.next});

  final WidgetBuilder? next;

  @override
  State<LanguageSelectScreen> createState() => _LanguageSelectScreenState();
}

class _LanguageSelectScreenState extends State<LanguageSelectScreen> {
  final _search = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  List<AppLanguage> get _matches {
    final q = _query.trim().toLowerCase();
    if (q.isEmpty) return kLanguages;
    return kLanguages.where((l) => l.nativeName.toLowerCase().contains(q) || l.englishName.toLowerCase().contains(q) || l.code == q).toList();
  }

  void _continue() {
    final next = widget.next;
    if (next == null) {
      Navigator.of(context).pop();
      return;
    }
    Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: next), (route) => false);
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final matches = _matches;
    return Scaffold(
      appBar: widget.next == null ? AppBar(title: Text(context.tr('lang.title'))) : null,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (widget.next != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: AppColors.orange.withValues(alpha: 0.12), shape: BoxShape.circle),
                      child: Icon(Icons.translate_rounded, color: AppColors.orange, size: 28),
                    ),
                    const SizedBox(height: 16),
                  ],
                  Text(context.tr('lang.choose_title'), style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 6),
                  Text(context.tr('lang.choose_subtitle'), style: TextStyle(color: AppColors.textSecondary, fontSize: 13.5, height: 1.4)),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _search,
                    onChanged: (v) => setState(() => _query = v),
                    decoration: InputDecoration(
                      hintText: context.tr('lang.search_hint'),
                      prefixIcon: const Icon(Icons.search, size: 20),
                      suffixIcon: _query.isEmpty
                          ? null
                          : IconButton(
                              icon: const Icon(Icons.close, size: 18),
                              onPressed: () => setState(() {
                                _search.clear();
                                _query = '';
                              }),
                            ),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: matches.isEmpty
                  ? Center(child: Text(context.tr('lang.no_match'), style: TextStyle(color: AppColors.textMuted)))
                  : ListView.builder(
                      padding: const EdgeInsets.fromLTRB(24, 8, 24, 8),
                      itemCount: matches.length,
                      itemBuilder: (context, i) {
                        final l = matches[i];
                        final selected = l.code == locale.code;
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: Material(
                            color: selected ? AppColors.orange.withValues(alpha: 0.10) : AppColors.surface,
                            borderRadius: BorderRadius.circular(14),
                            child: InkWell(
                              borderRadius: BorderRadius.circular(14),
                              onTap: () => context.read<LocaleProvider>().setLanguage(l.code),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(color: selected ? AppColors.orange : AppColors.border, width: selected ? 1.6 : 1),
                                ),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(l.nativeName, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                                          if (l.englishName != l.nativeName) Text(l.englishName, style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                                        ],
                                      ),
                                    ),
                                    if (selected) Icon(Icons.check_circle_rounded, color: AppColors.orange),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 20),
              child: PrimaryButton(label: context.tr('lang.continue'), orange: true, onPressed: _continue),
            ),
          ],
        ),
      ),
    );
  }
}

/// After a successful sign-in: show the language picker, then land on [next].
void goAfterLogin(BuildContext context, WidgetBuilder next) {
  Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => LanguageSelectScreen(next: next)), (route) => false);
}
