module.exports = {
  // Your number for pairing code (country code + digits, no +)
  PAIRING_NUMBER: "12345678",

  // Force pair-code login
  USE_PAIRING_CODE: true,

  // Browser shown in Linked Devices
  BROWSER: ["Ubuntu", "Chrome", "20.0.04"],

  // Optional default target (country code + number)
  // Leave empty to control everything via chat commands
  DEFAULT_TARGET: "",

  // Owner JIDs allowed to use admin/crash commands (empty = anyone who messages the linked number)
  // Example: ["15551234567@s.whatsapp.net"]
  OWNERS: [],

  // Session folder
  SESSION_DIR: "./auth_xeon",

  // Command prefix
  PREFIX: ".",

  LOG_LEVEL: "info"
};
