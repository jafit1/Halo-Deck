import { app, BrowserWindow, desktopCapturer, ipcMain, session } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import { startLanServer } from './server.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let mainWindow; let bridge; let bridgeInfo;

function sendToRenderer(channel, value) { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, value); }

app.whenReady().then(async () => {
  bridge = startLanServer({ onInput: await createInputInjector(), onPeer: (state) => sendToRenderer('devices-updated', state), onSignal: ({ device, message }) => sendToRenderer('webrtc-signal', { device, message }) });
  bridgeInfo = { address: bridge.address, pairId: bridge.pairing.id, pin: bridge.pairing.pin, qrDataUrl: await QRCode.toDataURL(JSON.stringify({ v: 1, address: bridge.address, pairId: bridge.pairing.id, pin: bridge.pairing.pin })) };
  session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
    const sources = await desktopCapturer.getSources({ types: ['screen', 'window'], thumbnailSize: { width: 0, height: 0 } });
    callback({ video: sources[0] });
  }, { useSystemPicker: true });
  mainWindow = new BrowserWindow({ width: 1180, height: 780, minWidth: 980, minHeight: 680, backgroundColor: '#10191c', webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false } });
  await mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.webContents.send('bridge-ready', bridgeInfo);
});

ipcMain.handle('bridge-info', () => bridge ? { ...bridgeInfo, devices: bridge.getDevices() } : null);
ipcMain.handle('disconnect-device', (_event, deviceId) => bridge?.disconnectDevice(deviceId) ?? false);
ipcMain.handle('relay-signal', (_event, message) => { bridge?.relayFromDesktop(message); return true; });
app.on('before-quit', () => bridge?.close());

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
