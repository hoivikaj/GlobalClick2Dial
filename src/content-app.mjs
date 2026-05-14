/**
 * Content script entry (bundled to root content.js).
 */

import {
  shouldRunOnPage,
  buildHref,
  hasAtLeastDigits
} from './content-helpers.mjs';

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'CODE', 'PRE']);

function reportBadgeCount() {
  try {
    const count = document.querySelectorAll('a[data-click2dial="1"]').length;
    chrome.runtime.sendMessage({ type: 'click2dial-badge', count });
  } catch {
    /* ignore if background missing */
  }
}

function processTextNode(textNode, protocol, customPrefix) {
  const text = textNode.textContent;
  if (!text || text.length < 7) return 0;
  if (!hasAtLeastDigits(text, 7)) return 0;

  const matches = window.Click2DialPhoneUtils.findPhoneNumbers(text, '1');
  if (matches.length === 0) return 0;

  const parent = textNode.parentNode;
  if (!parent) return 0;
  if (SKIP_TAGS.has(parent.tagName)) return 0;
  if (parent.tagName === 'A' && parent.getAttribute('href')) return 0;

  const frag = document.createDocumentFragment();
  let lastEnd = 0;

  for (const m of matches) {
    if (m.start > lastEnd) {
      frag.appendChild(document.createTextNode(text.slice(lastEnd, m.start)));
    }
    const a = document.createElement('a');
    a.href = buildHref(protocol, customPrefix, m.e164);
    a.textContent = m.raw;
    a.className = 'click2dial-link';
    a.setAttribute('data-click2dial', '1');
    a.setAttribute('rel', 'nofollow noopener');
    a.setAttribute('aria-label', 'Call ' + m.raw);
    frag.appendChild(a);
    lastEnd = m.end;
  }
  if (lastEnd < text.length) {
    frag.appendChild(document.createTextNode(text.slice(lastEnd)));
  }
  parent.replaceChild(frag, textNode);
  return matches.length;
}

function walkAndConvert(root, protocol, customPrefix) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const p = node.parentNode;
      if (!p) return NodeFilter.FILTER_REJECT;
      if (SKIP_TAGS.has(p.tagName)) return NodeFilter.FILTER_REJECT;
      if (p.tagName === 'A' && p.getAttribute('href')) return NodeFilter.FILTER_REJECT;
      if (p.getAttribute && p.getAttribute('data-click2dial') === '1') {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const textNodes = [];
  let n;
  while ((n = walker.nextNode())) textNodes.push(n);
  let created = 0;
  textNodes.forEach((node) => {
    created += processTextNode(node, protocol, customPrefix);
  });
  return created;
}

let currentSettings = null;

function run(settings, root) {
  const host = window.location.hostname;
  const domainFilterMode = settings.domainFilterMode || 'blacklist';
  const domainList = settings.domainList || '';
  if (!shouldRunOnPage(host, domainFilterMode, domainList)) {
    reportBadgeCount();
    return;
  }

  const protocol = settings.protocol || 'tel';
  const customPrefix = (settings.customPrefix || '').trim();

  currentSettings = { protocol, customPrefix };
  const target = root || document.body;
  if (!target) return;
  walkAndConvert(target, protocol, customPrefix);
  reportBadgeCount();
}

function processNewNodes(pending) {
  if (!currentSettings) return;
  const { protocol, customPrefix } = currentSettings;

  const textNodes = pending.filter(
    (node) => node.nodeType === Node.TEXT_NODE && document.contains(node)
  );
  const elements = pending.filter(
    (node) => node.nodeType === Node.ELEMENT_NODE && document.contains(node)
  );

  const topLevel = elements.filter(
    (el) => !elements.some((other) => other !== el && other.contains(el))
  );
  topLevel.forEach((root) => {
    walkAndConvert(root, protocol, customPrefix);
  });

  textNodes.forEach((tn) => {
    const p = tn.parentNode;
    if (!p || !document.contains(tn)) return;
    if (SKIP_TAGS.has(p.tagName)) return;
    if (p.tagName === 'A' && p.getAttribute('href')) return;
    if (p.getAttribute && p.getAttribute('data-click2dial') === '1') return;
    processTextNode(tn, protocol, customPrefix);
  });

  reportBadgeCount();
}

const defaults = {
  protocol: 'tel',
  customPrefix: '',
  domainFilterMode: 'blacklist',
  domainList: ''
};

function init() {
  chrome.storage.sync.get(defaults, (settings) => {
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', () => {
        run(settings);
        startObserving();
      });
    } else {
      run(settings);
      startObserving();
    }
  });
}

function startObserving() {
  let pending = [];
  let scheduled = false;
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'characterData' && m.target && m.target.nodeType === Node.TEXT_NODE) {
        pending.push(m.target);
      } else {
        m.addedNodes.forEach((node) => pending.push(node));
      }
    }
    if (pending.length === 0) return;
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        const nodes = pending;
        pending = [];
        processNewNodes(nodes);
      });
    }
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    characterDataOldValue: true
  });
}

init();

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'sync') return;
  if (changes.protocol || changes.customPrefix || changes.domainFilterMode || changes.domainList) {
    document.querySelectorAll('a[data-click2dial="1"]').forEach((a) => {
      const text = document.createTextNode(a.textContent);
      a.parentNode.replaceChild(text, a);
    });
    chrome.storage.sync.get(defaults, (settings) => run(settings));
  }
});
