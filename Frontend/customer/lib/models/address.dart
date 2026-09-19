class Address {
  Address({
    this.id,
    required this.name,
    required this.phone,
    required this.line1,
    required this.city,
    required this.state,
    required this.postalCode,
    this.label = 'Home',
  });

  final String? id;
  final String name;
  final String phone;
  final String line1;
  final String city;
  final String state;
  final String postalCode;
  final String label;

  Map<String, dynamic> toJson() => {
        'name': name,
        'phone': phone,
        'line1': line1,
        'city': city,
        'state': state,
        'postalCode': postalCode,
      };

  factory Address.fromJson(Map<String, dynamic> json) => Address(
        id: json['id'] as String?,
        name: json['name'] as String,
        phone: json['phone'] as String,
        line1: json['line1'] as String,
        city: json['city'] as String,
        state: json['state'] as String,
        postalCode: json['postalCode'] as String,
      );
}
