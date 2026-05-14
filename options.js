(function () {
  'use strict';

  const PROTOCOL_RADIOS = document.querySelectorAll('input[name="protocol"]');
  const CUSTOM_PREFIX_WRAP = document.getElementById('customPrefixWrap');
  const CUSTOM_PREFIX_INPUT = document.getElementById('customPrefix');
  const SAVE_BTN = document.getElementById('save');
  const STATUS = document.getElementById('status');

  const DEFAULTS = {
    protocol: 'tel',
    customPrefix: '',
    domainFilterMode: 'blacklist',
    domainList: ''
  };

  function showStatus(message, isSuccess) {
    STATUS.textContent = message;
    STATUS.className = 'status' + (isSuccess ? ' saved' : '');
    if (message) {
      setTimeout(() => {
        STATUS.textContent = '';
        STATUS.className = 'status';
      }, 3000);
    }
  }

  function toggleCustomPrefix() {
    const useCustom = document.querySelector('input[name="protocol"]:checked')?.value === 'custom';
    CUSTOM_PREFIX_WRAP.hidden = !useCustom;
  }

  PROTOCOL_RADIOS.forEach((r) => r.addEventListener('change', toggleCustomPrefix));

  const DOMAIN_MODE_RADIOS = document.querySelectorAll('input[name="domainFilterMode"]');
  const DOMAIN_LIST_INPUT = document.getElementById('domainList');
  const DOMAIN_LIST_HINT = document.getElementById('domainListHint');

  function updateDomainListHint() {
    const isWhitelist = document.querySelector('input[name="domainFilterMode"]:checked')?.value === 'whitelist';
    DOMAIN_LIST_HINT.innerHTML = isWhitelist
      ? 'Domains where the extension is <strong>enabled</strong> (whitelist).'
      : 'Domains where the extension is <strong>disabled</strong> (blacklist).';
  }
  DOMAIN_MODE_RADIOS.forEach((r) => r.addEventListener('change', updateDomainListHint));

  function getProtocolValue() {
    const protocol = document.querySelector('input[name="protocol"]:checked')?.value || DEFAULTS.protocol;
    if (protocol === 'custom') {
      const prefix = (CUSTOM_PREFIX_INPUT.value || '').trim();
      return { protocol: 'custom', customPrefix: prefix };
    }
    return { protocol, customPrefix: '' };
  }

  function load() {
    chrome.storage.sync.get(DEFAULTS, (stored) => {
      const protocol = stored.protocol || DEFAULTS.protocol;
      const radio = document.querySelector(`input[name="protocol"][value="${protocol}"]`);
      if (radio) radio.checked = true;
      else document.querySelector('input[name="protocol"][value="tel"]').checked = true;

      CUSTOM_PREFIX_INPUT.value = stored.customPrefix || DEFAULTS.customPrefix;
      const domainMode = stored.domainFilterMode || DEFAULTS.domainFilterMode;
      const domainRadio = document.querySelector(`input[name="domainFilterMode"][value="${domainMode}"]`);
      if (domainRadio) domainRadio.checked = true;
      DOMAIN_LIST_INPUT.value = stored.domainList || DEFAULTS.domainList;
      toggleCustomPrefix();
      updateDomainListHint();
    });
  }

  function save() {
    const { protocol, customPrefix } = getProtocolValue();
    const domainFilterMode = document.querySelector('input[name="domainFilterMode"]:checked')?.value || 'blacklist';
    const domainList = (DOMAIN_LIST_INPUT.value || '').trim();

    chrome.storage.sync.set(
      {
        protocol,
        customPrefix: customPrefix.trim(),
        domainFilterMode,
        domainList
      },
      () => {
        showStatus('Settings saved.', true);
      }
    );
  }

  SAVE_BTN.addEventListener('click', save);
  load();
})();
