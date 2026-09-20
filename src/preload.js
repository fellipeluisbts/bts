const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('browserAPI', {
  createTab: (url) => ipcRenderer.invoke('tab-create', url),
  closeTab: (id) => ipcRenderer.invoke('tab-close', id),
  activateTab: (id) => ipcRenderer.invoke('tab-activate', id),
  navigate: (value) => ipcRenderer.invoke('navigate', value),
  browserAction: (action) => ipcRenderer.invoke('browser-action', action),
  getState: () => ipcRenderer.invoke('get-browser-state'),
  toggleBookmark: () => ipcRenderer.invoke('toggle-bookmark'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  onTabsUpdated: (callback) => ipcRenderer.on('tabs-updated', (_event, data) => callback(data)),
  onLoadingChanged: (callback) => ipcRenderer.on('loading-changed', (_event, data) => callback(data)),
  onFocusAddress: (callback) => ipcRenderer.on('focus-address', callback),
  onBookmarksUpdated: (callback) => ipcRenderer.on('bookmarks-updated', (_event, data) => callback(data)),
  onDownloadStarted: (callback) => ipcRenderer.on('download-started', (_event, data) => callback(data)),
  onDownloadFinished: (callback) => ipcRenderer.on('download-finished', (_event, data) => callback(data))
});
