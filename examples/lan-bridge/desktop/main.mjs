import { app, BrowserWindow, desktopCapturer, ipcMain, Notification, session } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import { startLanServer } from './server.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let mainWindow; let bridge; let bridgeInfo; let previousDeviceIds = new Set(); let selectedCaptureSourceId; let diagnosticLogPath; const notificationTimes = new Map();

function sendToRenderer(channel, value) { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, value); }

app.whenReady().then(async () => {
  diagnosticLogPath = path.join(app.getPath('userData'), 'halo-deck.log');
  writeDiagnostic('hub.started');
  bridge = startLanServer({ onInput: await createInputInjector(), onPeer: (state) => { sendToRenderer('devices-updated', state); for (const device of state.devices ?? []) if (!previousDeviceIds.has(device.id)) showDeviceNotification(device); previousDeviceIds = new Set((state.devices ?? []).map((device) => device.id)); }, onSignal: ({ device, message }) => sendToRenderer('webrtc-signal', { device, message }), onLog: writeDiagnostic });
  bridgeInfo = { address: bridge.address, pairId: bridge.pairing.id, pin: bridge.pairing.pin, qrDataUrl: await QRCode.toDataURL(JSON.stringify({ v: 1, address: bridge.address, pairId: bridge.pairing.id, pin: bridge.pairing.pin })) };
  session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
    const sources = await desktopCapturer.getSources({ types: ['screen', 'window'], thumbnailSize: { width: 0, height: 0 } });
    const source = sources.find((item) => item.id === selectedCaptureSourceId);
    if (!source) { writeDiagnostic('capture.cancelled', { reason: 'source_not_selected' }); return callback({}); }
    writeDiagnostic('capture.accepted', { id: source.id, name: source.name });
    callback({ video: source });
  }, { useSystemPicker: false });
  mainWindow = new BrowserWindow({ width: 1180, height: 780, minWidth: 980, minHeight: 680, backgroundColor: '#10191c', webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false } });
  await mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.webContents.send('bridge-ready', bridgeInfo);
});

ipcMain.handle('bridge-info', () => bridge ? { ...bridgeInfo, devices: bridge.getDevices() } : null);
ipcMain.handle('disconnect-device', (_event, deviceId) => bridge?.disconnectDevice(deviceId) ?? false);
ipcMain.handle('relay-signal', (_event, message) => { bridge?.relayFromDesktop(message); return true; });
ipcMain.handle('capture-sources', async () => (await desktopCapturer.getSources({ types: ['screen', 'window'], thumbnailSize: { width: 0, height: 0 } })).map((source) => ({ id: source.id, name: source.name, type: source.id.startsWith('screen:') ? 'screen' : 'window' })));
ipcMain.handle('select-capture-source', (_event, sourceId) => { selectedCaptureSourceId = typeof sourceId === 'string' ? sourceId : undefined; writeDiagnostic('capture.selected', { sourceId: selectedCaptureSourceId }); return Boolean(selectedCaptureSourceId); });
ipcMain.handle('write-diagnostic', (_event, event, details = {}) => { writeDiagnostic(`renderer.${String(event).slice(0, 64)}`, details); return true; });
app.on('before-quit', () => { writeDiagnostic('hub.stopped'); bridge?.close(); });

function showDeviceNotification(device) {
  if (!Notification.isSupported()) return;
  const now = Date.now(); const lastNotice = notificationTimes.get(device.id) ?? 0;
  if (now - lastNotice < 60_000) return;
  notificationTimes.set(device.id, now);
  new Notification({ title: 'Halo Deck · Device terhubung', body: `${device.name} (${device.platform}) berhasil masuk ke sesi LAN.`, silent: false }).show();
}

function writeDiagnostic(event, details = {}) {
  const safe = JSON.stringify({ t: new Date().toISOString(), event, details });
  console.log('[Halo Deck]', safe);
  if (diagnosticLogPath) fs.appendFile(diagnosticLogPath, `${safe}\n`, () => {});
}

async function createInputInjector() {
  try {
    const { mouse, keyboard, Button, Point } = await import('@nut-tree-fork/nut-js');
    return async (packet) => {
      if (packet.type === 0x01) return mouse.move(new Point((await mouse.getPosition()).x + packet.dx, (await mouse.getPosition()).y + packet.dy));
      if (packet.type === 0x02) return mouse.click(packet.button === 2 ? Button.RIGHT : Button.LEFT);
      if (packet.type === 0x03) return mouse.scroll(packet.dy);
      if (packet.type === 0x04) return keyboard.type(packet.text);
    };
  } catch { return (packet) => console.log('[input]', packet); }
}
