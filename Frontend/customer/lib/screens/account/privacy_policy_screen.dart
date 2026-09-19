import 'package:flutter/material.dart';
import 'legal_text_screen.dart';

class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const LegalTextScreen(
      title: 'Privacy Policy',
      sections: [
        (
          'Information We Collect',
          'We collect the details you give us when creating an account (name, email, phone), delivery addresses, order and payment history, and product reviews you post.',
        ),
        (
          'How We Use It',
          'Your information is used to process orders, deliver products, provide customer support, and show you relevant offers. We never sell your personal data to third parties.',
        ),
        (
          'Payments',
          'Payments are processed securely through our payment partner. NTSA does not store your full card or bank details on its own servers.',
        ),
        (
          'Your Choices',
          'You can edit your profile, manage notification preferences, or request account deletion at any time from the Account section of the app.',
        ),
        (
          'Contact Us',
          'For any privacy questions, reach out to us from the Help & Support section.',
        ),
      ],
    );
  }
}
