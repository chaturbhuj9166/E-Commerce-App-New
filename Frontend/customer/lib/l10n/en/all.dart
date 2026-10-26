import 'common.dart';
import 'auth.dart';
import 'account.dart';
import 'shop.dart';
import 'orders.dart';
import 'wholesale.dart';
import 'search_tools.dart';

/// Every English string in the app, merged from the per-group files.
const Map<String, String> kEnglish = {
  ...enCommon,
  ...enAuth,
  ...enAccount,
  ...enShop,
  ...enOrders,
  ...enWholesale,
  ...enSearchTools,
};
