# Xeon WhatsApp Bot

Pure WhatsApp version of the Xeon/VOIDSEC control style.
Pair-code login • Ubuntu Chrome • crash payloads via chat commands.

## Install

```bash
npm install
```

## Config (`config.js`)

```js
PAIRING_NUMBER: "15551234567"   // YOUR number for the pairing code
USE_PAIRING_CODE: true
BROWSER: ["Ubuntu", "Chrome", "20.0.04"]
DEFAULT_TARGET: ""              // optional default target
OWNERS: []                      // empty = anyone can command; or list JIDs
PREFIX: "."
```

## Run

```bash
node index.js
```

Enter the 8-digit code:
WhatsApp → Settings → Linked Devices → Link a Device → Link with phone number

Bot appears as **Ubuntu Chrome**.

## Commands (from any chat with the linked number)

| Command | Action |
|---------|--------|
| `.menu` | show commands |
| `.ping` | pong |
| `.target 1555...` | set default target |
| `.crashfinity [number]` | requestPayment freeze |
| `.crashjam [number]` | spam/jam payload |
| `.stickercrash [number]` | malformed sticker |
| `.gcfreeze 120363...@g.us` | group list freeze |

If you set `.target`, you can omit the number on payload commands.

## Files

| File | Role |
|------|------|
| index.js | auth + command router |
| config.js | settings |
| payloads/crashfinity.js | payment crash |
| payloads/crashjam.js | jam |
| payloads/stickerCrash.js | sticker crash |
| payloads/groupFreeze.js | group freeze |
| auth_xeon/ | session |

Delete `auth_xeon/` for a fresh pair.
