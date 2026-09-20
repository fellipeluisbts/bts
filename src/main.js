const { app, BrowserWindow, BrowserView, dialog, ipcMain, Menu, session, shell } = require('electron');
const path = require('node:path');

const HOME_URL = 'https://www.google.com';
let mainWindow;
let tabs = [];
let activeTabId = null;
let nextTabId = 1;
let historyEntries = [];
let bookmarks = [];
let selectedTabIds = [];
let closedTabs = [];
let mosaicMode = false;
let sidePanelOpen = false;
const HEADER_HEIGHT = 46;
const SIDE_PANEL_WIDTH = 330;
const extensionStates = new Map();
const extensionCatalog = new Map();

function createWindow() {
  Menu.setApplicationMenu(null);
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
  if (tabs.length >= 6) return null;
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
  selectedTabIds = [...selectedTabIds, id].slice(-6);
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
  view.webContents.on('focus', () => activateTab(id));
  view.webContents.on('did-start-loading', () => mainWindow.webContents.send('loading-changed', { id, loading: true }));
  view.webContents.on('did-stop-loading', () => mainWindow.webContents.send('loading-changed', { id, loading: false }));
  view.webContents.on('dom-ready', () => view.webContents.insertCSS('html { border: 1px solid #d4d8de !important; }'));
  view.webContents.on('dom-ready', () => view.webContents.insertCSS('::-webkit-scrollbar { width: 0 !important; height: 0 !important; }'));
  view.webContents.on('before-input-event', (_event, input) => {
    if (input.type !== 'keyDown') return;
    const modifier = input.control || input.meta;
    const key = input.key.toLowerCase();
    if (modifier && key === 'l') { _event.preventDefault(); mainWindow.webContents.send('focus-address'); return; }
    if (modifier && key === 'r') { _event.preventDefault(); tab.view.webContents.reload(); return; }
    if (modifier && input.shift && key === 't') { _event.preventDefault(); reopenClosedTab(); return; }
    if (modifier && input.shift && (key === 'i' || key === 'j')) { _event.preventDefault(); tab.view.webContents.openDevTools(); return; }
    if (modifier && key === 't') { _event.preventDefault(); createTab(); return; }
    if (modifier && key === 'w') { _event.preventDefault(); closeTab(id); return; }
    if (modifier && key === 'd') { _event.preventDefault(); toggleBookmarkForTab(tab); return; }
    if (modifier && key === 'p') { _event.preventDefault(); tab.view.webContents.print(); return; }
    if (modifier && key === 'j') { _event.preventDefault(); mainWindow.webContents.send('browser-toast', 'A lista de downloads está disponível pelos downloads do Chromium.'); return; }
    if (modifier && key === 'h') { _event.preventDefault(); mainWindow.webContents.send('browser-toast', 'O histórico desta sessão está em memória.'); return; }
    if (modifier && key === 'f') { _event.preventDefault(); mainWindow.webContents.send('browser-toast', 'Use a busca da página do site para localizar texto.'); return; }
    if (modifier && key === 's') { _event.preventDefault(); tab.view.webContents.downloadURL(tab.url); return; }
    if (modifier && input.shift && key === 'u') { _event.preventDefault(); tab.view.webContents.loadURL(`view-source:${tab.url}`); return; }
    if (modifier && input.shift && key === 'delete') { _event.preventDefault(); session.defaultSession.clearStorageData(); mainWindow.webContents.send('browser-toast', 'Cookies e dados de navegação limpos.'); return; }
    if (input.alt && key === 'arrowleft' && tab.view.webContents.canGoBack()) { _event.preventDefault(); tab.view.webContents.goBack(); return; }
    if (input.alt && key === 'arrowright' && tab.view.webContents.canGoForward()) { _event.preventDefault(); tab.view.webContents.goForward(); return; }
    if (key === 'f5') { _event.preventDefault(); tab.view.webContents.reload(); return; }
    if (modifier && input.shift && key === 'b') { _event.preventDefault(); mainWindow.webContents.send('keyboard-action', 'bookmarks'); return; }
    if (modifier && key === 'tab') { _event.preventDefault(); switchTab(input.shift ? -1 : 1); return; }
    if (modifier && /^[1-8]$/.test(key)) { _event.preventDefault(); activateTab(tabs[Number(key) - 1]?.id); return; }
    if (modifier && key === '9') { _event.preventDefault(); activateTab(tabs[tabs.length - 1]?.id); return; }
    if (key === 'f12') { _event.preventDefault(); tab.view.webContents.openDevTools(); }
  });
  view.webContents.on('context-menu', (event, params) => {
    event.preventDefault();
    showContextMenu(tab, params);
  });
  view.webContents.loadURL(url);
  activateTab(id);
  return tab;
}

function switchTab(direction) {
  if (tabs.length < 2) return;
  const currentIndex = tabs.findIndex((tab) => tab.id === activeTabId);
  const nextIndex = (currentIndex + direction + tabs.length) % tabs.length;
  activateTab(tabs[nextIndex].id);
}

function reopenClosedTab() {
  const lastClosed = closedTabs.pop();
  if (lastClosed) createTab(lastClosed.url);
}

function showContextMenu(tab, params) {
  const menu = Menu.buildFromTemplate([
    { label: 'Voltar', enabled: tab.view.webContents.canGoBack(), click: () => tab.view.webContents.goBack() },
    { label: 'Avançar', enabled: tab.view.webContents.canGoForward(), click: () => tab.view.webContents.goForward() },
    { type: 'separator' },
    { label: 'Recarregar', click: () => tab.view.webContents.reload() },
    { label: 'Salvar favorito', click: () => toggleBookmarkForTab(tab) },
    { label: 'Inspecionar', click: () => tab.view.webContents.inspectElement(params.x, params.y) }
  ]);
  menu.popup({ window: mainWindow });
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
  if (!selectedTabIds.includes(id)) selectedTabIds = [id, ...selectedTabIds].slice(0, 6);
  layoutActiveView();
  sendTabs();
}

function layoutActiveView() {
  const [width, height] = mainWindow.getContentSize();
  const contentWidth = Math.max(0, width - (sidePanelOpen ? SIDE_PANEL_WIDTH : 0));
  const contentHeight = Math.max(0, height - HEADER_HEIGHT);
  const visibleTabs = mosaicMode
    ? tabs.filter((tab) => selectedTabIds.includes(tab.id)).slice(0, 6)
    : tabs.filter((tab) => tab.id === activeTabId);
  const columns = visibleTabs.length <= 1 ? 1 : visibleTabs.length === 2 ? 2 : visibleTabs.length <= 4 ? 2 : 3;
  const rows = visibleTabs.length <= 2 ? 1 : 2;
  const tileWidth = Math.floor(contentWidth / columns);
  const tileHeight = Math.floor(contentHeight / rows);

  for (const entry of tabs) mainWindow.removeBrowserView(entry.view);
  visibleTabs.forEach((entry, index) => {
    mainWindow.addBrowserView(entry.view);
    entry.view.setBounds({
      x: (index % columns) * tileWidth,
      y: HEADER_HEIGHT + Math.floor(index / columns) * tileHeight,
      width: tileWidth,
      height: tileHeight
    });
    entry.view.setAutoResize({ width: true, height: true });
  });
}

function setMosaic(enabled) {
  mosaicMode = Boolean(enabled);
  if (mosaicMode && selectedTabIds.length === 0 && activeTabId) selectedTabIds = [activeTabId];
  layoutActiveView();
  sendTabs();
}

function closeTab(id) {
  const index = tabs.findIndex((entry) => entry.id === id);
  if (index === -1) return;
  const wasActive = activeTabId === id;
  const [tab] = tabs.splice(index, 1);
  closedTabs.push({ url: tab.url, title: tab.title });
  if (closedTabs.length > 10) closedTabs.shift();
  selectedTabIds = selectedTabIds.filter((tabId) => tabId !== id);
  tab.view.webContents.close();
  if (tabs.length === 0) createTab();
  else if (wasActive) activateTab(tabs[Math.max(0, index - 1)].id);
  else {
    if (mosaicMode) layoutActiveView();
    sendTabs();
  }
}

function sendTabs() {
  if (!mainWindow) return;
  mainWindow.webContents.send('tabs-updated', {
    activeId: activeTabId,
    mosaicMode,
    sidePanelOpen,
    selectedTabIds,
    tabs: tabs.map(({ id, title, url, favicon }) => ({ id, title, url, favicon }))
  });
}

ipcMain.handle('tab-create', (_event, url) => {
  const tab = createTab(url || HOME_URL);
  if (!tab) mainWindow.webContents.send('browser-toast', 'O navegador permite no máximo 6 abas.');
  return tab ? tab.id : null;
});
ipcMain.handle('tab-close', (_event, id) => closeTab(id));
ipcMain.handle('tab-activate', (_event, id) => activateTab(id));
ipcMain.handle('tab-select', (_event, id, selected) => {
  if (selected && !selectedTabIds.includes(id) && selectedTabIds.length < 6) selectedTabIds.push(id);
  if (!selected) selectedTabIds = selectedTabIds.filter((tabId) => tabId !== id);
  if (mosaicMode) layoutActiveView();
  sendTabs();
});
ipcMain.handle('tab-select-all', (_event, selected) => {
  selectedTabIds = selected ? tabs.map((tab) => tab.id) : [];
  if (mosaicMode) layoutActiveView();
  sendTabs();
});
ipcMain.handle('set-mosaic', (_event, enabled) => setMosaic(enabled));
ipcMain.handle('set-side-panel', (_event, enabled) => {
  sidePanelOpen = Boolean(enabled);
  layoutActiveView();
  sendTabs();
});
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
ipcMain.handle('keyboard-shortcut', (_event, action) => {
  if (action === 'new-tab') createTab();
  if (action === 'close-tab' && activeTabId) closeTab(activeTabId);
  if (action === 'reopen-tab') reopenClosedTab();
  if (action === 'next-tab') switchTab(1);
  if (action === 'previous-tab') switchTab(-1);
  if (action === 'focus-address') mainWindow.webContents.send('focus-address');
  if (action === 'toggle-bookmark') toggleBookmarkForTab(tabs.find((tab) => tab.id === activeTabId));
  if (action === 'bookmarks') mainWindow.webContents.send('keyboard-action', 'bookmarks');
});
ipcMain.handle('get-browser-state', () => ({
  history: historyEntries,
  bookmarks,
  activeTabId,
  canGoBack: activeTabId ? tabs.find((tab) => tab.id === activeTabId).view.webContents.canGoBack() : false,
  canGoForward: activeTabId ? tabs.find((tab) => tab.id === activeTabId).view.webContents.canGoForward() : false
}));
function toggleBookmarkForTab(tab) {
  if (!tab) return bookmarks;
  const existing = bookmarks.findIndex((entry) => entry.url === tab.url);
  if (existing >= 0) bookmarks.splice(existing, 1);
  else bookmarks.unshift({ title: tab.title, url: tab.url });
  mainWindow.webContents.send('bookmarks-updated', bookmarks);
  return bookmarks;
}

function getExtensionList() {
  const activeExtensions = session.defaultSession.getAllExtensions();
  activeExtensions.forEach((extension) => extensionCatalog.set(extension.id, extension));
  return [...extensionCatalog.values()].map(({ id, name, version, path: extensionPath, manifest }) => ({
    id,
    name,
    version,
    path: extensionPath,
    enabled: activeExtensions.some((extension) => extension.id === id),
    hasOptions: Boolean(manifest?.options_page || manifest?.options_ui?.page)
  }));
}

ipcMain.handle('toggle-bookmark', () => {
  const tab = tabs.find((entry) => entry.id === activeTabId);
  return toggleBookmarkForTab(tab);
});
ipcMain.handle('clear-cookies', async (_event, mode) => {
  const tab = tabs.find((entry) => entry.id === activeTabId);
  const options = { storages: ['cookies', 'localstorage', 'caches'] };
  if (mode === 'tab' && tab) {
    try { options.origin = new URL(tab.url).origin; } catch {}
  }
  await session.defaultSession.clearStorageData(options);
  return mode === 'tab' ? 'Cookies e dados da aba limpos.' : 'Cookies e dados do navegador limpos.';
});
ipcMain.handle('get-extensions', getExtensionList);
ipcMain.handle('set-extension-enabled', async (_event, id, enabled) => {
  const extension = session.defaultSession.getAllExtensions().find((entry) => entry.id === id);
  if (enabled && !extension) {
    const extensionPath = extensionStates.get(id) || extensionCatalog.get(id)?.path;
    if (extensionPath) {
      const loadedExtension = await session.defaultSession.loadExtension(extensionPath);
      extensionCatalog.set(loadedExtension.id, loadedExtension);
    }
  } else if (!enabled && extension) {
    extensionStates.set(id, extension.path);
    extensionCatalog.set(id, extension);
    session.defaultSession.removeExtension(id);
  }
  return getExtensionList();
});
ipcMain.handle('open-extension-options', (_event, id) => {
  const extension = session.defaultSession.getAllExtensions().find((entry) => entry.id === id);
  const optionsPage = extension?.manifest?.options_page || extension?.manifest?.options_ui?.page;
  if (optionsPage) createTab(`chrome-extension://${id}/${optionsPage}`);
  else mainWindow.webContents.send('browser-toast', 'Esta extensão não possui página de opções.');
});
ipcMain.handle('manage-extensions', () => createTab('chrome://extensions'));
ipcMain.handle('open-webstore', () => shell.openExternal('https://chromewebstore.google.com/'));
ipcMain.handle('install-extension', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'], title: 'Selecionar pasta da extensão' });
  if (result.canceled || !result.filePaths[0]) return getExtensionList();
  await session.defaultSession.loadExtension(result.filePaths[0]);
  return getExtensionList();
});
ipcMain.handle('open-external', (_event, url) => shell.openExternal(url));
ipcMain.handle('open-profile', () => shell.openExternal('https://accounts.google.com/'));

app.whenReady().then(() => {
  createWindow();
  createTab();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
