/**
 * Public frontend configuration.
 *
 * 1) Deploy backend-appscript as a Web App.
 * 2) Paste the /exec URL below.
 * 3) Keep channel identical to backend Config.gs.
 */
window.CES_APP_CONFIG = Object.freeze({
  backendUrl: 'https://script.google.com/macros/s/AKfycbzJq-J7OlwTRRa_H7-DjP_FDOJoqerBtjigbio6fCSlDjN6aRno4FTVrmr_bbExnEcO2g/exec',
  channel: 'CES_BOARDING_PASS_V1',
  connectTimeoutMs: 15000,
  requestTimeoutMs: 60000
});
