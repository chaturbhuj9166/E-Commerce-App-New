/// The languages the app can be shown in. Every code here has a Flutter
/// Material/Widgets localization, so dialogs, date pickers and text direction
/// (Arabic, Urdu, Persian, Hebrew read right-to-left) all follow the choice.
class AppLanguage {
  const AppLanguage(this.code, this.nativeName, this.englishName);

  /// ISO 639 code, also the file name of its translations in lib/l10n/lang/.
  final String code;

  /// The language written in itself -- what its speakers look for in a list.
  final String nativeName;
  final String englishName;
}

const List<AppLanguage> kLanguages = [
  AppLanguage('en', 'English', 'English'),
  AppLanguage('hi', 'हिन्दी', 'Hindi'),
  AppLanguage('bn', 'বাংলা', 'Bengali'),
  AppLanguage('te', 'తెలుగు', 'Telugu'),
  AppLanguage('mr', 'मराठी', 'Marathi'),
  AppLanguage('ta', 'தமிழ்', 'Tamil'),
  AppLanguage('ur', 'اردو', 'Urdu'),
  AppLanguage('gu', 'ગુજરાતી', 'Gujarati'),
  AppLanguage('kn', 'ಕನ್ನಡ', 'Kannada'),
  AppLanguage('ml', 'മലയാളം', 'Malayalam'),
  AppLanguage('or', 'ଓଡ଼ିଆ', 'Odia'),
  AppLanguage('pa', 'ਪੰਜਾਬੀ', 'Punjabi'),
  AppLanguage('as', 'অসমীয়া', 'Assamese'),
  AppLanguage('ne', 'नेपाली', 'Nepali'),
  AppLanguage('es', 'Español', 'Spanish'),
  AppLanguage('fr', 'Français', 'French'),
  AppLanguage('de', 'Deutsch', 'German'),
  AppLanguage('pt', 'Português', 'Portuguese'),
  AppLanguage('ru', 'Русский', 'Russian'),
  AppLanguage('ar', 'العربية', 'Arabic'),
  AppLanguage('zh', '简体中文', 'Chinese (Simplified)'),
  AppLanguage('ja', '日本語', 'Japanese'),
  AppLanguage('ko', '한국어', 'Korean'),
  AppLanguage('id', 'Bahasa Indonesia', 'Indonesian'),
  AppLanguage('ms', 'Bahasa Melayu', 'Malay'),
  AppLanguage('tr', 'Türkçe', 'Turkish'),
  AppLanguage('it', 'Italiano', 'Italian'),
  AppLanguage('vi', 'Tiếng Việt', 'Vietnamese'),
  AppLanguage('th', 'ไทย', 'Thai'),
  AppLanguage('nl', 'Nederlands', 'Dutch'),
  AppLanguage('pl', 'Polski', 'Polish'),
  AppLanguage('sw', 'Kiswahili', 'Swahili'),
  AppLanguage('fa', 'فارسی', 'Persian'),
  AppLanguage('he', 'עברית', 'Hebrew'),
  AppLanguage('uk', 'Українська', 'Ukrainian'),
  AppLanguage('fil', 'Filipino', 'Filipino'),
];

AppLanguage languageFor(String code) => kLanguages.firstWhere((l) => l.code == code, orElse: () => kLanguages.first);
