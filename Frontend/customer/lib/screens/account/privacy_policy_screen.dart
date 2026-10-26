import 'package:flutter/material.dart';
import '../../l10n/tr.dart';
import 'legal_text_screen.dart';

class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return LegalTextScreen(
      title: context.tr('account.privacy.title'),
      sections: [
        (
          context.tr('account.privacy.h1'),
          context.tr('account.privacy.p1'),
        ),
        (
          context.tr('account.privacy.h2'),
          context.tr('account.privacy.p2'),
        ),
        (
          context.tr('account.privacy.h3'),
          context.tr('account.privacy.p3'),
        ),
        (
          context.tr('account.privacy.h4'),
          context.tr('account.privacy.p4'),
        ),
        (
          context.tr('account.privacy.h5'),
          context.tr('account.privacy.p5'),
        ),
      ],
    );
  }
}
