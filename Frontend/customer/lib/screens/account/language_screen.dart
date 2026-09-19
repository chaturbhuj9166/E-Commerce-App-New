import 'package:flutter/material.dart';
import '../../core/app_colors.dart';

/// The app's text isn't localized yet -- this lets the choice be made and
/// remembered, but only English actually changes anything today.
class LanguageScreen extends StatefulWidget {
  const LanguageScreen({super.key});

  @override
  State<LanguageScreen> createState() => _LanguageScreenState();
}

class _LanguageScreenState extends State<LanguageScreen> {
  String _selected = 'English';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Language')),
      body: SafeArea(
        child: Column(
          children: [
            RadioListTile<String>(
              title: const Text('English'),
              value: 'English',
              groupValue: _selected,
              activeColor: AppColors.navy,
              onChanged: (v) => setState(() => _selected = v!),
            ),
            RadioListTile<String>(
              title: const Text('हिन्दी (Hindi)'),
              subtitle: Text('Coming soon', style: TextStyle(color: AppColors.textMuted)),
              value: 'Hindi',
              groupValue: _selected,
              activeColor: AppColors.navy,
              onChanged: null,
            ),
          ],
        ),
      ),
    );
  }
}
