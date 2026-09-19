import 'dart:io';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';

/// Stand-in for the real Cloudinary upload (Backend/src/services/storage.js)
/// until the client hands over live cloud storage credentials. Pictures the
/// customer picks (profile photo, review photo, etc.) are copied into the
/// app's own documents folder and referenced by local path.
class LocalMediaStore {
  LocalMediaStore._();
  static final _picker = ImagePicker();

  static Future<String?> pickAndSave({required ImageSource source, String folder = 'photos'}) async {
    final picked = await _picker.pickImage(source: source, maxWidth: 1600, imageQuality: 85);
    if (picked == null) return null;
    final dir = Directory('${(await getApplicationDocumentsDirectory()).path}/$folder');
    if (!await dir.exists()) await dir.create(recursive: true);
    final destination = '${dir.path}/${DateTime.now().millisecondsSinceEpoch}_${picked.name}';
    await File(picked.path).copy(destination);
    return destination;
  }
}
