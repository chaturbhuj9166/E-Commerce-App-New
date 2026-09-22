import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../core/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/bottom_nav_shell.dart';
import '../../widgets/primary_button.dart';

/// Second step of phone sign-in. In demo mode the Backend hands back the OTP
/// ([demoOtp]) instead of sending an SMS, and it's shown here so a demo can
/// be completed; with real SMS it will be null and the hint disappears.
class OtpScreen extends StatefulWidget {
  const OtpScreen({super.key, required this.phone, this.demoOtp, this.resendInSeconds = 30});

  final String phone;
  final String? demoOtp;
  final int resendInSeconds;

  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
  final _otp = TextEditingController();
  late String? _demoOtp = widget.demoOtp;
  late int _secondsLeft = widget.resendInSeconds;
  Timer? _timer;
  String? _error;

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _otp.dispose();
    super.dispose();
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) return;
      setState(() => _secondsLeft = _secondsLeft > 0 ? _secondsLeft - 1 : 0);
      if (_secondsLeft == 0) t.cancel();
    });
  }

  Future<void> _resend() async {
    final auth = context.read<AuthProvider>();
    final sent = await auth.requestOtp(widget.phone);
    if (!mounted) return;
    if (sent == null) {
      setState(() => _error = auth.error);
      return;
    }
    _otp.clear();
    setState(() {
      _error = null;
      _demoOtp = sent['demoOtp'] as String?;
      _secondsLeft = (sent['resendInSeconds'] as num?)?.toInt() ?? widget.resendInSeconds;
    });
    _startTimer();
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('A new OTP has been sent')));
  }

  Future<void> _verify() async {
    if (!RegExp(r'^\d{6}$').hasMatch(_otp.text)) {
      setState(() => _error = 'Enter the 6-digit OTP');
      return;
    }
    setState(() => _error = null);
    final auth = context.read<AuthProvider>();
    final ok = await auth.continueWithDemo(phone: widget.phone, otp: _otp.text);
    if (!mounted) return;
    if (ok) {
      Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const BottomNavShell()), (route) => false);
    } else {
      setState(() => _error = auth.error ?? 'Could not verify OTP');
    }
  }

  @override
  Widget build(BuildContext context) {
    final loading = context.watch<AuthProvider>().loading;
    return Scaffold(
      appBar: AppBar(),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          children: [
            const SizedBox(height: 16),
            const Center(child: Text('Verify your number', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800))),
            const SizedBox(height: 6),
            Center(child: Text('Enter the 6-digit code sent to +91 ${widget.phone}', textAlign: TextAlign.center, style: TextStyle(color: AppColors.textSecondary))),
            const SizedBox(height: 28),
            TextField(
              controller: _otp,
              autofocus: true,
              keyboardType: TextInputType.number,
              maxLength: 6,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700, letterSpacing: 10),
              decoration: const InputDecoration(hintText: '••••••', counterText: ''),
              onChanged: (v) {
                if (v.length == 6 && !loading) _verify();
              },
            ),
            if (_error != null) Padding(padding: const EdgeInsets.only(top: 10), child: Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.danger))),
            if (_demoOtp != null)
              Container(
                margin: const EdgeInsets.only(top: 16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: AppColors.orange.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                child: Text('Demo mode: SMS is not connected yet, so your OTP is $_demoOtp', textAlign: TextAlign.center, style: const TextStyle(fontSize: 12.5)),
              ),
            const SizedBox(height: 20),
            PrimaryButton(label: 'Verify & Continue', loading: loading, onPressed: _verify),
            const SizedBox(height: 14),
            Center(
              child: _secondsLeft > 0
                  ? Text('Resend OTP in ${_secondsLeft}s', style: TextStyle(color: AppColors.textMuted))
                  : TextButton(onPressed: loading ? null : _resend, child: const Text('Resend OTP')),
            ),
            Center(child: TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Change number'))),
          ],
        ),
      ),
    );
  }
}
