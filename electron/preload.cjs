const { contextBridge, webFrame } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
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
  }
});

