import 'dart:async';
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'protocol.dart';

class LanConnection {
  WebSocketChannel? _channel;
  Uri? _lastUri;
  String? _pairId;
  String? _pin;
  String? _deviceName;
  String? _deviceId;
  bool _manualDisconnect = false;
  bool _reconnectScheduled = false;
  String? token;
  bool connected = false;

  final status = StreamController<String>.broadcast();
  final messages = StreamController<Map<String, dynamic>>.broadcast();

  void setDeviceId(String deviceId) => _deviceId = deviceId;

  Future<void> connect({required Uri uri, required String pairId, required String pin, String deviceName = 'Pocket Hub Android'}) async {
    _manualDisconnect = false;
    _lastUri = uri;
    _pairId = pairId;
    _pin = pin;
    _deviceName = deviceName;
    await _open();
  }

  Future<void> _open() async {
    final uri = _lastUri;
    final pairId = _pairId;
    final pin = _pin;
    if (uri == null || pairId == null || pin == null || _manualDisconnect) return;
    await _channel?.sink.close();
    status.add('Menghubungkan…');
    final channel = WebSocketChannel.connect(uri);
    _channel = channel;
    try {
      await channel.ready;
    } catch (_) {
      connected = false;
      status.add('Gagal terhubung');
      _scheduleReconnect();
      return;
    }
    channel.stream.listen((event) {
      if (event is List<int>) return;
      final message = jsonDecode(event.toString()) as Map<String, dynamic>;
      if (message['type'] == 'pair.challenge') {
        channel.sink.add(jsonEncode({'type': 'pair.confirm', 'pairId': pairId, 'pin': pin, 'role': 'mobile', 'deviceName': _deviceName, 'deviceId': _deviceId, 'platform': 'Android'}));
      } else if (message['type'] == 'pair.accepted') {
        token = message['token'] as String?;
        connected = true;
        status.add('Terhubung');
      } else {
        messages.add(message);
      }
    }, onDone: () {
      connected = false;
      status.add('Terputus');
      _scheduleReconnect();
    }, onError: (_) {
      connected = false;
      status.add('Gagal terhubung');
      _scheduleReconnect();
    });
  }

  void _scheduleReconnect() {
    if (_manualDisconnect || _reconnectScheduled || _lastUri == null) return;
    _reconnectScheduled = true;
    Future<void>.delayed(const Duration(seconds: 2), () async {
      _reconnectScheduled = false;
      await _open();
    });
  }

  void move(int dx, int dy) => _channel?.sink.add(encodeMove(dx, dy));
  void click({bool right = false}) => _channel?.sink.add(encodeButton(right: right));
  void scroll(int dx, int dy) => _channel?.sink.add(encodeScroll(dx, dy));
  void type(String value) => _channel?.sink.add(encodeText(value));
  void sendSignal(Map<String, dynamic> message) => _channel?.sink.add(jsonEncode(message));

  Future<void> disconnect() async {
    _manualDisconnect = true;
    connected = false;
    status.add('Terputus');
    await _channel?.sink.close();
  }

  Future<void> dispose() async {
    _manualDisconnect = true;
    await _channel?.sink.close();
    await status.close();
    await messages.close();
  }
}
