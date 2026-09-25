import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/api_client.dart';
import '../../core/app_colors.dart';
import '../../models/order.dart';
import '../../widgets/price_tag.dart';
import '../../widgets/primary_button.dart';

class OrderTrackingScreen extends StatefulWidget {
  const OrderTrackingScreen({super.key, required this.orderId});

  final String orderId;

  @override
  State<OrderTrackingScreen> createState() => _OrderTrackingScreenState();
}

class _OrderTrackingScreenState extends State<OrderTrackingScreen> {
  Order? _order;
  String? _error;
  bool _otpBusy = false;
  bool _cancelling = false;
  bool _invoiceBusy = false;
  final Set<String> _refunding = {};

  static const _stepLabels = {
    'PLACED': 'Order Placed',
    'PACKED': 'Packed',
    'SHIPPED': 'Shipped',
    'OUT_FOR_DELIVERY': 'Out for Delivery',
    'DELIVERED': 'Delivered',
  };

  static const _refundLabels = {'REQUESTED': 'Refund requested', 'APPROVED': 'Refund approved', 'REJECTED': 'Refund rejected'};

  /// The Backend allows a buyer to cancel only before the order is packed.
  static bool _canCancel(Order order) => order.status == 'PLACED' || order.status == 'PENDING_PAYMENT';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (_error != null) setState(() => _error = null);
    try {
      final data = await ApiClient.instance.get('/orders/${widget.orderId}');
      if (mounted) setState(() => _order = Order.fromJson(data as Map<String, dynamic>));
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  void _snack(String message) {
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  /// Opens the order's bill in the system browser (Android) or a new tab
  /// (web) -- whichever PDF viewer is already there handles printing and
  /// saving, so there is no in-app PDF renderer to maintain here.
  Future<void> _viewInvoice() async {
    setState(() => _invoiceBusy = true);
    try {
      final uri = await ApiClient.instance.invoiceUrl(widget.orderId);
      final opened = await launchUrl(uri, mode: LaunchMode.externalApplication, webOnlyWindowName: '_blank');
      if (!opened) _snack('Could not open the bill');
    } catch (_) {
      _snack('Could not open the bill');
    } finally {
      if (mounted) setState(() => _invoiceBusy = false);
    }
  }

  Future<void> _getDeliveryOtp() async {
    setState(() => _otpBusy = true);
    try {
      final data = await ApiClient.instance.post('/orders/${widget.orderId}/delivery-code') as Map<String, dynamic>;
      if (!mounted) return;
      final minutes = (((data['expiresInSeconds'] as num?)?.toInt() ?? 900) / 60).round();
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Delivery OTP'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SelectableText(data['otp'].toString(), style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w800, letterSpacing: 6)),
              const SizedBox(height: 10),
              Text('Share this code with the delivery partner only when you receive your order. Valid for $minutes minutes.', textAlign: TextAlign.center, style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
            ],
          ),
          actions: [TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Done'))],
        ),
      );
    } catch (e) {
      _snack(e.toString());
    } finally {
      if (mounted) setState(() => _otpBusy = false);
    }
  }

  /// A buyer may call the order off until the shop starts packing it.
  Future<void> _cancelOrder() async {
    final reason = await showDialog<String>(context: context, builder: (_) => const _CancelDialog());
    if (reason == null || !mounted) return;
    setState(() => _cancelling = true);
    try {
      await ApiClient.instance.post('/orders/${widget.orderId}/cancel', data: {if (reason.isNotEmpty) 'reason': reason});
      _snack('Order cancelled');
      await _load();
    } catch (e) {
      _snack(e.toString());
    } finally {
      if (mounted) setState(() => _cancelling = false);
    }
  }

  Future<void> _requestRefund(OrderItem item) async {
    final reason = await showDialog<String>(context: context, builder: (_) => _RefundDialog(itemName: item.name));
    if (reason == null || !mounted) return;
    setState(() => _refunding.add(item.id));
    try {
      await ApiClient.instance.post('/orders/${widget.orderId}/refunds', data: {'itemId': item.id, 'reason': reason});
      _snack('Refund requested');
      await _load();
    } catch (e) {
      _snack(e.toString());
    } finally {
      if (mounted) setState(() => _refunding.remove(item.id));
    }
  }

  @override
  Widget build(BuildContext context) {
    final order = _order;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Order Tracking'),
        actions: [
          if (order != null)
            IconButton(
              tooltip: 'View bill',
              onPressed: _invoiceBusy ? null : _viewInvoice,
              icon: _invoiceBusy
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.receipt_long_rounded),
            ),
        ],
      ),
      body: order == null
          ? Center(
              child: _error == null
                  ? const CircularProgressIndicator()
                  : Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(mainAxisSize: MainAxisSize.min, children: [
                        Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.danger)),
                        const SizedBox(height: 12),
                        OutlinedButton(onPressed: _load, child: const Text('Retry')),
                      ]),
                    ),
            )
          : SafeArea(
              child: Column(
                children: [
                  Expanded(
                    child: RefreshIndicator(
                      onRefresh: _load,
                      child: ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          Text('Order #${order.id.substring(0, order.id.length.clamp(0, 10)).toUpperCase()}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                          Text('Placed on ${order.createdAt.day}/${order.createdAt.month}/${order.createdAt.year}', style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
                          const SizedBox(height: 24),
                          if (order.status == 'PENDING_PAYMENT')
                            const _StatusBanner(icon: Icons.hourglass_top_rounded, color: AppColors.orange, title: 'Awaiting payment', message: 'This order is reserved until payment completes. Unpaid orders are cancelled automatically after 30 minutes.')
                          else if (order.status == 'CANCELLED')
                            const _StatusBanner(icon: Icons.cancel_outlined, color: AppColors.danger, title: 'Order cancelled', message: 'This order was cancelled and will not be delivered.')
                          else
                            ..._timeline(order),
                          const SizedBox(height: 8),
                          const Text('Items', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                          const SizedBox(height: 8),
                          ...order.items.map((item) => _itemRow(order, item)),
                          const Divider(height: 24),
                          if (order.discountPaise > 0)
                            _row('Coupon${order.couponCode != null ? ' (${order.couponCode})' : ''}', '-${formatPaise(order.discountPaise)}', color: AppColors.success),
                          if (order.deliveryPaise > 0) _row('Delivery', formatPaise(order.deliveryPaise)),
                          _row('Total', formatPaise(order.totalPaise), bold: true),
                        ],
                      ),
                    ),
                  ),
                  if (order.status == 'OUT_FOR_DELIVERY')
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 6, 16, 12),
                      child: PrimaryButton(label: 'Get delivery OTP', orange: true, loading: _otpBusy, onPressed: _getDeliveryOtp),
                    ),
                  if (_canCancel(order))
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                      child: SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: _cancelling ? null : _cancelOrder,
                          icon: _cancelling
                              ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2))
                              : const Icon(Icons.close_rounded, size: 18),
                          label: const Text('Cancel order'),
                          style: OutlinedButton.styleFrom(foregroundColor: AppColors.danger, side: const BorderSide(color: AppColors.danger), padding: const EdgeInsets.symmetric(vertical: 13)),
                        ),
                      ),
                    ),
                ],
              ),
            ),
    );
  }

  List<Widget> _timeline(Order order) {
    final currentIndex = Order.statusSteps.indexOf(order.status);
    return List.generate(Order.statusSteps.length, (i) {
      final done = i <= currentIndex;
      final isLast = i == Order.statusSteps.length - 1;
      return IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Column(
              children: [
                Icon(done ? Icons.check_circle_rounded : Icons.circle_outlined, color: done ? AppColors.success : AppColors.border, size: 22),
                if (!isLast) Expanded(child: Container(width: 2, color: done ? AppColors.success : AppColors.border)),
              ],
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.only(bottom: 26),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(_stepLabels[Order.statusSteps[i]]!, style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5, color: done ? AppColors.textPrimary : AppColors.textMuted)),
                    if (done) Text('Completed', style: TextStyle(fontSize: 11.5, color: AppColors.textMuted)),
                  ],
                ),
              ),
            ),
          ],
        ),
      );
    });
  }

  Widget _itemRow(Order order, OrderItem item) {
    final refundLabel = _refundLabels[item.refundStatus];
    final canRefund = order.status == 'DELIVERED' && item.refundEligible && !order.isVendorOrder && item.id.isNotEmpty;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${item.name} × ${item.quantity}', style: const TextStyle(fontSize: 13.5)),
                if (item.variantText.isNotEmpty) Text(item.variantText, style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                if (refundLabel != null)
                  Text(refundLabel, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: item.refundStatus == 'REJECTED' ? AppColors.danger : item.refundStatus == 'APPROVED' ? AppColors.success : AppColors.orange)),
                if (canRefund)
                  TextButton(
                    style: TextButton.styleFrom(padding: EdgeInsets.zero, visualDensity: VisualDensity.compact, tapTargetSize: MaterialTapTargetSize.shrinkWrap),
                    onPressed: _refunding.contains(item.id) ? null : () => _requestRefund(item),
                    child: Text(_refunding.contains(item.id) ? 'Requesting…' : 'Request refund'),
                  ),
              ],
            ),
          ),
          Text(formatPaise(item.unitPaise * item.quantity), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
        ],
      ),
    );
  }

  Widget _row(String label, String value, {bool bold = false, Color? color}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: TextStyle(fontSize: 13.5, fontWeight: bold ? FontWeight.w700 : FontWeight.w400, color: bold ? AppColors.textPrimary : AppColors.textSecondary)),
            Text(value, style: TextStyle(fontSize: bold ? 15 : 13.5, fontWeight: FontWeight.w700, color: color ?? AppColors.textPrimary)),
          ],
        ),
      );
}

class _StatusBanner extends StatelessWidget {
  const _StatusBanner({required this.icon, required this.color, required this.title, required this.message});
  final IconData icon;
  final Color color;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TextStyle(fontWeight: FontWeight.w700, color: color)),
                const SizedBox(height: 2),
                Text(message, style: TextStyle(fontSize: 12.5, color: AppColors.textSecondary)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Confirms a cancellation; the reason is optional for a buyer.
class _CancelDialog extends StatefulWidget {
  const _CancelDialog();

  @override
  State<_CancelDialog> createState() => _CancelDialogState();
}

class _CancelDialogState extends State<_CancelDialog> {
  final _reason = TextEditingController();

  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Cancel this order?'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('The items go back on sale and any coupon you used is returned to you.', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
          const SizedBox(height: 12),
          TextField(
            controller: _reason,
            autofocus: true,
            maxLength: 300,
            decoration: const InputDecoration(labelText: 'Reason (optional)', hintText: 'e.g. Ordered by mistake', counterText: ''),
          ),
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Keep order')),
        TextButton(
          onPressed: () => Navigator.of(context).pop(_reason.text.trim()),
          style: TextButton.styleFrom(foregroundColor: AppColors.danger),
          child: const Text('Cancel order'),
        ),
      ],
    );
  }
}

class _RefundDialog extends StatefulWidget {
  const _RefundDialog({required this.itemName});
  final String itemName;

  @override
  State<_RefundDialog> createState() => _RefundDialogState();
}

class _RefundDialogState extends State<_RefundDialog> {
  final _reason = TextEditingController();

  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final valid = _reason.text.trim().length >= 5;
    return AlertDialog(
      title: const Text('Request refund'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(widget.itemName, style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
          const SizedBox(height: 10),
          TextField(
            controller: _reason,
            autofocus: true,
            maxLines: 3,
            maxLength: 1000,
            onChanged: (_) => setState(() {}),
            decoration: const InputDecoration(labelText: 'Reason', hintText: 'At least 5 characters'),
          ),
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Cancel')),
        TextButton(onPressed: valid ? () => Navigator.of(context).pop(_reason.text.trim()) : null, child: const Text('Submit')),
      ],
    );
  }
}
