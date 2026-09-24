import 'package:dio/dio.dart';
import 'package:image_picker/image_picker.dart';

/// Turns a picked image into a multipart part. Reads bytes instead of a file
/// path so the same code works on Android and on Flutter web (where the
/// picked "path" is a blob URL and dart:io isn't available).
Future<MultipartFile> imagePart(XFile file) async {
  final mime = file.mimeType;
  return MultipartFile.fromBytes(
    await file.readAsBytes(),
    filename: file.name,
    // Backend only accepts image/jpeg, image/png and image/webp; without an
    // explicit type Dio guesses from the filename.
    contentType: mime != null ? DioMediaType.parse(mime) : null,
  );
}

/// Same idea for a chat attachment, which may also be a short video. On
/// Android a picked video usually has no mimeType, so it is worked out from
/// the file name -- the backend only accepts a known list of types.
Future<MultipartFile> mediaPart(XFile file) async {
  const byExtension = {
    'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'webp': 'image/webp',
    'mp4': 'video/mp4', 'webm': 'video/webm', 'mov': 'video/quicktime',
  };
  final extension = file.name.split('.').last.toLowerCase();
  final mime = file.mimeType ?? byExtension[extension];
  return MultipartFile.fromBytes(
    await file.readAsBytes(),
    filename: file.name,
    contentType: mime != null ? DioMediaType.parse(mime) : null,
  );
}

/// True for a URL that points at a video rather than a photo -- Cloudinary
/// serves clips from /video/upload/, and our dev stand-in keeps the
/// extension.
bool isVideoUrl(String url) {
  final path = Uri.tryParse(url)?.path.toLowerCase() ?? url.toLowerCase();
  return path.endsWith('.mp4') || path.endsWith('.webm') || path.endsWith('.mov') || path.contains('/video/upload/');
}
