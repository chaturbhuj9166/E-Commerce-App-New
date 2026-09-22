import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../core/app_colors.dart';
import '../../models/address.dart';

class AddressesScreen extends StatefulWidget {
  const AddressesScreen({super.key});

  @override
  State<AddressesScreen> createState() => _AddressesScreenState();
}

class _AddressesScreenState extends State<AddressesScreen> {
  List<Address>? _addresses;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (_error != null) setState(() => _error = null);
    try {
      final data = await ApiClient.instance.get('/addresses') as List;
      if (mounted) setState(() => _addresses = data.map((e) => Address.fromJson(e as Map<String, dynamic>)).toList());
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  Future<void> _delete(Address a) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete address?'),
        content: Text('${a.name}, ${a.line1}, ${a.city}'),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.of(context).pop(true), style: TextButton.styleFrom(foregroundColor: AppColors.danger), child: const Text('Delete')),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    try {
      await ApiClient.instance.delete('/addresses/${a.id}');
      await _load();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  @override
  Widget build(BuildContext context) {
    final addresses = _addresses;
    return Scaffold(
      appBar: AppBar(title: const Text('My Addresses')),
      body: SafeArea(
        child: addresses == null
            ? Center(
                child: _error == null
                    ? const CircularProgressIndicator()
                    : Column(mainAxisSize: MainAxisSize.min, children: [
                        Padding(padding: const EdgeInsets.symmetric(horizontal: 24), child: Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.danger))),
                        const SizedBox(height: 12),
                        OutlinedButton(onPressed: _load, child: const Text('Retry')),
                      ]),
              )
            : addresses.isEmpty
                ? Center(child: Text('No saved addresses', style: TextStyle(color: AppColors.textMuted)))
                : ListView.separated(
                    padding: const EdgeInsets.all(14),
                    itemCount: addresses.length,
                    separatorBuilder: (context, index) => const SizedBox(height: 10),
                    itemBuilder: (context, i) {
                      final a = addresses[i];
                      return Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(a.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                                  const SizedBox(height: 2),
                                  Text('${a.line1}, ${a.city}, ${a.state} - ${a.postalCode}', style: TextStyle(color: AppColors.textSecondary, fontSize: 12.5)),
                                  Text(a.phone.startsWith('+') ? a.phone : '+91 ${a.phone}', style: TextStyle(color: AppColors.textSecondary, fontSize: 12.5)),
                                ],
                              ),
                            ),
                            IconButton(
                              icon: Icon(Icons.delete_outline, color: AppColors.textMuted),
                              onPressed: () => _delete(a),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}
