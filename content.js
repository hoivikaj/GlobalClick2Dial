(function () {
  'use strict';

  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'CODE', 'PRE']);

  /**
   * Parse comma-separated domain list into trimmed, non-empty entries.
   * @param {string} domainList
   * @returns {string[]}
   */
  function parseDomainList(domainList) {
    return (domainList || '').split(',').map(s => s.trim()).filter(Boolean);
  }

  /**
   * Check if hostname matches a single domain pattern (supports *.example.com).
   * @param {string} host - current hostname (e.g. www.example.com)
   * @param {string} pattern - e.g. example.com or *.example.com
   * @returns {boolean}
   */
  function hostMatchesPattern(host, pattern) {
    if (!host || !pattern) return false;
    host = host.toLowerCase();
    pattern = pattern.toLowerCase();
    if (pattern.startsWith('*.')) {
      const suffix = pattern.slice(2); // example.com
      return host === suffix || host.endsWith('.' + suffix);
    }
    return host === pattern;
  }

  /**
   * Check if hostname is in the domain list (any entry matches).
   * @param {string} host
   * @param {string[]} domains
   * @returns {boolean}
   */
  function isHostInDomainList(host, domains) {
    return domains.some(d => hostMatchesPattern(host, d));
  }

  /**
   * Decide whether the extension should run on this page based on filter mode and list.
   * @param {string} host
   * @param {string} mode - 'blacklist' | 'whitelist'
   * @param {string} domainListStr - comma-separated
   * @returns {boolean}
   */
  function shouldRunOnPage(host, mode, domainListStr) {
    const domains = parseDomainList(domainListStr);
    if (mode === 'blacklist') {
      return !isHostInDomainList(host, domains);
    }
    if (mode === 'whitelist') {
      return domains.length > 0 && isHostInDomainList(host, domains);
    }
    return true;
  }

  function buildHref(protocol, customPrefix, e164) {
    switch (protocol) {
      case 'tel':
      case 'callto':
        return protocol + ':' + e164;
      case 'zoomphonecall':
        return 'zoomphonecall://' + e164;
      case 'custom':
        const prefix = (customPrefix || '').replace(/\s/g, '');
        return prefix + (prefix && !/[/:]$/.test(prefix) ? '' : '') + e164;
      default:
        return 'tel:' + e164;
    }
  }

  function processTextNode(textNode, defaultCountryCode, protocol, customPrefix) {
    const text = textNode.textContent;
    if (!text || text.length < 7) return;

    const matches = window.Click2DialPhoneUtils.findPhoneNumbers(text, defaultCountryCode);
    if (matches.length === 0) return;

    const parent = textNode.parentNode;
    if (!parent) return;
    if (SKIP_TAGS.has(parent.tagName)) return;
    if (parent.tagName === 'A' && parent.getAttribute('href')) return;

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
      frag.appendChild(a);
      lastEnd = m.end;
    }
    if (lastEnd < text.length) {
      frag.appendChild(document.createTextNode(text.slice(lastEnd)));
    }
    parent.replaceChild(frag, textNode);
  }

  function walkAndConvert(root, defaultCountryCode, protocol, customPrefix) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const p = node.parentNode;
        if (!p) return NodeFilter.FILTER_REJECT;
        if (SKIP_TAGS.has(p.tagName)) return NodeFilter.FILTER_REJECT;
        if (p.tagName === 'A' && p.getAttribute('href')) return NodeFilter.FILTER_REJECT;
        if (p.getAttribute && p.getAttribute('data-click2dial') === '1') return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const textNodes = [];
    let n;
    while ((n = walker.nextNode())) textNodes.push(n);
    textNodes.forEach(node => processTextNode(node, defaultCountryCode, protocol, customPrefix));
  }

  /** Current settings used for initial run and for MutationObserver (updated on run/settings change). */
  let currentSettings = null;

  function run(settings, root) {
    const host = window.location.hostname;
    const domainFilterMode = settings.domainFilterMode || 'blacklist';
    const domainList = settings.domainList || '';
    if (!shouldRunOnPage(host, domainFilterMode, domainList)) return;

    const defaultCountryCode = (settings.defaultCountryCode || '1').replace(/\D/g, '') || '1';
    const protocol = settings.protocol || 'tel';
    const customPrefix = (settings.customPrefix || '').trim();

    currentSettings = { defaultCountryCode, protocol, customPrefix };
    const target = root || document.body;
    if (!target) return;
    walkAndConvert(target, defaultCountryCode, protocol, customPrefix);
  }

  function processNewNodes(addedNodes) {
    if (!currentSettings) return;
    const elements = [];
    addedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE && document.contains(node)) elements.push(node);
    });
    const topLevel = elements.filter(el => !elements.some(other => other !== el && other.contains(el)));
    topLevel.forEach(root => {
      walkAndConvert(root, currentSettings.defaultCountryCode, currentSettings.protocol, currentSettings.customPrefix);
    });
  }

  const defaults = {
    protocol: 'tel',
    customPrefix: '',
    defaultCountryCode: '1',
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
      mutations.forEach(m => {
        m.addedNodes.forEach(node => pending.push(node));
      });
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
    observer.observe(document.body, { childList: true, subtree: true });
  }

  init();

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'sync') return;
    if (changes.protocol || changes.customPrefix || changes.defaultCountryCode || changes.domainFilterMode || changes.domainList) {
      document.querySelectorAll('a[data-click2dial="1"]').forEach(a => {
        const text = document.createTextNode(a.textContent);
        a.parentNode.replaceChild(text, a);
      });
      chrome.storage.sync.get(defaults, (settings) => run(settings));
    }
  });
})();
