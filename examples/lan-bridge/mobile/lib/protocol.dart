import 'dart:typed_data';

const protocolVersion = 1;
const inputMove = 0x01;
const inputButton = 0x02;
const inputScroll = 0x03;
const inputText = 0x04;

Uint8List encodeMove(int dx, int dy) {
  final data = ByteData(8);
  data.setUint8(0, 0x48); data.setUint8(1, 0x44); data.setUint8(2, protocolVersion); data.setUint8(3, inputMove);
  data.setInt16(4, dx.clamp(-32768, 32767)); data.setInt16(6, dy.clamp(-32768, 32767));
  return data.buffer.asUint8List();
}

Uint8List encodeButton({required bool right}) => Uint8List.fromList([0x48, 0x44, protocolVersion, inputButton, right ? 2 : 1]);
Uint8List encodeScroll(int dx, int dy) { final data = ByteData(8); data.setUint8(0, 0x48); data.setUint8(1, 0x44); data.setUint8(2, protocolVersion); data.setUint8(3, inputScroll); data.setInt16(4, dx.clamp(-32768, 32767)); data.setInt16(6, dy.clamp(-32768, 32767)); return data.buffer.asUint8List(); }
Uint8List encodeText(String text) => Uint8List.fromList([0x48, 0x44, protocolVersion, inputText, ...text.codeUnits]);
