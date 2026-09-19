import 'package:flutter/material.dart';

/// The client's real logo (NTSA-APP-LAYOUT-IMG/ntsa-logo (1).png), copied to
/// assets/images/ntsa_logo.png. It's navy + orange, drawn for light
/// backgrounds (Onboarding header, Login). On the dark Splash background we
/// tint it solid white to match the approved layout instead of asking for a
/// second asset.
class NtsaLogo extends StatelessWidget {
  const NtsaLogo({super.key, this.light = false, this.size = 64});

  final bool light;
  final double size;

  @override
  Widget build(BuildContext context) {
    final image = Image.asset('assets/images/ntsa_logo.png', width: size * 2.1, fit: BoxFit.contain);
    return light ? ColorFiltered(colorFilter: const ColorFilter.mode(Colors.white, BlendMode.srcIn), child: image) : image;
  }
}
