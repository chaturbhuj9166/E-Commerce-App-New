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
