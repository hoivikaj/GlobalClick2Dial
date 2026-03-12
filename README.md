# GlobalClick2Dial – Chrome Extension

**Source:** [github.com/hoivikaj/GlobalClick2Dial](https://github.com/hoivikaj/GlobalClick2Dial)

Turns phone numbers on any webpage into clickable links. You choose the link type and default country in the extension settings.

## Features

- **Detects** phone numbers in common formats (e.g. `(555) 123-4567`, `555-123-4567`, `+1 555 123 4567`).
- **Normalizes** numbers to E.164 (e.g. `+15551234567`) using a default country code when none is present.
- **Converts** them to clickable links using one of:
  - **tel:** – standard telephone links
  - **callto:** – Callto / Skype-style
  - **zoomphonecall://** – Zoom Phone
  - **Custom prefix** – e.g. `myapp://call/`

## Settings (Options)

1. Open the extension popup and click **Open settings**, or right‑click the icon → Options.
2. **Link protocol** – Choose `tel`, `callto`, `zoomphonecall`, or Custom. For Custom, enter the prefix (e.g. `myapp://call/`).
3. **Default country code** – Used when a number has no `+country` (e.g. `1` for US/Canada, `44` for UK). Numbers are normalized to E.164.

Settings are stored in Chrome sync (if enabled).

## Install (developer mode)

1. Open `chrome://extensions/`.
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select this folder.

## Optional: icons

To show your own icons, add PNGs under `icons/`:

- `icons/icon16.png` (16×16)
- `icons/icon48.png` (48×48)
- `icons/icon128.png` (128×128)

Then add to `manifest.json` under `"action"` and `"icons"`:

```json
"action": {
  "default_popup": "popup.html",
  "default_icon": { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" },
  "default_title": "GlobalClick2Dial settings"
},
"icons": {
  "16": "icons/icon16.png",
  "48": "icons/icon48.png",
  "128": "icons/icon128.png"
}
```

Without these, Chrome uses the default extension icon.

## Files

| File | Purpose |
|------|--------|
| `manifest.json` | Extension manifest (Manifest V3) |
| `options.html` / `options.js` / `options.css` | Settings UI |
| `popup.html` / `popup.js` | Toolbar popup (link to settings) |
| `content.js` | In-page script: finds numbers and wraps in links |
| `content.css` | Styles for the generated links |
| `lib/phone-utils.js` | Phone regex + E.164 normalization |

## License

MIT
