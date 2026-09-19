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

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final data = await ApiClient.instance.get('/addresses') as List;
    if (mounted) setState(() => _addresses = data.map((e) => Address.fromJson(e as Map<String, dynamic>)).toList());
  }

  @override
  Widget build(BuildContext context) {
    final addresses = _addresses;
    return Scaffold(
      appBar: AppBar(title: const Text('My Addresses')),
      body: SafeArea(
        child: addresses == null
            ? const Center(child: CircularProgressIndicator())
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
                                  Text('+91 ${a.phone}', style: TextStyle(color: AppColors.textSecondary, fontSize: 12.5)),
                                ],
                              ),
                            ),
                            IconButton(
                              icon: Icon(Icons.delete_outline, color: AppColors.textMuted),
                              onPressed: () async {
                                await ApiClient.instance.delete('/addresses/${a.id}');
                                _load();
                              },
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
