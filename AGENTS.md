# AGENTS.md — GlobalClick2Dial

Quick-start context for AI agents working in this repo.

---

## What this project is

A **Google Chrome extension (Manifest V3)** that scans web page text and wraps detected US phone numbers and NANP toll-free numbers (+1) in clickable `tel:` / `callto:` / `zoomphonecall://` / custom-prefix links.

- Detection is **US and NANP toll-free (+1) only**. Other regions (e.g. UK +44, Canadian geographic +1) are intentionally excluded.
- Detection uses **libphonenumber-js** (`/max` build) — not a hand-rolled regex. Numbers must pass `isValid()` and the `isDialableUsOrTollFree()` check before a link is created.
- All processing happens **locally in the browser**. No page data is sent anywhere.

---

## Source layout

```
src/
  phone-utils.mjs        # Detection logic: wraps libphonenumber-js, exports findPhoneNumbers()
  content-helpers.mjs    # Pure helpers (domain filter, href builder, digit pre-check)
  content-app.mjs        # Content script entry: DOM walker, MutationObserver, badge reporting

background.js            # MV3 service worker: badge text, one-time storage migration
options.html / options.js / options.css   # Settings page
popup.html / popup.js    # Toolbar popup: "Disable on this site" + link to settings
content.css              # Styles injected into every page for .click2dial-link

scripts/
  build.mjs              # esbuild: src/ → dist/phone-utils.js + dist/content.js (supports --watch)

test/
  phone-utils.test.mjs   # Vitest: SHOULD_MATCH / SHOULD_NOT_MATCH fixtures
  content-helpers.test.mjs  # Vitest: pure helper unit tests
  test-page.html         # Manual browser regression page (load with extension enabled)
```

### Key generated outputs (gitignored)

| Path | Source |
|---|---|
| `dist/phone-utils.js` | `src/phone-utils.mjs` (IIFE bundle, sets `globalThis.Click2DialPhoneUtils`) |
| `dist/content.js` | `src/content-app.mjs` (IIFE bundle; reads `window.Click2DialPhoneUtils`) |

These are produced by `npm run build` and loaded by `manifest.json`. They are **not committed**.

---

## npm scripts

```bash
npm ci          # install + run postinstall (which runs npm run build)
npm run build   # esbuild src/ → dist/
npm run dev     # esbuild in watch mode (useful while editing src/)
npm test        # vitest run (43 tests across 2 files)
npm run test:watch
```

---

## Chrome extension permissions

| Permission | Why |
|---|---|
| `storage` | `chrome.storage.sync` for user settings |
| `activeTab` | Reading `tab.url` in popup for "Disable on this site" |
| No `host_permissions` | Content scripts run via `content_scripts.matches: ["<all_urls>"]` — `host_permissions` is not needed |

---

## Data flow

```
Page loads
  → content script injected (dist/phone-utils.js then dist/content.js)
  → chrome.storage.sync.get() for settings
  → shouldRunOnPage() checks domain blacklist/whitelist
  → DOM TreeWalker visits every text node
      → hasAtLeastDigits() pre-filter (skip nodes with < 7 digits)
      → findPhoneNumbers() via libphonenumber-js
          → acceptMatch() boundary + isValid() + isDialableUsOrTollFree()
      → matching text wrapped in <a data-click2dial="1" rel="nofollow noopener">
  → MutationObserver handles childList + characterData (SPAs, dynamic content)
  → Badge count reported via chrome.runtime.sendMessage → background.js
```

---

## Settings (chrome.storage.sync keys)

| Key | Type | Default | Purpose |
|---|---|---|---|
| `protocol` | `string` | `'tel'` | Link scheme: `tel`, `callto`, `zoomphonecall`, `custom` |
| `customPrefix` | `string` | `''` | Used when `protocol === 'custom'` |
| `domainFilterMode` | `string` | `'blacklist'` | `'blacklist'` or `'whitelist'` |
| `domainList` | `string` | `''` | Comma-separated hostnames (supports `*.example.com`) |

`defaultCountryCode` was removed in v1.2.0 — detection is always US. The background worker removes the stale key via `chrome.storage.sync.remove` on install.

---

## CI / release

- **`.github/workflows/ci.yml`** — runs on push to `main` and all PRs: `npm ci`, `npm test`, `npm run build`, then `test -s dist/phone-utils.js && test -s dist/content.js`.
- **`.github/workflows/release-please.yml`** — creates release PRs on `main`; bumps `package.json`, `package-lock.json`, and `manifest.json` (via `extra-files`). On release: builds, zips, uploads to GitHub Releases and Chrome Web Store.
- **`.github/workflows/chrome-sync.yml`** — manual workflow to re-push a specific tag to the Chrome Web Store.
- **`.github/dependabot.yml`** — weekly npm updates (minor/patch grouped), monthly GitHub Actions updates.
- **`release-please-config.json`** — `release-type: "node"` with `manifest.json` version kept in sync via `extra-files`.

---

## Things to know before making changes

1. **Never edit `dist/` files directly** — always edit `src/` and run `npm run build`.
2. **Detection scope is intentionally US + toll-free only.** Do not broaden detection to other regions without discussing the scope change.
3. **Add test fixtures when changing detection logic.** `test/phone-utils.test.mjs` uses `SHOULD_MATCH` and `SHOULD_NOT_MATCH` arrays that mirror `test/test-page.html`. Keep both in sync.
4. **Phone numbers in tests use real NANP numbers** (e.g. `201-555-0123`, `650-253-0000`) — not fictional `555-xxxx` patterns which do not pass `isValid()`.
5. **`iframes` are not scanned.** `manifest.json` does not set `all_frames: true`. That is a known limitation, not a bug.
6. **`manifest.json` version** is the source of truth for the extension version and must match `package.json` version and `.release-please-manifest.json`.
