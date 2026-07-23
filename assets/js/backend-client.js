(function (global) {
  'use strict';

  class AppsScriptBridgeClient {
    constructor(config) {
      this.config = this.validateConfig_(config);
      this.iframe = null;
      this.pending = new Map();
      this.connectPromise = null;
      this.readyResolve = null;
      this.readyReject = null;
      this.connectTimer = null;
      this.onMessage_ = this.onMessage_.bind(this);
    }

    validateConfig_(config) {
      if (!config || typeof config !== 'object') {
        throw new Error('ไม่พบ CES_APP_CONFIG');
      }

      const backendUrl = String(config.backendUrl || '').trim();
      if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec(?:\?.*)?$/.test(backendUrl)) {
        throw new Error('กรุณาใส่ Apps Script Web App /exec URL ที่ถูกต้องใน assets/js/config.js');
      }

      return {
        backendUrl,
        channel: String(config.channel || 'CES_BOARDING_PASS_V1'),
        connectTimeoutMs: Number(config.connectTimeoutMs || 15000),
        requestTimeoutMs: Number(config.requestTimeoutMs || 60000)
      };
    }

    connect() {
      if (this.connectPromise) return this.connectPromise;

      this.connectPromise = new Promise((resolve, reject) => {
        this.readyResolve = resolve;
        this.readyReject = reject;

        window.addEventListener('message', this.onMessage_);

        this.iframe = document.createElement('iframe');
        this.iframe.title = 'CES Apps Script bridge';
        this.iframe.setAttribute('aria-hidden', 'true');
        this.iframe.tabIndex = -1;
        this.iframe.style.position = 'fixed';
        this.iframe.style.width = '1px';
        this.iframe.style.height = '1px';
        this.iframe.style.opacity = '0';
        this.iframe.style.pointerEvents = 'none';
        this.iframe.style.border = '0';
        this.iframe.style.left = '-10000px';
        this.iframe.src = this.buildBridgeUrl_();

        this.iframe.addEventListener('error', () => {
          this.rejectConnection_(new Error('โหลด Apps Script bridge ไม่สำเร็จ'));
        });

        this.connectTimer = window.setTimeout(() => {
          this.rejectConnection_(new Error('เชื่อมต่อ Backend หมดเวลา กรุณาตรวจสอบ deployment และ allowedOrigins'));
        }, this.config.connectTimeoutMs);

        document.body.appendChild(this.iframe);
      });

      return this.connectPromise;
    }

    buildBridgeUrl_() {
      const url = new URL(this.config.backendUrl);
      url.searchParams.set('view', 'bridge');
      url.searchParams.set('_v', String(Date.now()));
      return url.toString();
    }

    getAppData() {
      return this.request_('getAppData');
    }

    submitCheckIn(payload) {
      return this.request_('submitCheckIn', payload);
    }

    saveBoardingPassJpeg(payload) {
      return this.request_('saveBoardingPassJpeg', payload);
    }

    async request_(action, payload) {
      await this.connect();

      const requestId = this.makeRequestId_();
      return new Promise((resolve, reject) => {
        const timer = window.setTimeout(() => {
          this.pending.delete(requestId);
          reject(new Error('Backend ตอบกลับช้าเกินกำหนด กรุณาลองใหม่'));
        }, this.config.requestTimeoutMs);

        this.pending.set(requestId, { resolve, reject, timer });

        this.iframe.contentWindow.postMessage({
          channel: this.config.channel,
          type: 'CES_BRIDGE_REQUEST',
          requestId,
          action,
          payload: payload || null
        }, '*');
      });
    }

    onMessage_(event) {
      if (!this.iframe || event.source !== this.iframe.contentWindow) return;

      const message = event.data || {};
      if (message.channel !== this.config.channel) return;

      if (message.type === 'CES_BRIDGE_READY') {
        if (this.connectTimer) window.clearTimeout(this.connectTimer);
        this.connectTimer = null;
        if (this.readyResolve) this.readyResolve(true);
        this.readyResolve = null;
        this.readyReject = null;
        return;
      }

      if (message.type !== 'CES_BRIDGE_RESPONSE' || !message.requestId) return;
      const pending = this.pending.get(message.requestId);
      if (!pending) return;

      window.clearTimeout(pending.timer);
      this.pending.delete(message.requestId);

      if (message.ok) {
        pending.resolve(message.result);
      } else {
        const errorMessage = message.error && message.error.message
          ? message.error.message
          : 'Backend error';
        pending.reject(new Error(errorMessage.replace(/^Exception:\s*/, '')));
      }
    }

    rejectConnection_(error) {
      if (this.connectTimer) window.clearTimeout(this.connectTimer);
      this.connectTimer = null;
      if (this.readyReject) this.readyReject(error);
      this.readyResolve = null;
      this.readyReject = null;
    }

    makeRequestId_() {
      if (global.crypto && typeof global.crypto.randomUUID === 'function') {
        return global.crypto.randomUUID();
      }
      return 'req-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    }
  }

  global.AppsScriptBridgeClient = AppsScriptBridgeClient;
})(window);
