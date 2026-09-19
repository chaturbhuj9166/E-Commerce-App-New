class OrderItem {
  OrderItem({required this.name, required this.quantity, required this.unitPaise});

  final String name;
  final int quantity;
  final int unitPaise;

  factory OrderItem.fromJson(Map<String, dynamic> json) => OrderItem(
        name: json['name'] as String,
        quantity: (json['quantity'] as num).toInt(),
        unitPaise: (json['unitPaise'] as num).toInt(),
      );
}

class Order {
  Order({
    required this.id,
    required this.status,
    required this.totalPaise,
    required this.items,
    required this.createdAt,
  });

  final String id;
  final String status;
  final int totalPaise;
  final List<OrderItem> items;
  final DateTime createdAt;

  static const statusSteps = ['PLACED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];

  factory Order.fromJson(Map<String, dynamic> json) => Order(
        id: json['id'] as String,
        status: json['status'] as String,
        totalPaise: (json['totalPaise'] as num).toInt(),
        items: (json['items'] as List? ?? []).map((e) => OrderItem.fromJson(e as Map<String, dynamic>)).toList(),
        createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
      );
}
