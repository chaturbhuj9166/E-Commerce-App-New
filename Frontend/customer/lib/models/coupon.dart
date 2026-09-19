class Coupon {
  Coupon({
    required this.code,
    required this.description,
    required this.discountType,
    required this.value,
    required this.minOrderPaise,
    this.maxDiscountPaise,
  });

  final String code;
  final String description;
  final String discountType; // 'PERCENT' | 'FLAT'
  final int value;
  final int minOrderPaise;
  final int? maxDiscountPaise;

  String get summary => discountType == 'PERCENT'
      ? '$value% off${maxDiscountPaise != null ? ' (up to ₹${(maxDiscountPaise! / 100).toStringAsFixed(0)})' : ''}'
      : '₹${(value / 100).toStringAsFixed(0)} off';

  factory Coupon.fromJson(Map<String, dynamic> json) => Coupon(
        code: json['code'] as String,
        description: (json['description'] as String?) ?? '',
        discountType: json['discountType'] as String,
        value: (json['value'] as num).toInt(),
        minOrderPaise: (json['minOrderPaise'] as num?)?.toInt() ?? 0,
        maxDiscountPaise: (json['maxDiscountPaise'] as num?)?.toInt(),
      );
}
