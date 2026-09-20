const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('browserAPI', {
  createTab: (url) => ipcRenderer.invoke('tab-create', url),
  closeTab: (id) => ipcRenderer.invoke('tab-close', id),
  activateTab: (id) => ipcRenderer.invoke('tab-activate', id),
  selectTab: (id, selected) => ipcRenderer.invoke('tab-select', id, selected),
  setMosaic: (enabled) => ipcRenderer.invoke('set-mosaic', enabled),
  setSidePanel: (enabled) => ipcRenderer.invoke('set-side-panel', enabled),
  navigate: (value) => ipcRenderer.invoke('navigate', value),
  browserAction: (action) => ipcRenderer.invoke('browser-action', action),
  getState: () => ipcRenderer.invoke('get-browser-state'),
  toggleBookmark: () => ipcRenderer.invoke('toggle-bookmark'),
  clearCookies: (mode) => ipcRenderer.invoke('clear-cookies', mode),
  getExtensions: () => ipcRenderer.invoke('get-extensions'),
  installExtension: () => ipcRenderer.invoke('install-extension'),
  openProfile: () => ipcRenderer.invoke('open-profile'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  onTabsUpdated: (callback) => ipcRenderer.on('tabs-updated', (_event, data) => callback(data)),
  onLoadingChanged: (callback) => ipcRenderer.on('loading-changed', (_event, data) => callback(data)),
  onFocusAddress: (callback) => ipcRenderer.on('focus-address', callback),
  onBookmarksUpdated: (callback) => ipcRenderer.on('bookmarks-updated', (_event, data) => callback(data)),
  onDownloadStarted: (callback) => ipcRenderer.on('download-started', (_event, data) => callback(data)),
  onDownloadFinished: (callback) => ipcRenderer.on('download-finished', (_event, data) => callback(data)),
  onBrowserToast: (callback) => ipcRenderer.on('browser-toast', (_event, message) => callback(message)),
  onKeyboardAction: (callback) => ipcRenderer.on('keyboard-action', (_event, action) => callback(action))
});
