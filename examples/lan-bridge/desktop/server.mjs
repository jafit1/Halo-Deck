import crypto from 'node:crypto';
import os from 'node:os';
import { WebSocketServer } from 'ws';
import { Bonjour } from 'bonjour-service';
import { decodeInput, PORT, PROTOCOL_VERSION, SERVICE_TYPE } from './protocol.mjs';

export function startLanServer({ port = PORT, onInput = () => {}, onPeer = () => {} } = {}) {
  const pairing = createPairing();
  const lanAddress = getLanAddress();
  const wss = new WebSocketServer({ host: '0.0.0.0', port });
  const peers = new Set();
  const bonjour = new Bonjour({}, (error) => console.warn('[mDNS]', error.message));
  const service = bonjour.publish({ name: `Halo Deck · ${os.hostname()}`, type: SERVICE_TYPE, port, txt: { v: String(PROTOCOL_VERSION), pair: pairing.id } });

  wss.on('connection', (socket) => {
    const peer = { socket, authenticated: false, role: null };
    peers.add(peer); onPeer({ connected: true, count: peers.size });
    socket.send(JSON.stringify({ type: 'pair.challenge', pairId: pairing.id, pinHint: 'Scan the QR or enter the one-time PIN' }));

    socket.on('message', (raw, isBinary) => {
      if (isBinary) {
        if (!peer.authenticated) return socket.close(1008, 'pairing required');
        const packet = decodeInput(raw);
        if (packet) onInput(packet);
        return;
      }
      let message; try { message = JSON.parse(raw.toString()); } catch { return; }
      if (message.type === 'pair.confirm') return authenticatePeer(peer, message, pairing);
      if (!peer.authenticated) return socket.close(1008, 'pairing required');
      if (message.type === 'webrtc.request' || message.type === 'webrtc.offer' || message.type === 'webrtc.answer' || message.type === 'webrtc.ice' || message.type === 'mode') relayToOther(peer, message);
      if (message.type === 'ping') socket.send(JSON.stringify({ type: 'pong', t: message.t }));
    });
    socket.on('close', () => { peers.delete(peer); onPeer({ connected: false, count: peers.size }); });
  });

  const close = () => { service.stop(); bonjour.destroy(); wss.close(); for (const peer of peers) peer.socket.close(); };
  return { wss, pairing, close, address: `ws://${lanAddress}:${port}` };

  function authenticatePeer(peer, message, currentPairing) {
    if (message.pairId !== currentPairing.id || !safeEqual(message.pin, currentPairing.pin)) return peer.socket.close(1008, 'invalid pairing');
    peer.authenticated = true; peer.role = message.role || 'mobile';
    const sessionToken = crypto.randomBytes(32).toString('base64url');
    peer.socket.send(JSON.stringify({ type: 'pair.accepted', token: sealToken(sessionToken, currentPairing.pin, currentPairing.id), protocol: PROTOCOL_VERSION, server: lanAddress, port }));
  }
  function relayToOther(sender, message) { for (const peer of peers) if (peer !== sender && peer.authenticated && peer.socket.readyState === 1) peer.socket.send(JSON.stringify(message)); }
}

function createPairing() { return { id: crypto.randomBytes(8).toString('hex'), pin: String(crypto.randomInt(100000, 1000000)) }; }
function safeEqual(a, b) { if (typeof a !== 'string' || typeof b !== 'string') return false; const left = Buffer.from(a); const right = Buffer.from(b); return left.length === right.length && crypto.timingSafeEqual(left, right); }
function sealToken(token, pin, pairId) { const key = crypto.createHash('sha256').update(`${pairId}:${pin}`).digest(); const iv = crypto.randomBytes(12); const cipher = crypto.createCipheriv('aes-256-gcm', key, iv); const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]); return Buffer.from(JSON.stringify({ iv: iv.toString('base64url'), ciphertext: ciphertext.toString('base64url'), tag: cipher.getAuthTag().toString('base64url') })).toString('base64url'); }
export function getLanAddress(networkInterfaces = os.networkInterfaces()) {
  const override = process.env.HALO_DECK_LAN_HOST?.trim();
  if (override && isIPv4(override)) return override;

  const candidates = Object.entries(networkInterfaces).flatMap(([name, entries]) => (entries ?? []).filter((item) => item && item.family === 'IPv4' && !item.internal).map((item) => ({ name, address: item.address })));
  candidates.sort((left, right) => lanAddressScore(left) - lanAddressScore(right));
  return candidates[0]?.address || '127.0.0.1';
}

function lanAddressScore(candidate) {
  const { name, address } = candidate;
  const interfaceBonus = /wi-?fi|wireless|wlan|ethernet/i.test(name) ? -10 : 0;
  if (/^192\.168\./.test(address)) return 0 + interfaceBonus;
  if (/^10\./.test(address)) return 10 + interfaceBonus;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(address)) return 20 + interfaceBonus;
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(address)) return 90;
  return 50;
}

function isIPv4(value) { return /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(value); }
