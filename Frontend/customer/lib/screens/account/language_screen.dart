import 'package:flutter/material.dart';
import '../language/language_select_screen.dart';

/// Account -> Language. The same picker used right after sign-in, opened on its
/// own so Continue just goes back.
class LanguageScreen extends StatelessWidget {
  const LanguageScreen({super.key});

  @override
  Widget build(BuildContext context) => const LanguageSelectScreen();
}
