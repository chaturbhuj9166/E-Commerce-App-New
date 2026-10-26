import 'package:flutter/material.dart';
import '../../l10n/tr.dart';
import 'legal_text_screen.dart';

class TermsScreen extends StatelessWidget {
  const TermsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return LegalTextScreen(
      title: context.tr('account.terms.title'),
      sections: [
        (
          context.tr('account.terms.h1'),
          context.tr('account.terms.p1'),
        ),
        (
          context.tr('account.terms.h2'),
          context.tr('account.terms.p2'),
        ),
        (
          context.tr('account.terms.h3'),
          context.tr('account.terms.p3'),
        ),
        (
          context.tr('account.terms.h4'),
          context.tr('account.terms.p4'),
        ),
        (
          context.tr('account.terms.h5'),
          context.tr('account.terms.p5'),
        ),
      ],
    );
  }
}
