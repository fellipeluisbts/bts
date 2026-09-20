const tabsElement = document.querySelector('#tabs');
const address = document.querySelector('#address');
const addressForm = document.querySelector('#address-form');
const bookmarksList = document.querySelector('#bookmarks-list');
const toast = document.querySelector('#toast');
let activeTabId = null;
let currentBookmarks = [];
let selectedTabIds = [];
let contextExtensionId = null;
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2200);
}

function renderTabs(data) {
  activeTabId = data.activeId;
  selectedTabIds = data.selectedTabIds || [];
  document.querySelector('#mosaic').classList.toggle('active', data.mosaicMode);
  document.querySelector('#side-panel').classList.toggle('active', data.sidePanelOpen);
  const selectAll = document.querySelector('#select-all-tabs');
  selectAll.checked = data.tabs.length > 0 && data.tabs.every((tab) => selectedTabIds.includes(tab.id));
  selectAll.indeterminate = selectedTabIds.length > 0 && !selectAll.checked;
  tabsElement.replaceChildren();
  for (const tab of data.tabs) {
    const element = document.createElement('div');
    element.className = `tab ${tab.id === activeTabId ? 'active' : ''}`;
    element.addEventListener('click', (event) => {
      if (!event.target.closest('input, button')) window.browserAPI.activateTab(tab.id);
    });
    const favicon = tab.favicon ? `<img src="${tab.favicon}" alt="">` : '<span class="tab-favicon">◉</span>';
    element.innerHTML = `${favicon}<span class="tab-title">${escapeHtml(tab.title)}</span><input class="tab-check" type="checkbox" title="Selecionar no mosaico" ${selectedTabIds.includes(tab.id) ? 'checked' : ''}><button class="tab-close" title="Fechar aba">×</button>`;
    element.querySelector('.tab-check').addEventListener('change', (event) => window.browserAPI.selectTab(tab.id, event.target.checked));
    element.querySelector('.tab-close').addEventListener('click', (event) => {
      event.stopPropagation();
      window.browserAPI.closeTab(tab.id);
    });
    tabsElement.append(element);
  }
  const active = data.tabs.find((tab) => tab.id === activeTabId);
  if (active) address.value = active.url;
}

function renderBookmarks(bookmarks) {
  currentBookmarks = bookmarks;
  bookmarksList.replaceChildren();
  for (const bookmark of bookmarks.slice(0, 8)) {
    const button = document.createElement('button');
    button.className = 'bookmark-item';
    button.textContent = bookmark.title || bookmark.url;
    button.title = bookmark.url;
    button.addEventListener('click', () => window.browserAPI.navigate(bookmark.url));
    bookmarksList.append(button);
  }
  if (bookmarks.length === 0) bookmarksList.innerHTML = '<span class="empty-state">Nenhum favorito salvo.</span>';
}

function togglePanel(id, visible) {
  document.querySelectorAll('.floating-panel').forEach((panel) => { if (panel.id !== id) panel.hidden = true; });
  const panel = document.querySelector(`#${id}`);
  if (!panel) return;
  panel.hidden = visible === undefined ? !panel.hidden : !visible;
  window.browserAPI.setUiOverlay(!panel.hidden);
}

async function renderExtensions() {
  const list = document.querySelector('#extensions-list');
  const extensions = await window.browserAPI.getExtensions();
  list.replaceChildren();
  if (!extensions.length) {
    list.innerHTML = '<span class="empty-state">Nenhuma extensão instalada.</span>';
    return;
  }
  extensions.forEach((extension) => {
    const item = document.createElement('div');
    item.className = 'extension-item';
    item.innerHTML = `<span class="extension-icon">◇</span><span class="extension-copy"><strong>${escapeHtml(extension.name)}</strong><small>Versão ${escapeHtml(extension.version)}</small></span><label class="switch" title="Ativar ou desativar"><input type="checkbox" ${extension.enabled ? 'checked' : ''}><span class="switch-slider"></span></label>`;
    item.querySelector('input').addEventListener('change', async (event) => {
      await window.browserAPI.setExtensionEnabled(extension.id, event.target.checked);
      await renderExtensions();
    });
    item.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      contextExtensionId = extension.id;
      const contextMenu = document.querySelector('#extension-context-menu');
      contextMenu.style.left = `${event.clientX}px`;
      contextMenu.style.top = `${event.clientY}px`;
      contextMenu.hidden = false;
    });
    list.append(item);
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]);
}

addressForm.addEventListener('submit', (event) => {
  event.preventDefault();
  window.browserAPI.navigate(address.value);
  address.blur();
});
address.addEventListener('click', () => address.select());
address.addEventListener('focus', () => address.select());

document.querySelector('#new-tab').addEventListener('click', () => window.browserAPI.createTab());
document.querySelector('#mosaic').addEventListener('click', (event) => {
  const enabled = !event.currentTarget.classList.contains('active');
  window.browserAPI.setMosaic(enabled);
  if (enabled) showToast('Mosaico ativado');
});
document.querySelector('#select-all-tabs').addEventListener('change', (event) => {
  window.browserAPI.selectAllTabs(event.target.checked);
});
document.querySelector('#bookmarks').addEventListener('click', () => togglePanel('bookmarks-panel'));
document.querySelector('#bookmarks').addEventListener('click', () => {
  const button = document.querySelector('#bookmarks').getBoundingClientRect();
  const panel = document.querySelector('#bookmarks-panel');
  panel.style.left = `${button.left}px`;
  panel.style.right = 'auto';
});
document.querySelector('#menu-button').addEventListener('click', async () => {
  const sidePanel = document.querySelector('#side-panel-content');
  const menu = document.querySelector('#browser-menu');
  menu.style.right = sidePanel.hidden ? '10px' : '340px';
  togglePanel('browser-menu');
  await renderExtensions();
});
document.querySelector('#side-panel').addEventListener('click', (event) => {
  const enabled = !event.currentTarget.classList.contains('active');
  document.querySelector('#side-panel-content').hidden = !enabled;
  document.querySelector('#browser-menu').style.right = enabled ? '340px' : '10px';
  window.browserAPI.setSidePanel(enabled);
});
document.querySelector('#close-side-panel').addEventListener('click', () => {
  document.querySelector('#side-panel').classList.remove('active');
  document.querySelector('#side-panel-content').hidden = true;
  document.querySelector('#browser-menu').style.right = '10px';
  window.browserAPI.setSidePanel(false);
});
document.querySelector('#side-bookmarks').addEventListener('click', () => togglePanel('bookmarks-panel', true));
document.querySelectorAll('[data-close-panel]').forEach((button) => button.addEventListener('click', () => togglePanel(button.dataset.closePanel, false)));
document.querySelector('#bookmark').addEventListener('click', async () => {
  renderBookmarks(await window.browserAPI.toggleBookmark());
  showToast('Favorito atualizado');
});

document.querySelector('#profile').addEventListener('click', () => window.browserAPI.openProfile());
document.querySelector('#install-extension').addEventListener('click', async () => {
  await window.browserAPI.installExtension();
  await renderExtensions();
  showToast('Extensões atualizadas');
});
document.querySelector('#manage-extensions').addEventListener('click', () => window.browserAPI.manageExtensions());
document.querySelector('#open-webstore').addEventListener('click', () => window.browserAPI.openWebStore());
document.querySelector('#context-manage-extension').addEventListener('click', () => {
  document.querySelector('#extension-context-menu').hidden = true;
  window.browserAPI.manageExtensions();
});
document.querySelector('#context-extension-options').addEventListener('click', () => {
  document.querySelector('#extension-context-menu').hidden = true;
  if (contextExtensionId) window.browserAPI.openExtensionOptions(contextExtensionId);
});
document.querySelector('#clear-tab-cookies').addEventListener('click', async () => showToast(await window.browserAPI.clearCookies('tab')));
document.querySelector('#clear-browser-cookies').addEventListener('click', async () => showToast(await window.browserAPI.clearCookies('browser')));

document.addEventListener('keydown', (event) => {
  const modifier = event.ctrlKey || event.metaKey;
  if (!modifier) return;
  const key = event.key.toLowerCase();
  const shortcuts = {
    t: event.shiftKey ? 'reopen-tab' : 'new-tab',
    w: 'close-tab',
    l: 'focus-address',
    d: 'toggle-bookmark',
    b: event.shiftKey ? 'bookmarks' : null,
    tab: event.shiftKey ? 'previous-tab' : 'next-tab'
  };
  const action = shortcuts[key];
  if (action) {
    event.preventDefault();
    window.browserAPI.keyboardShortcut(action);
  }
});

document.querySelectorAll('[data-action]').forEach((button) => {
  button.addEventListener('click', () => window.browserAPI.browserAction(button.dataset.action));
});

window.browserAPI.onTabsUpdated(renderTabs);
window.browserAPI.onBookmarksUpdated(renderBookmarks);
window.browserAPI.onFocusAddress(() => { address.focus(); address.select(); });
window.browserAPI.onLoadingChanged(({ loading }) => {
  document.querySelector('#reload').textContent = loading ? '×' : '↻';
});
window.browserAPI.onDownloadStarted(({ filename }) => showToast(`Baixando ${filename}`));
window.browserAPI.onDownloadFinished(({ filename, state }) => showToast(`${filename}: ${state === 'completed' ? 'concluído' : 'interrompido'}`));
window.browserAPI.onBrowserToast(showToast);
window.browserAPI.onKeyboardAction((action) => {
  if (action === 'bookmarks') togglePanel('bookmarks-panel');
});
document.addEventListener('click', () => { document.querySelector('#extension-context-menu').hidden = true; });

window.browserAPI.getState().then((state) => renderBookmarks(state.bookmarks));
