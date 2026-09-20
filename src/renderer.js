const tabsElement = document.querySelector('#tabs');
const address = document.querySelector('#address');
const addressForm = document.querySelector('#address-form');
const bookmarksBar = document.querySelector('#bookmarks-bar');
const toast = document.querySelector('#toast');
let activeTabId = null;
let currentBookmarks = [];
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2200);
}

function renderTabs(data) {
  activeTabId = data.activeId;
  tabsElement.replaceChildren();
  for (const tab of data.tabs) {
    const element = document.createElement('div');
    element.className = `tab ${tab.id === activeTabId ? 'active' : ''}`;
    element.addEventListener('click', () => window.browserAPI.activateTab(tab.id));
    const favicon = tab.favicon ? `<img src="${tab.favicon}" alt="">` : '<span class="tab-favicon">◉</span>';
    element.innerHTML = `${favicon}<span class="tab-title">${escapeHtml(tab.title)}</span><button class="tab-close" title="Fechar aba">×</button>`;
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
  bookmarksBar.replaceChildren();
  for (const bookmark of bookmarks.slice(0, 8)) {
    const button = document.createElement('button');
    button.className = 'bookmark-item';
    button.textContent = bookmark.title || bookmark.url;
    button.title = bookmark.url;
    button.addEventListener('click', () => window.browserAPI.navigate(bookmark.url));
    bookmarksBar.append(button);
  }
  bookmarksBar.classList.toggle('has-items', bookmarks.length > 0);
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
document.querySelector('#bookmark').addEventListener('click', async () => {
  renderBookmarks(await window.browserAPI.toggleBookmark());
  showToast('Favorito atualizado');
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

window.browserAPI.getState().then((state) => renderBookmarks(state.bookmarks));
