/**
 * Pure helpers shared by the content script (unit-tested) and bundled build.
 */

/**
 * @param {string} domainList
 * @returns {string[]}
 */
export function parseDomainList(domainList) {
  return (domainList || '').split(',').map((s) => s.trim()).filter(Boolean);
}

/**
 * @param {string} host
 * @param {string} pattern
 * @returns {boolean}
 */
export function hostMatchesPattern(host, pattern) {
  if (!host || !pattern) return false;
  host = host.toLowerCase();
  pattern = pattern.toLowerCase();
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(2);
    return host === suffix || host.endsWith('.' + suffix);
  }
  return host === pattern;
}

/**
 * @param {string} host
 * @param {string[]} domains
 * @returns {boolean}
 */
export function isHostInDomainList(host, domains) {
  return domains.some((d) => hostMatchesPattern(host, d));
}

/**
 * @param {string} host
 * @param {string} mode - 'blacklist' | 'whitelist'
 * @param {string} domainListStr
 * @returns {boolean}
 */
export function shouldRunOnPage(host, mode, domainListStr) {
  const domains = parseDomainList(domainListStr);
  if (mode === 'blacklist') {
    return !isHostInDomainList(host, domains);
  }
  if (mode === 'whitelist') {
    return domains.length > 0 && isHostInDomainList(host, domains);
  }
  return true;
}

/**
 * @param {string} protocol
 * @param {string} customPrefix
 * @param {string} e164
 * @returns {string}
 */
export function buildHref(protocol, customPrefix, e164) {
  switch (protocol) {
    case 'tel':
    case 'callto':
      return protocol + ':' + e164;
    case 'zoomphonecall':
      return 'zoomphonecall://' + e164;
    case 'custom': {
      const prefix = (customPrefix || '').replace(/\s/g, '');
      return prefix + (prefix && !/[/:]$/.test(prefix) ? '' : '') + e164;
    }
    default:
      return 'tel:' + e164;
  }
}

/**
 * Fast pre-check before libphonenumber scan.
 * @param {string} text
 * @param {number} minDigits
 * @returns {boolean}
 */
export function hasAtLeastDigits(text, minDigits) {
  let n = 0;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) >= 48 && text.charCodeAt(i) <= 57) {
      n++;
      if (n >= minDigits) return true;
    }
  }
  return false;
}
