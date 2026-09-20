const tabsElement = document.querySelector('#tabs');
const address = document.querySelector('#address');
const addressForm = document.querySelector('#address-form');
const bookmarksList = document.querySelector('#bookmarks-list');
const toast = document.querySelector('#toast');
let activeTabId = null;
let currentBookmarks = [];
let selectedTabIds = [];
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
  if (panel) panel.hidden = visible === undefined ? !panel.hidden : !visible;
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
    item.innerHTML = `<span class="extension-icon">◇</span><span><strong>${escapeHtml(extension.name)}</strong><small>Versão ${escapeHtml(extension.version)}</small></span>`;
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

document.querySelector('#new-tab').addEventListener('click', () => window.browserAPI.createTab());
document.querySelector('#mosaic').addEventListener('click', (event) => {
  const enabled = !event.currentTarget.classList.contains('active');
  window.browserAPI.setMosaic(enabled);
  if (enabled) showToast('Mosaico ativado');
});
document.querySelector('#bookmarks').addEventListener('click', () => togglePanel('bookmarks-panel'));
document.querySelector('#menu-button').addEventListener('click', async () => {
  togglePanel('browser-menu');
  await renderExtensions();
});
document.querySelector('#side-panel').addEventListener('click', (event) => {
  const enabled = !event.currentTarget.classList.contains('active');
  document.querySelector('#side-panel-content').hidden = !enabled;
  window.browserAPI.setSidePanel(enabled);
});
document.querySelector('#close-side-panel').addEventListener('click', () => {
  document.querySelector('#side-panel').classList.remove('active');
  document.querySelector('#side-panel-content').hidden = true;
  window.browserAPI.setSidePanel(false);
});
document.querySelector('#side-bookmarks').addEventListener('click', () => togglePanel('bookmarks-panel', true));
document.querySelectorAll('[data-close-panel]').forEach((button) => button.addEventListener('click', () => { document.querySelector(`#${button.dataset.closePanel}`).hidden = true; }));
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
document.querySelector('#manage-extensions').addEventListener('click', () => showToast('Use as opções do menu para instalar extensões locais.'));
document.querySelector('#clear-tab-cookies').addEventListener('click', async () => showToast(await window.browserAPI.clearCookies('tab')));
document.querySelector('#clear-browser-cookies').addEventListener('click', async () => showToast(await window.browserAPI.clearCookies('browser')));

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

window.browserAPI.getState().then((state) => renderBookmarks(state.bookmarks));
