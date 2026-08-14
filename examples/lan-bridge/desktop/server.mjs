import crypto from 'node:crypto';
import os from 'node:os';
import { WebSocketServer } from 'ws';
import { Bonjour } from 'bonjour-service';
import { decodeInput, PORT, PROTOCOL_VERSION, SERVICE_TYPE } from './protocol.mjs';

export function startLanServer({ port = PORT, onInput = () => {}, onPeer = () => {} } = {}) {
  const pairing = createPairing();
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
  return { wss, pairing, close, address: `ws://${getLanAddress()}:${port}` };

  function authenticatePeer(peer, message, currentPairing) {
    if (message.pairId !== currentPairing.id || !safeEqual(message.pin, currentPairing.pin)) return peer.socket.close(1008, 'invalid pairing');
    peer.authenticated = true; peer.role = message.role || 'mobile';
    const sessionToken = crypto.randomBytes(32).toString('base64url');
    peer.socket.send(JSON.stringify({ type: 'pair.accepted', token: sealToken(sessionToken, currentPairing.pin, currentPairing.id), protocol: PROTOCOL_VERSION, server: getLanAddress(), port }));
  }
  function relayToOther(sender, message) { for (const peer of peers) if (peer !== sender && peer.authenticated && peer.socket.readyState === 1) peer.socket.send(JSON.stringify(message)); }
}

function createPairing() { return { id: crypto.randomBytes(8).toString('hex'), pin: String(crypto.randomInt(100000, 1000000)) }; }
function safeEqual(a, b) { if (typeof a !== 'string' || typeof b !== 'string') return false; const left = Buffer.from(a); const right = Buffer.from(b); return left.length === right.length && crypto.timingSafeEqual(left, right); }
function sealToken(token, pin, pairId) { const key = crypto.createHash('sha256').update(`${pairId}:${pin}`).digest(); const iv = crypto.randomBytes(12); const cipher = crypto.createCipheriv('aes-256-gcm', key, iv); const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]); return Buffer.from(JSON.stringify({ iv: iv.toString('base64url'), ciphertext: ciphertext.toString('base64url'), tag: cipher.getAuthTag().toString('base64url') })).toString('base64url'); }
function getLanAddress() { const interfaces = Object.values(os.networkInterfaces()).flat().filter(Boolean); return interfaces.find((item) => item.family === 'IPv4' && !item.internal)?.address || '127.0.0.1'; }
