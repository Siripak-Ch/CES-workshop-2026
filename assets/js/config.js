/**
 * Public frontend configuration.
 *
 * 1) Deploy backend-appscript as a Web App.
 * 2) Paste the /exec URL below.
 * 3) Keep channel identical to backend Config.gs.
 */
window.CES_APP_CONFIG = Object.freeze({
  backendUrl: 'https://script.google.com/macros/s/AKfycby9OLRUG2SoRYdTW35fzhxH4_lqcuM60KGdClqrqkAQ66cFu3I7swUD1PchhkB8GRjbyg/execs',
  channel: 'CES_BOARDING_PASS_V1',
  connectTimeoutMs: 15000,
  requestTimeoutMs: 60000
});
