import 'dart:async';
import 'package:flutter/material.dart';
import 'package:speech_to_text/speech_to_text.dart';
import '../core/app_colors.dart';
import '../l10n/tr.dart';
import 'primary_button.dart';

/// Opens the voice-search sheet and returns what the shopper said, or null if
/// they closed it without saying anything. It listens in the app's current
/// language, so someone using the Hindi app can just speak Hindi.
Future<String?> showVoiceSearch(BuildContext context) {
  return showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(22))),
    builder: (_) => const _VoiceSearchSheet(),
  );
}

enum _Phase { starting, listening, idle, unavailable }

class _VoiceSearchSheet extends StatefulWidget {
  const _VoiceSearchSheet();

  @override
  State<_VoiceSearchSheet> createState() => _VoiceSearchSheetState();
}

class _VoiceSearchSheetState extends State<_VoiceSearchSheet> {
  final _speech = SpeechToText();
  _Phase _phase = _Phase.starting;
  String _words = '';
  bool _heardNothing = false;
  bool _ready = false;
  String? _localeId;
  Timer? _autoSubmit;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _start());
  }

  @override
  void dispose() {
    _autoSubmit?.cancel();
    _speech.cancel();
    super.dispose();
  }

  /// The speech engine's locale that matches the app's language, e.g. the app
  /// in Hindi -> "hi_IN". Falls back to the device default when none matches.
  Future<String?> _localeFor(String code) async {
    final all = await _speech.locales();
    String norm(String id) => id.replaceAll('-', '_').toLowerCase();
    final matching = all.where((l) => norm(l.localeId) == code || norm(l.localeId).startsWith('${code}_')).toList();
    if (matching.isEmpty) return null;
    // Prefer the Indian variant (en_IN, hi_IN) since that's who the app is for.
    return (matching.firstWhere((l) => norm(l.localeId).endsWith('_in'), orElse: () => matching.first)).localeId;
  }

  Future<void> _start() async {
    if (!mounted) return;
    _autoSubmit?.cancel();
    final code = Localizations.localeOf(context).languageCode;
    setState(() {
      _phase = _Phase.starting;
      _heardNothing = false;
    });
    try {
      if (!_ready) {
        _ready = await _speech.initialize(
          onStatus: (status) {
            // The engine stops by itself after a pause in speech.
            if (!mounted || status != SpeechToText.doneStatus && status != SpeechToText.notListeningStatus) return;
            if (_phase == _Phase.listening) _finish();
          },
          onError: (_) {
            if (mounted && _phase == _Phase.listening) _finish();
          },
        );
        if (_ready) _localeId = await _localeFor(code);
      }
      if (!_ready) {
        if (mounted) setState(() => _phase = _Phase.unavailable);
        return;
      }
      _words = '';
      await _speech.listen(
        onResult: (r) {
          if (!mounted) return;
          setState(() => _words = r.recognizedWords);
          if (r.finalResult) _finish();
        },
        listenOptions: SpeechListenOptions(
          partialResults: true,
          cancelOnError: true,
          listenMode: ListenMode.search,
          listenFor: const Duration(seconds: 30),
          pauseFor: const Duration(seconds: 3),
          localeId: _localeId,
        ),
      );
      if (mounted) setState(() => _phase = _Phase.listening);
    } catch (_) {
      if (mounted) setState(() => _phase = _Phase.unavailable);
    }
  }

  void _finish() {
    if (!mounted) return;
    _speech.stop();
    setState(() {
      _phase = _Phase.idle;
      _heardNothing = _words.trim().isEmpty;
    });
    // Once the shopper stops speaking, search after a beat so they can see what
    // was heard; "Try again" or the mic cancels it.
    if (!_heardNothing) {
      _autoSubmit?.cancel();
      _autoSubmit = Timer(const Duration(milliseconds: 1200), () {
        if (mounted) Navigator.of(context).pop(_words.trim());
      });
    }
  }

  void _toggle() {
    if (_phase == _Phase.listening) {
      _finish();
    } else {
      _start();
    }
  }

  @override
  Widget build(BuildContext context) {
    final listening = _phase == _Phase.listening;
    final hasWords = _words.trim().isNotEmpty;
    final status = switch (_phase) {
      _Phase.unavailable => context.tr('st.voice.not_available'),
      _Phase.listening => context.tr('st.voice.listening'),
      _Phase.starting => context.tr('common.loading'),
      _Phase.idle => _heardNothing ? context.tr('st.voice.no_speech') : context.tr('st.voice.tap_to_speak'),
    };
    return Padding(
      padding: EdgeInsets.fromLTRB(24, 14, 24, 24 + MediaQuery.of(context).viewInsets.bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(width: 42, height: 4, decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2))),
          const SizedBox(height: 18),
          Text(context.tr('st.voice.title'), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
          const SizedBox(height: 22),
          GestureDetector(
            onTap: _phase == _Phase.unavailable ? _start : _toggle,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 250),
              width: listening ? 96 : 84,
              height: listening ? 96 : 84,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: listening ? AppColors.orange : AppColors.navy,
                boxShadow: [BoxShadow(color: (listening ? AppColors.orange : AppColors.navy).withValues(alpha: 0.35), blurRadius: listening ? 28 : 12, spreadRadius: listening ? 6 : 0)],
              ),
              child: Icon(listening ? Icons.stop_rounded : Icons.mic_rounded, color: Colors.white, size: 40),
            ),
          ),
          const SizedBox(height: 18),
          Text(status, textAlign: TextAlign.center, style: TextStyle(color: _phase == _Phase.unavailable ? AppColors.danger : AppColors.textSecondary, fontSize: 13.5)),
          const SizedBox(height: 14),
          ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 56),
            child: Center(
              child: hasWords
                  ? Text('“$_words”', textAlign: TextAlign.center, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600, height: 1.3))
                  : Text(context.tr('st.voice.example'), textAlign: TextAlign.center, style: TextStyle(color: AppColors.textMuted, fontSize: 12.5)),
            ),
          ),
          const SizedBox(height: 14),
          if (hasWords && !listening)
            PrimaryButton(label: context.tr('st.voice.search_for', {'q': _words.trim()}), orange: true, onPressed: () => Navigator.of(context).pop(_words.trim())),
          if (hasWords && !listening) TextButton(onPressed: _start, child: Text(context.tr('st.voice.try_again'))),
        ],
      ),
    );
  }
}
