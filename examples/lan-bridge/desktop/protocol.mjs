export const SERVICE_TYPE = 'halodeck';
export const PROTOCOL_VERSION = 1;
export const PORT = 47777;

export const INPUT = Object.freeze({
  move: 0x01,
  button: 0x02,
  scroll: 0x03,
  text: 0x04,
});

export function encodeMove(dx, dy) {
  const packet = new ArrayBuffer(8);
  const view = new DataView(packet);
  view.setUint8(0, 0x48); view.setUint8(1, 0x44); view.setUint8(2, PROTOCOL_VERSION);
  view.setUint8(3, INPUT.move); view.setInt16(4, clampInt16(dx)); view.setInt16(6, clampInt16(dy));
  return packet;
}

export function decodeInput(data) {
  const bytes = Buffer.from(data);
  if (bytes.length < 4 || bytes[0] !== 0x48 || bytes[1] !== 0x44 || bytes[2] !== PROTOCOL_VERSION) return null;
  const type = bytes[3];
  if (type === INPUT.move && bytes.length >= 8) return { type, dx: bytes.readInt16BE(4), dy: bytes.readInt16BE(6) };
  if (type === INPUT.button && bytes.length >= 5) return { type, button: bytes[4] };
  if (type === INPUT.scroll && bytes.length >= 8) return { type, dx: bytes.readInt16BE(4), dy: bytes.readInt16BE(6) };
  if (type === INPUT.text) return { type, text: bytes.subarray(4).toString('utf8') };
  return null;
}

function clampInt16(value) { return Math.max(-32768, Math.min(32767, Math.round(value))); }
