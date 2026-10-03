import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/app_colors.dart';

// Contact options and a short FAQ. The phone/email/WhatsApp here are the
// NTSA support details — change these in one place if they move.
const _supportPhone = '+919166423954';
const _supportEmail = 'support@ntsa.app';
const _supportWhatsApp = '919166423954';

class HelpSupportScreen extends StatelessWidget {
  const HelpSupportScreen({super.key});

  Future<void> _open(BuildContext context, Uri uri) async {
    final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!ok && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not open that app')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Help & Support')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const Text('Get in touch', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
            const SizedBox(height: 4),
            Text('Our team is here 9am–7pm, every day.', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
            const SizedBox(height: 16),
            _ContactTile(icon: Icons.call_rounded, label: 'Call us', value: _supportPhone, onTap: () => _open(context, Uri.parse('tel:$_supportPhone'))),
            _ContactTile(icon: Icons.chat_rounded, label: 'WhatsApp', value: 'Chat on WhatsApp', onTap: () => _open(context, Uri.parse('https://wa.me/$_supportWhatsApp'))),
            _ContactTile(icon: Icons.mail_outline_rounded, label: 'Email', value: _supportEmail, onTap: () => _open(context, Uri.parse('mailto:$_supportEmail?subject=NTSA%20Support'))),
            const SizedBox(height: 28),
            const Text('Common questions', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
            const SizedBox(height: 8),
            ..._faqs.map((f) => _FaqTile(question: f.$1, answer: f.$2)),
          ],
        ),
      ),
    );
  }
}

const _faqs = <(String, String)>[
  ('How do I track my order?', 'Open Account → My Orders, tap an order to see its live status, the delivery partner and the expected delivery date.'),
  ('How do I return an item?', 'From an order that has been delivered, open it and choose Return on the item you want to send back, within its return window.'),
  ('When will I get my delivery OTP?', 'Once your order is out for delivery, open it and tap “Generate delivery OTP”. Share the 6-digit code with the rider only when you receive the order.'),
  ('How do refunds work?', 'Once a return is approved, the amount is credited back to your original payment method or NTSA wallet.'),
];

class _ContactTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final VoidCallback onTap;
  const _ContactTile({required this.icon, required this.label, required this.value, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        leading: CircleAvatar(backgroundColor: AppColors.orange.withValues(alpha: 0.12), child: Icon(icon, color: AppColors.orange)),
        title: Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(value),
        trailing: const Icon(Icons.chevron_right_rounded),
        onTap: onTap,
      ),
    );
  }
}

class _FaqTile extends StatelessWidget {
  final String question;
  final String answer;
  const _FaqTile({required this.question, required this.answer});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ExpansionTile(
        title: Text(question, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
        childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        children: [Align(alignment: Alignment.centerLeft, child: Text(answer, style: TextStyle(color: AppColors.textSecondary, fontSize: 13, height: 1.5)))],
      ),
    );
  }
}
