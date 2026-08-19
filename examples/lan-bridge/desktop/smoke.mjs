import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { startLanServer } from './server.mjs';
import { decodeInput, encodeMove } from './protocol.mjs';

const decoded = decodeInput(encodeMove(12, -7));
assert.deepEqual(decoded, { type: 1, dx: 12, dy: -7 });

let resolveSignal;
const receivedSignal = new Promise((resolve) => { resolveSignal = resolve; });
const bridge = startLanServer({ port: 47877, onSignal: resolveSignal });
const socket = new WebSocket('ws://127.0.0.1:47877');
const challenge = await new Promise((resolve, reject) => { socket.once('message', (raw) => resolve(JSON.parse(raw.toString()))); socket.once('error', reject); });
assert.equal(challenge.type, 'pair.challenge');
socket.send(JSON.stringify({ type: 'pair.confirm', pairId: bridge.pairing.id, pin: bridge.pairing.pin, role: 'test' }));
const accepted = await new Promise((resolve, reject) => { socket.once('message', (raw) => resolve(JSON.parse(raw.toString()))); socket.once('error', reject); });
assert.equal(accepted.type, 'pair.accepted');
socket.send(JSON.stringify({ type: 'webrtc.request', preset: 'spotifyLyrics' }));
const signal = await receivedSignal;
assert.equal(signal.message.type, 'webrtc.request');
assert.equal(signal.message.preset, 'spotifyLyrics');
socket.close(); bridge.close();
console.log('LAN bridge smoke test passed');
