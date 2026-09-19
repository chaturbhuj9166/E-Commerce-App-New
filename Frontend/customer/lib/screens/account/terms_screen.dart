import 'package:flutter/material.dart';
import 'legal_text_screen.dart';

class TermsScreen extends StatelessWidget {
  const TermsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const LegalTextScreen(
      title: 'Terms & Conditions',
      sections: [
        (
          'Using NTSA',
          'By creating an account and placing orders on NTSA, you agree to provide accurate information and use the app only for genuine personal or, for verified wholesale partners, business purchases.',
        ),
        (
          'Orders & Payment',
          'An order is confirmed once payment is completed or, for Cash on Delivery, once placed. Prices and stock are validated again at checkout and may change without notice.',
        ),
        (
          'Refunds',
          'Each product has its own refund window shown on the product page, starting from the moment your order is marked delivered. Refunds are credited to your NTSA wallet after review.',
        ),
        (
          'Wholesale Accounts',
          'Wholesale IDs are issued only by NTSA after verification and may be disabled at any time at NTSA\'s discretion. Wholesale pricing is for approved bulk buyers only.',
        ),
        (
          'Changes',
          'These terms may be updated from time to time; continued use of the app after a change means you accept the updated terms.',
        ),
      ],
    );
  }
}
