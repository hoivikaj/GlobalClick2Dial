'use strict';

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.remove('defaultCountryCode');
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== 'click2dial-badge' || sender.tab?.id === undefined) return;
  const c = Number(message.count) || 0;
  const text = c <= 0 ? '' : c > 99 ? '99+' : String(c);
  chrome.action.setBadgeText({ tabId: sender.tab.id, text });
  chrome.action.setBadgeBackgroundColor({ tabId: sender.tab.id, color: '#0d6efd' });
});
