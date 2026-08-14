import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'protocol.dart';

class LanConnection {
  WebSocketChannel? _channel;
  Uri? _lastUri;
  String? token;
  bool connected = false;
  final status = StreamController<String>.broadcast();
  final messages = StreamController<Map<String, dynamic>>.broadcast();

  Future<void> connect({required Uri uri, required String pairId, required String pin}) async {
    _lastUri = uri; await _open(uri, pairId: pairId, pin: pin);
  }

  Future<void> _open(Uri uri, {required String pairId, required String pin}) async {
    await _channel?.sink.close();
    status.add('Menghubungkan…');
    final channel = WebSocketChannel.connect(uri); _channel = channel;
    await channel.ready;
    channel.stream.listen((event) async {
      if (event is List<int>) return;
      final message = jsonDecode(event as String) as Map<String, dynamic>;
      if (message['type'] == 'pair.challenge') {
        channel.sink.add(jsonEncode({'type': 'pair.confirm', 'pairId': pairId, 'pin': pin, 'role': 'mobile'}));
      } else if (message['type'] == 'pair.accepted') {
        token = message['token'] as String; connected = true; status.add('Terhubung');
      } else { messages.add(message); }
    }, onDone: () { connected = false; status.add('Terputus'); _scheduleReconnect(pairId, pin); }, onError: (_) { connected = false; status.add('Gagal terhubung'); _scheduleReconnect(pairId, pin); });
  }

  void _scheduleReconnect(String pairId, String pin) { final uri = _lastUri; if (uri == null) return; Future<void>.delayed(const Duration(seconds: 2), () => _open(uri, pairId: pairId, pin: pin)); }
  void move(int dx, int dy) => _channel?.sink.add(encodeMove(dx, dy));
  void click({bool right = false}) => _channel?.sink.add(encodeButton(right: right));
  void scroll(int dx, int dy) => _channel?.sink.add(encodeScroll(dx, dy));
  void type(String value) => _channel?.sink.add(encodeText(value));
  void sendSignal(Map<String, dynamic> message) => _channel?.sink.add(jsonEncode(message));
  Future<void> dispose() async { await status.close(); await messages.close(); await _channel?.sink.close(); }
}
