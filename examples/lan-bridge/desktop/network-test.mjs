import assert from 'node:assert/strict';
import { getLanAddress } from './server.mjs';

const interfaces = {
  Tailscale: [{ family: 'IPv4', internal: false, address: '100.111.64.66' }],
  WiFi: [{ family: 'IPv4', internal: false, address: '192.168.1.25' }],
};

assert.equal(getLanAddress(interfaces), '192.168.1.25');
process.env.HALO_DECK_LAN_HOST = '192.168.1.25';
assert.equal(getLanAddress({ Tailscale: [{ family: 'IPv4', internal: false, address: '100.111.64.66' }] }), '192.168.1.25');
delete process.env.HALO_DECK_LAN_HOST;
console.log('LAN address selection test passed: 192.168.1.25');
