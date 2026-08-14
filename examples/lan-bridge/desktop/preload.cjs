const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('haloDeck', { getBridgeInfo: () => ipcRenderer.invoke('bridge-info'), onBridgeReady: (callback) => ipcRenderer.on('bridge-ready', (_event, value) => callback(value)) });
