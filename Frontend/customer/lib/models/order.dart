class OrderItem {
  OrderItem({this.id = '', required this.name, required this.quantity, required this.unitPaise, this.refundEligible = false, this.refundStatus, this.size, this.color});

  final String id;
  final String name;
  final String? size;
  final String? color;
  String get variantText => [?size, ?color].join(' · ');
  final int quantity;
  final int unitPaise;
  final bool refundEligible;
  /// REQUESTED / APPROVED / REJECTED once a refund has been requested.
  final String? refundStatus;

  factory OrderItem.fromJson(Map<String, dynamic> json) => OrderItem(
        id: json['id']?.toString() ?? '',
        name: json['name'] as String,
        quantity: (json['quantity'] as num).toInt(),
        unitPaise: (json['unitPaise'] as num).toInt(),
        refundEligible: json['refundEligible'] as bool? ?? false,
        refundStatus: (json['refund'] as Map?)?['status'] as String?,
        size: json['size'] as String?,
        color: json['color'] as String?,
      );
}

class Order {
  Order({
    required this.id,
    required this.status,
    required this.totalPaise,
    required this.items,
    required this.createdAt,
    this.discountPaise = 0,
    this.deliveryPaise = 0,
    this.couponCode,
    this.paymentMethod,
    this.deliveredAt,
    this.isVendorOrder = false,
  });

  final String id;
  final String status;
  final int totalPaise;
  final List<OrderItem> items;
  final DateTime createdAt;
  final int discountPaise;
  final int deliveryPaise;
  final String? couponCode;
  final String? paymentMethod;
  final DateTime? deliveredAt;
  final bool isVendorOrder;

  static const statusSteps = ['PLACED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];

  factory Order.fromJson(Map<String, dynamic> json) => Order(
        id: json['id'] as String,
        status: json['status'] as String,
        totalPaise: (json['totalPaise'] as num).toInt(),
        items: (json['items'] as List? ?? []).map((e) => OrderItem.fromJson(e as Map<String, dynamic>)).toList(),
        createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
        discountPaise: (json['discountPaise'] as num?)?.toInt() ?? 0,
        deliveryPaise: (json['deliveryPaise'] as num?)?.toInt() ?? 0,
        couponCode: json['couponCode'] as String?,
        paymentMethod: json['paymentMethod'] as String?,
        deliveredAt: DateTime.tryParse(json['deliveredAt']?.toString() ?? ''),
        isVendorOrder: json['vendorId'] != null,
      );
}
