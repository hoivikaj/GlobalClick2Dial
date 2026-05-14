# GlobalClick2Dial – Chrome Extension

**Source:** [github.com/hoivikaj/GlobalClick2Dial](https://github.com/hoivikaj/GlobalClick2Dial)

Turns phone numbers on any webpage into clickable links. You choose the link type in the extension settings.

**Privacy:** The extension reads page text only inside your browser to find US and toll-free (+1) numbers. It does not send page content or phone numbers to any external server.

**Chrome Web Store (privacy blurb you can paste):** This extension processes page text locally in your browser to detect US and NANP toll-free phone numbers and turn them into dial links. No page content or phone numbers are transmitted to the developer or third-party servers.

## Features

- **Detects** US numbers and NANP toll-free (+1) in common formats (e.g. `(201) 555-0123`, `800-234-5678`, `+1 201 555 0123`). Other regions (e.g. UK, Canada +1 geographic) are not linked.
- **Normalizes** matches to E.164 (e.g. `+12015550123`) using [libphonenumber-js](https://www.npmjs.com/package/libphonenumber-js).
- **Converts** them to clickable links using one of:
  - **tel:** – standard telephone links
  - **callto:** – Callto / Skype-style
  - **zoomphonecall://** – Zoom Phone
  - **Custom prefix** – e.g. `myapp://call/`

## Settings (Options)

1. Open the extension popup and click **Open settings**, or right‑click the icon → Options.
2. **Link protocol** – Choose `tel`, `callto`, `zoomphonecall`, or Custom. For Custom, enter the prefix (e.g. `myapp://call/`).
3. **Domain filter** – Blacklist or whitelist sites where the extension runs.

Settings are stored in Chrome sync (if enabled).

## Development

Bundles are generated into the gitignored `dist/` folder by esbuild. `npm ci` runs the build automatically via the `postinstall` script.

```bash
npm ci        # installs deps and builds dist/phone-utils.js + dist/content.js
npm run build # rebuild after editing files in src/
npm test      # vitest
```

`manifest.json` loads the extension code from `dist/`, so the folder must exist before Chrome can load the unpacked extension.

## Install (developer mode)

1. Run `npm ci` so `dist/phone-utils.js` and `dist/content.js` are produced.
2. Open `chrome://extensions/`.
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select this folder.

When you change anything under `src/`, re-run `npm run build` (or `npm run dev` for watch mode) and click **Reload** in `chrome://extensions/`.

## Files

| File | Purpose |
|------|--------|
| `manifest.json` | Extension manifest (Manifest V3) |
| `options.html` / `options.js` / `options.css` | Settings UI |
| `popup.html` / `popup.js` | Toolbar popup (per-site toggle and settings link) |
| `background.js` | Service worker: badge updates, storage migration |
| `content.css` | Styles for generated dial links |
| `src/phone-utils.mjs` | Phone detection source (libphonenumber-js + US/toll-free filter) |
| `src/content-app.mjs` | Content script source |
| `src/content-helpers.mjs` | Shared URL/domain/href helpers (unit-tested) |
| `scripts/build.mjs` | esbuild script that produces `dist/` |
| `dist/phone-utils.js` | Built bundle (gitignored; loaded by the extension) |
| `dist/content.js` | Built bundle (gitignored; loaded by the extension) |

## License

MIT
