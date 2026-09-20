const { app, BrowserWindow, BrowserView, ipcMain, session, shell } = require('electron');
const path = require('node:path');

const HOME_URL = 'https://www.google.com';
let mainWindow;
let tabs = [];
let activeTabId = null;
let nextTabId = 1;
let historyEntries = [];
let bookmarks = [];

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 620,
    backgroundColor: '#f8f9fa',
    title: 'BTS Browser',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.webContents.on('did-finish-load', sendTabs);
  mainWindow.on('resize', layoutActiveView);

  session.defaultSession.on('will-download', (_event, item) => {
    mainWindow.webContents.send('download-started', {
      filename: item.getFilename(),
      totalBytes: item.getTotalBytes()
    });
    item.once('done', (_event, state) => {
      mainWindow.webContents.send('download-finished', {
        filename: item.getFilename(),
        state,
        path: item.getSavePath()
      });
    });
  });
}

function createTab(url = HOME_URL) {
  const id = nextTabId++;
  const view = new BrowserView({
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      spellcheck: true
    }
  });
  const tab = { id, view, url, title: 'Nova guia', favicon: '' };
  tabs.push(tab);
  view.webContents.setWindowOpenHandler(({ url: newUrl }) => {
    createTab(newUrl);
    return { action: 'deny' };
  });
  view.webContents.on('page-title-updated', (_event, title) => {
    tab.title = title || 'Nova guia';
    sendTabs();
  });
  view.webContents.on('page-favicon-updated', (_event, favicons) => {
    tab.favicon = favicons[0] || '';
    sendTabs();
  });
  view.webContents.on('did-navigate', (_event, newUrl) => updateTab(tab, newUrl));
  view.webContents.on('did-navigate-in-page', (_event, newUrl) => updateTab(tab, newUrl));
  view.webContents.on('did-start-loading', () => mainWindow.webContents.send('loading-changed', { id, loading: true }));
  view.webContents.on('did-stop-loading', () => mainWindow.webContents.send('loading-changed', { id, loading: false }));
  view.webContents.on('before-input-event', (_event, input) => {
    if ((input.control || input.meta) && input.key.toLowerCase() === 'l') {
      mainWindow.webContents.send('focus-address');
    }
  });
  view.webContents.loadURL(url);
  activateTab(id);
  return tab;
}

function updateTab(tab, url) {
  tab.url = url;
  historyEntries = [{ title: tab.title, url, visitedAt: Date.now() }, ...historyEntries.filter((entry) => entry.url !== url)].slice(0, 100);
  sendTabs();
}

function activateTab(id) {
  const tab = tabs.find((entry) => entry.id === id);
  if (!tab) return;
  activeTabId = id;
  for (const entry of tabs) mainWindow.removeBrowserView(entry.view);
  mainWindow.addBrowserView(tab.view);
  layoutActiveView();
  sendTabs();
}

function layoutActiveView() {
  const tab = tabs.find((entry) => entry.id === activeTabId);
  if (!tab || !mainWindow) return;
  const [width, height] = mainWindow.getContentSize();
  tab.view.setBounds({ x: 0, y: 104, width, height: Math.max(0, height - 104) });
  tab.view.setAutoResize({ width: true, height: true });
}

function closeTab(id) {
  const index = tabs.findIndex((entry) => entry.id === id);
  if (index === -1) return;
  const wasActive = activeTabId === id;
  const [tab] = tabs.splice(index, 1);
  tab.view.webContents.close();
  if (tabs.length === 0) createTab();
  else if (wasActive) activateTab(tabs[Math.max(0, index - 1)].id);
  else sendTabs();
}

function sendTabs() {
  if (!mainWindow) return;
  mainWindow.webContents.send('tabs-updated', {
    activeId: activeTabId,
    tabs: tabs.map(({ id, title, url, favicon }) => ({ id, title, url, favicon }))
  });
}

ipcMain.handle('tab-create', (_event, url) => createTab(url || HOME_URL));
ipcMain.handle('tab-close', (_event, id) => closeTab(id));
ipcMain.handle('tab-activate', (_event, id) => activateTab(id));
ipcMain.handle('navigate', (_event, value) => {
  const tab = tabs.find((entry) => entry.id === activeTabId);
  if (!tab) return;
  let target = String(value || '').trim();
  if (!target) return;
  if (!/^https?:\/\//i.test(target)) {
    target = target.includes(' ') ? `https://www.google.com/search?q=${encodeURIComponent(target)}` : `https://${target}`;
  }
  tab.view.webContents.loadURL(target);
});
ipcMain.handle('browser-action', (_event, action) => {
  const tab = tabs.find((entry) => entry.id === activeTabId);
  if (!tab) return;
  if (action === 'back' && tab.view.webContents.canGoBack()) tab.view.webContents.goBack();
  if (action === 'forward' && tab.view.webContents.canGoForward()) tab.view.webContents.goForward();
  if (action === 'reload') tab.view.webContents.reload();
  if (action === 'home') tab.view.webContents.loadURL(HOME_URL);
  if (action === 'devtools') tab.view.webContents.openDevTools();
});
ipcMain.handle('get-browser-state', () => ({
  history: historyEntries,
  bookmarks,
  activeTabId,
  canGoBack: activeTabId ? tabs.find((tab) => tab.id === activeTabId).view.webContents.canGoBack() : false,
  canGoForward: activeTabId ? tabs.find((tab) => tab.id === activeTabId).view.webContents.canGoForward() : false
}));
ipcMain.handle('toggle-bookmark', () => {
  const tab = tabs.find((entry) => entry.id === activeTabId);
  if (!tab) return [];
  const existing = bookmarks.findIndex((entry) => entry.url === tab.url);
  if (existing >= 0) bookmarks.splice(existing, 1);
  else bookmarks.unshift({ title: tab.title, url: tab.url });
  mainWindow.webContents.send('bookmarks-updated', bookmarks);
  return bookmarks;
});
ipcMain.handle('open-external', (_event, url) => shell.openExternal(url));

app.whenReady().then(() => {
  createWindow();
  createTab();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
