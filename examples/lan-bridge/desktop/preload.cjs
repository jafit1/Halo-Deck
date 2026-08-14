const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('haloDeck', {
  getBridgeInfo: () => ipcRenderer.invoke('bridge-info'),
  disconnectDevice: (deviceId) => ipcRenderer.invoke('disconnect-device', deviceId),
  relaySignal: (message) => ipcRenderer.invoke('relay-signal', message),
  onBridgeReady: (callback) => ipcRenderer.on('bridge-ready', (_event, value) => callback(value)),
  onDevicesUpdated: (callback) => ipcRenderer.on('devices-updated', (_event, value) => callback(value)),
  onWebrtcSignal: (callback) => ipcRenderer.on('webrtc-signal', (_event, value) => callback(value)),
});
