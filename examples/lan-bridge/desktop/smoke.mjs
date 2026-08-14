import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { startLanServer } from './server.mjs';
import { decodeInput, encodeMove } from './protocol.mjs';

const decoded = decodeInput(encodeMove(12, -7));
assert.deepEqual(decoded, { type: 1, dx: 12, dy: -7 });

const bridge = startLanServer({ port: 47877 });
const socket = new WebSocket('ws://127.0.0.1:47877');
const challenge = await new Promise((resolve, reject) => { socket.once('message', (raw) => resolve(JSON.parse(raw.toString()))); socket.once('error', reject); });
assert.equal(challenge.type, 'pair.challenge');
socket.send(JSON.stringify({ type: 'pair.confirm', pairId: bridge.pairing.id, pin: bridge.pairing.pin, role: 'test' }));
const accepted = await new Promise((resolve, reject) => { socket.once('message', (raw) => resolve(JSON.parse(raw.toString()))); socket.once('error', reject); });
assert.equal(accepted.type, 'pair.accepted');
socket.close(); bridge.close();
console.log('LAN bridge smoke test passed');
