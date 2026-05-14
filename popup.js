'use strict';

document.getElementById('openOptions').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

const statusEl = document.getElementById('popupStatus');

document.getElementById('disableSite').addEventListener('click', async () => {
  statusEl.textContent = '';
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) {
    statusEl.textContent = 'Could not read this tab.';
    return;
  }
  let host;
  try {
    host = new URL(tab.url).hostname;
  } catch {
    statusEl.textContent = 'Not a normal web page.';
    return;
  }
  if (!host) {
    statusEl.textContent = 'No hostname for this tab.';
    return;
  }

  chrome.storage.sync.get(
    { domainFilterMode: 'blacklist', domainList: '' },
    (data) => {
      const existing = (data.domainList || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const set = new Set(existing);
      if (set.has(host)) {
        statusEl.textContent = 'Already on the list. Reload the page if links remain.';
        return;
      }
      set.add(host);
      chrome.storage.sync.set(
        {
          domainFilterMode: 'blacklist',
          domainList: Array.from(set).join(', ')
        },
        () => {
          statusEl.textContent = 'Saved. Reload this page to apply.';
        }
      );
    }
  );
});
