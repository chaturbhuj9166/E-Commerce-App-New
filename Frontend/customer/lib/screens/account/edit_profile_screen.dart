import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../core/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/primary_button.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  late final _name = TextEditingController(text: context.read<AuthProvider>().user?.name);
  String? _localPhotoPath;
  String? _error;

  Future<void> _pickPhoto() async {
    final picked = await showModalBottomSheet<XFile>(
      context: context,
      builder: (context) => SafeArea(
        child: Wrap(children: [
          ListTile(leading: const Icon(Icons.photo_camera_outlined), title: const Text('Take a photo'), onTap: () async => Navigator.of(context).pop(await ImagePicker().pickImage(source: ImageSource.camera, maxWidth: 800))),
          ListTile(leading: const Icon(Icons.photo_library_outlined), title: const Text('Choose from gallery'), onTap: () async => Navigator.of(context).pop(await ImagePicker().pickImage(source: ImageSource.gallery, maxWidth: 800))),
        ]),
      ),
    );
    if (picked != null) setState(() => _localPhotoPath = picked.path);
  }

  Future<void> _save() async {
    setState(() => _error = null);
    final auth = context.read<AuthProvider>();
    final ok = await auth.updateProfile(name: _name.text, photoPath: _localPhotoPath);
    if (!mounted) return;
    if (ok) {
      Navigator.of(context).pop();
    } else {
      setState(() => _error = auth.error);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final loading = context.watch<AuthProvider>().loading;
    return Scaffold(
      appBar: AppBar(title: const Text('Edit Profile')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Center(
              child: GestureDetector(
                onTap: _pickPhoto,
                child: Stack(
                  children: [
                    CircleAvatar(
                      radius: 48,
                      backgroundColor: AppColors.navy,
                      backgroundImage: _localPhotoPath != null
                          ? FileImage(File(_localPhotoPath!))
                          : (user?.photoUrl != null ? NetworkImage(user!.photoUrl!) : null) as ImageProvider?,
                      child: _localPhotoPath == null && user?.photoUrl == null ? const Icon(Icons.person, color: Colors.white, size: 44) : null,
                    ),
                    Positioned(
                      right: 0,
                      bottom: 0,
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: const BoxDecoration(color: AppColors.orange, shape: BoxShape.circle),
                        child: const Icon(Icons.edit, color: Colors.white, size: 16),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 28),
            TextField(controller: _name, decoration: const InputDecoration(labelText: 'Full name')),
            if (user?.email != null) ...[
              const SizedBox(height: 14),
              TextField(enabled: false, controller: TextEditingController(text: user!.email), decoration: const InputDecoration(labelText: 'Email')),
            ],
            if (_error != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(_error!, style: const TextStyle(color: AppColors.danger))),
            const SizedBox(height: 24),
            PrimaryButton(label: 'Save Changes', loading: loading, onPressed: _save),
          ],
        ),
      ),
    );
  }
}
