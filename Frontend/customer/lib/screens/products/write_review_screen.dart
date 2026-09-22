import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/api_client.dart';
import '../../core/app_colors.dart';
import '../../core/image_upload.dart';
import '../../widgets/primary_button.dart';

class WriteReviewScreen extends StatefulWidget {
  const WriteReviewScreen({super.key, required this.productId, required this.productName});

  final String productId;
  final String productName;

  @override
  State<WriteReviewScreen> createState() => _WriteReviewScreenState();
}

class _WriteReviewScreenState extends State<WriteReviewScreen> {
  int _rating = 5;
  final _comment = TextEditingController();
  final _photos = <(XFile, Uint8List)>[]; // picked images pending upload, with preview bytes
  bool _submitting = false;
  String? _error;

  Future<void> _addPhoto() async {
    if (_photos.length >= 3) return;
    final picked = await ImagePicker().pickImage(source: ImageSource.gallery, maxWidth: 1200);
    if (picked == null) return;
    final bytes = await picked.readAsBytes();
    setState(() => _photos.add((picked, bytes)));
  }

  Future<void> _submit() async {
    if (_comment.text.trim().isEmpty) {
      setState(() => _error = 'Please write a few words about the product');
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final uploadedUrls = <String>[];
      for (final (file, _) in _photos) {
        final form = FormData.fromMap({'image': await imagePart(file)});
        final data = await ApiClient.instance.post('/uploads', data: form) as Map<String, dynamic>;
        uploadedUrls.add(data['url'] as String);
      }
      await ApiClient.instance.post('/products/${widget.productId}/reviews', data: {
        'rating': _rating,
        'comment': _comment.text.trim(),
        'images': uploadedUrls,
      });
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Write a Review')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Text(widget.productName, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            const SizedBox(height: 16),
            const Text('Your rating', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            const SizedBox(height: 8),
            Row(
              children: List.generate(5, (i) => IconButton(
                    onPressed: () => setState(() => _rating = i + 1),
                    icon: Icon(i < _rating ? Icons.star_rounded : Icons.star_border_rounded, color: AppColors.star, size: 32),
                  )),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _comment,
              maxLines: 4,
              maxLength: 1000,
              decoration: const InputDecoration(labelText: 'Share your experience', hintText: 'What did you like or dislike?'),
            ),
            const SizedBox(height: 8),
            const Text('Add photos (optional, up to 3)', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            const SizedBox(height: 8),
            Row(
              children: [
                ..._photos.map((photo) => Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: Stack(
                        children: [
                          ClipRRect(borderRadius: BorderRadius.circular(8), child: Image.memory(photo.$2, width: 64, height: 64, fit: BoxFit.cover)),
                          Positioned(
                            right: -6,
                            top: -6,
                            child: IconButton(
                              icon: const Icon(Icons.cancel, size: 18, color: AppColors.danger),
                              onPressed: () => setState(() => _photos.remove(photo)),
                            ),
                          ),
                        ],
                      ),
                    )),
                if (_photos.length < 3)
                  GestureDetector(
                    onTap: _addPhoto,
                    child: Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(border: Border.all(color: AppColors.border), borderRadius: BorderRadius.circular(8)),
                      child: Icon(Icons.add_a_photo_outlined, color: AppColors.textMuted),
                    ),
                  ),
              ],
            ),
            if (_error != null) Padding(padding: const EdgeInsets.only(top: 14), child: Text(_error!, style: const TextStyle(color: AppColors.danger))),
            const SizedBox(height: 20),
            PrimaryButton(label: 'Submit Review', loading: _submitting, onPressed: _submit),
          ],
        ),
      ),
    );
  }
}
