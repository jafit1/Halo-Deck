import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class HaloDiagnostics {
  static const _key = 'halo.diagnostics';
  static const _limit = 80;
  static final entries = ValueNotifier<List<String>>([]);

  static Future<void> initialize() async {
    final preferences = await SharedPreferences.getInstance();
    entries.value = preferences.getStringList(_key) ?? [];
  }

  static Future<void> write(String event, [Map<String, dynamic> details = const {}]) async {
    final line = jsonEncode({'t': DateTime.now().toIso8601String(), 'e': event, if (details.isNotEmpty) 'd': details});
    final next = [...entries.value, line];
    if (next.length > _limit) next.removeRange(0, next.length - _limit);
    entries.value = next;
    debugPrint('[Halo Deck] $line');
    final preferences = await SharedPreferences.getInstance();
    await preferences.setStringList(_key, next);
  }

  static Future<void> clear() async {
    entries.value = [];
    final preferences = await SharedPreferences.getInstance();
    await preferences.remove(_key);
  }
}
