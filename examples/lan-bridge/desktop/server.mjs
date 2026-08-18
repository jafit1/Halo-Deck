import crypto from 'node:crypto';
import os from 'node:os';
import { WebSocketServer } from 'ws';
import { Bonjour } from 'bonjour-service';
import { decodeInput, PORT, PROTOCOL_VERSION, SERVICE_TYPE } from './protocol.mjs';

export function startLanServer({ port = PORT, onInput = () => {}, onPeer = () => {}, onSignal = () => {}, onLog = () => {} } = {}) {
  const pairing = createPairing();
  const lanAddress = getLanAddress();
  const wss = new WebSocketServer({ host: '0.0.0.0', port });
  const peers = new Set();
  const bonjour = new Bonjour({}, (error) => console.warn('[mDNS]', error.message));
  const service = bonjour.publish({ name: `Halo Deck · ${os.hostname()}`, type: SERVICE_TYPE, port, txt: { v: String(PROTOCOL_VERSION), pair: pairing.id } });

  wss.on('connection', (socket) => {
    const peer = { socket, authenticated: false, role: null, deviceId: `session-${crypto.randomBytes(6).toString('hex')}`, deviceName: 'Perangkat baru', platform: 'Mobile', connectedAt: Date.now() };
    peers.add(peer); onLog('socket.open', { deviceId: peer.deviceId }); notifyPeers();
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
      if (message.type === 'webrtc.request' || message.type === 'webrtc.offer' || message.type === 'webrtc.answer' || message.type === 'webrtc.ice' || message.type === 'mode') { onLog('signal', { deviceId: peer.deviceId, type: message.type }); onSignal({ device: publicPeer(peer), message }); }
      if (message.type === 'ping') socket.send(JSON.stringify({ type: 'pong', t: message.t }));
    });
    socket.on('close', () => { peers.delete(peer); onLog('socket.close', { deviceId: peer.deviceId }); notifyPeers(); });
  });

  const close = () => { service.stop(); bonjour.destroy(); wss.close(); for (const peer of peers) peer.socket.close(); };
  const getDevices = () => [...peers].filter((peer) => peer.authenticated).map(publicPeer);
  const disconnectDevice = (deviceId) => { const peer = [...peers].find((candidate) => candidate.deviceId === deviceId); if (!peer) return false; peer.socket.close(1000, 'Disconnected by Desktop Hub'); return true; };
  const relayFromDesktop = (message) => { for (const peer of peers) if (peer.authenticated && peer.socket.readyState === 1 && (!message.targetDeviceId || message.targetDeviceId === peer.deviceId)) peer.socket.send(JSON.stringify(message)); };
  return { wss, pairing, close, getDevices, disconnectDevice, relayFromDesktop, address: `ws://${lanAddress}:${port}` };

  function authenticatePeer(peer, message, currentPairing) {
    if (message.pairId !== currentPairing.id || !safeEqual(message.pin, currentPairing.pin)) return peer.socket.close(1008, 'invalid pairing');
    const deviceId = cleanDeviceId(message.deviceId) || peer.deviceId;
    for (const existing of peers) if (existing !== peer && existing.authenticated && existing.deviceId === deviceId) existing.socket.close(1000, 'replaced by reconnect');
    peer.deviceId = deviceId; peer.authenticated = true; peer.role = message.role || 'mobile'; peer.deviceName = cleanLabel(message.deviceName, 'Pocket Hub'); peer.platform = cleanLabel(message.platform, 'Android');
    onLog('pair.accepted', { deviceId: peer.deviceId, name: peer.deviceName, platform: peer.platform });
    const sessionToken = crypto.randomBytes(32).toString('base64url');
    peer.socket.send(JSON.stringify({ type: 'pair.accepted', token: sealToken(sessionToken, currentPairing.pin, currentPairing.id), protocol: PROTOCOL_VERSION, server: lanAddress, port }));
    notifyPeers();
  }
  function notifyPeers() { onPeer({ connected: [...peers].some((peer) => peer.authenticated), count: getDevices().length, devices: getDevices() }); }
}

function publicPeer(peer) { return { id: peer.deviceId, name: peer.deviceName, platform: peer.platform, connectedAt: peer.connectedAt, status: peer.authenticated ? 'connected' : 'pairing' }; }
function cleanLabel(value, fallback) { return typeof value === 'string' && value.trim().length > 0 ? value.trim().slice(0, 48) : fallback; }
function cleanDeviceId(value) { return typeof value === 'string' && /^[A-Za-z0-9_-]{8,80}$/.test(value) ? value : null; }

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
