(function (global) {
  'use strict';

  class AppsScriptFormClient {
    constructor(config) {
      this.config = this.validateConfig_(config);
    }

    validateConfig_(config) {
      if (!config || typeof config !== 'object') throw new Error('ไม่พบ CES_APP_CONFIG');
      const backendUrl = String(config.backendUrl || '').trim();
      if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(backendUrl)) {
        throw new Error('Apps Script Web App URL ไม่ถูกต้อง');
      }
      return {
        backendUrl,
        channel: String(config.channel || 'CES_BOARDING_PASS_FORM_V2'),
        requestTimeoutMs: Number(config.requestTimeoutMs || 120000)
      };
    }

    submitCheckIn(payload) {
      return this.request_('submitCheckIn', payload);
    }

    request_(action, payload) {
      const requestId = this.makeRequestId_();
      const frameName = 'ces-response-' + requestId.replace(/[^A-Za-z0-9_-]/g, '');
      const iframe = document.createElement('iframe');
      iframe.name = frameName;
      iframe.title = 'CES backend response';
      iframe.setAttribute('aria-hidden', 'true');
      iframe.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;border:0;left:-10000px;top:-10000px';

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = this.config.backendUrl;
      form.target = frameName;
      form.acceptCharset = 'UTF-8';
      form.style.display = 'none';

      const values = {
        action,
        requestId,
        channel: this.config.channel,
        clientOrigin: global.location.origin,
        payload: JSON.stringify(payload || {})
      };

      Object.keys(values).forEach((name) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = values[name];
        form.appendChild(input);
      });

      return new Promise((resolve, reject) => {
        let timer = null;
        let settled = false;

        const cleanup = () => {
          global.removeEventListener('message', onMessage);
          if (timer) global.clearTimeout(timer);
          form.remove();
          global.setTimeout(() => iframe.remove(), 50);
        };

        const finish = (callback, value) => {
          if (settled) return;
          settled = true;
          cleanup();
          callback(value);
        };

        const onMessage = (event) => {
          if (event.source !== iframe.contentWindow) return;
          const host = (() => {
            try { return new URL(event.origin).hostname; } catch (error) { return ''; }
          })();
          if (!(host === 'script.google.com' || host.endsWith('.googleusercontent.com'))) return;

          const message = event.data || {};
          if (message.channel !== this.config.channel) return;
          if (message.type !== 'CES_FORM_RESPONSE' || message.requestId !== requestId) return;

          if (message.ok) {
            finish(resolve, message.result);
          } else {
            const text = message.error && message.error.message
              ? String(message.error.message)
              : 'Backend ไม่สามารถบันทึกข้อมูลได้';
            finish(reject, new Error(text.replace(/^Exception:\s*/, '')));
          }
        };

        global.addEventListener('message', onMessage);
        timer = global.setTimeout(() => {
          finish(reject, new Error('ระบบบันทึกข้อมูลตอบกลับช้าเกินกำหนด กรุณาตรวจสอบ Apps Script deployment'));
        }, this.config.requestTimeoutMs);

        document.body.appendChild(iframe);
        document.body.appendChild(form);
        form.submit();
      });
    }

    makeRequestId_() {
      if (global.crypto && typeof global.crypto.randomUUID === 'function') {
        return global.crypto.randomUUID();
      }
      return 'req-' + Date.now() + '-' + Math.random().toString(36).slice(2, 12);
    }
  }

  global.AppsScriptFormClient = AppsScriptFormClient;
})(window);
