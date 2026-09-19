import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/app_colors.dart';
import '../../providers/vendor_provider.dart';

/// The wholesale portal's "Message Admin" thread -- lets a verified buyer
/// reach the NTSA team directly (e.g. about a bulk order or a KYC update)
/// without going through the retail customer support flow.
class WholesaleMessagesScreen extends StatefulWidget {
  const WholesaleMessagesScreen({super.key, this.embedded = false});

  final bool embedded;

  @override
  State<WholesaleMessagesScreen> createState() => _WholesaleMessagesScreenState();
}

class _WholesaleMessagesScreenState extends State<WholesaleMessagesScreen> {
  final _controller = TextEditingController();
  final _scroll = ScrollController();
  bool _loading = true;
  bool _sending = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    try {
      await context.read<VendorProvider>().loadMessages();
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
      _scrollToEnd();
    }
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) _scroll.animateTo(_scroll.position.maxScrollExtent, duration: const Duration(milliseconds: 200), curve: Curves.easeOut);
    });
  }

  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      await context.read<VendorProvider>().sendMessage(text);
      _controller.clear();
      _scrollToEnd();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final messages = context.watch<VendorProvider>().messages;
    return Scaffold(
      appBar: AppBar(automaticallyImplyLeading: !widget.embedded, title: const Text('Message Admin')),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _error != null
                      ? Center(child: Text(_error!, style: const TextStyle(color: AppColors.danger)))
                      : messages.isEmpty
                          ? Center(
                              child: Padding(
                                padding: const EdgeInsets.all(24),
                                child: Text(
                                  'Send a message to the NTSA team about your account, an order, or anything else.',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(color: AppColors.textMuted),
                                ),
                              ),
                            )
                          : ListView.builder(
                              controller: _scroll,
                              padding: const EdgeInsets.all(14),
                              itemCount: messages.length,
                              itemBuilder: (context, i) {
                                final m = messages[i];
                                return Align(
                                  alignment: m.fromAdmin ? Alignment.centerLeft : Alignment.centerRight,
                                  child: Container(
                                    constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                                    margin: const EdgeInsets.symmetric(vertical: 5),
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                    decoration: BoxDecoration(
                                      color: m.fromAdmin ? AppColors.surface : AppColors.navy,
                                      borderRadius: BorderRadius.circular(14),
                                      border: m.fromAdmin ? Border.all(color: AppColors.border) : null,
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(m.body, style: TextStyle(color: m.fromAdmin ? AppColors.textPrimary : Colors.white, fontSize: 13.5)),
                                        const SizedBox(height: 4),
                                        Text(
                                          m.fromAdmin ? 'NTSA Support' : 'You',
                                          style: TextStyle(color: m.fromAdmin ? AppColors.textMuted : Colors.white70, fontSize: 10.5),
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
            ),
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _controller,
                        minLines: 1,
                        maxLines: 4,
                        decoration: const InputDecoration(hintText: 'Type a message…'),
                        onSubmitted: (_) => _send(),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton.filled(
                      onPressed: _sending ? null : _send,
                      style: IconButton.styleFrom(backgroundColor: AppColors.orange),
                      icon: _sending
                          ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Icon(Icons.send_rounded, color: Colors.white),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
