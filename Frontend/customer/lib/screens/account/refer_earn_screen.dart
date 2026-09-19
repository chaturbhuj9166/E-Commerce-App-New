import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../core/app_colors.dart';
import '../../providers/auth_provider.dart';

/// No referral system exists in the Backend yet -- this screen is UI-only
/// until that feature is designed and given an API (referral code, ledger).
class ReferEarnScreen extends StatelessWidget {
  const ReferEarnScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final userId = context.watch<AuthProvider>().user?.id ?? 'NTSA';
    final code = 'NTSA${userId.hashCode.toString().substring(0, 4).replaceAll('-', '')}'.toUpperCase();
    return Scaffold(
      appBar: AppBar(title: const Text('Refer & Earn')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const Icon(Icons.card_giftcard_rounded, color: AppColors.orange, size: 72),
            const SizedBox(height: 16),
            const Text('Give ₹250, Get ₹250', textAlign: TextAlign.center, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            Text('Invite your friends and earn NTSA coins', textAlign: TextAlign.center, style: TextStyle(color: AppColors.textSecondary)),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border, style: BorderStyle.solid)),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(code, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16, letterSpacing: 1.2)),
                  TextButton(
                    onPressed: () {
                      Clipboard.setData(ClipboardData(text: code));
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Referral code copied')));
                    },
                    child: const Text('Copy'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Text('Share via', textAlign: TextAlign.center, style: TextStyle(color: AppColors.textSecondary, fontSize: 12.5)),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _ShareIcon(icon: Icons.chat_rounded, color: Color(0xFF25D366)),
                SizedBox(width: 16),
                _ShareIcon(icon: Icons.camera_alt_rounded, color: Color(0xFFE1306C)),
                SizedBox(width: 16),
                _ShareIcon(icon: Icons.more_horiz_rounded, color: AppColors.textSecondary),
              ],
            ),
            const SizedBox(height: 28),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: AppColors.background, borderRadius: BorderRadius.circular(12)),
              child: Column(
                children: const [
                  Text('Your Rewards', style: TextStyle(fontWeight: FontWeight.w700)),
                  SizedBox(height: 6),
                  Text('0 Coins', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.orange)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ShareIcon extends StatelessWidget {
  const _ShareIcon({required this.icon, required this.color});
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return CircleAvatar(radius: 22, backgroundColor: color.withValues(alpha: 0.12), child: Icon(icon, color: color));
  }
}
