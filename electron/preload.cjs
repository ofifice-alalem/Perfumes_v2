const { contextBridge, ipcRenderer, webFrame } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openPos: () => {
    try {
      ipcRenderer.send('open-pos-app');
    } catch (e) {
      console.warn('Failed to send open-pos-app IPC:', e);
    }
  },
  setZoomFactor: (factor) => {
    try {
      webFrame.setZoomFactor(factor);
    } catch (e) {
      console.warn('Failed to set zoom factor:', e);
    }
  },
  getZoomFactor: () => {
    try {
      return webFrame.getZoomFactor();
    } catch (e) {
      return 1.0;
    }
  },
  // وظائف الاسترداد والتحكم بالخادم المحلي
  startApache: () => ipcRenderer.invoke('start-apache-service'),
  checkServer: () => ipcRenderer.invoke('check-server-status'),
  retryLoad: (url) => {
    try {
      ipcRenderer.send('retry-load-url', url);
    } catch (e) {
      console.warn('Failed to send retry-load-url IPC:', e);
    }
  },
  openSettings: () => {
    try {
      ipcRenderer.send('open-settings-app');
    } catch (e) {
      console.warn('Failed to send open-settings-app IPC:', e);
    }
  }
});


