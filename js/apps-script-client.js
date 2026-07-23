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
        channel: String(config.channel || 'CES_BOARDING_PASS_FORM_V4'),
        requestTimeoutMs: Math.max(30000, Number(config.requestTimeoutMs || 120000)),
        pollIntervalMs: Math.max(600, Number(config.pollIntervalMs || 900))
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
        let settled = false;
        let timeoutTimer = null;
        let pollTimer = null;
        const activeScripts = new Set();

        const cleanup = () => {
          global.removeEventListener('message', onMessage);
          if (timeoutTimer) global.clearTimeout(timeoutTimer);
          if (pollTimer) global.clearTimeout(pollTimer);
          activeScripts.forEach((script) => script.remove());
          activeScripts.clear();
          form.remove();
          global.setTimeout(() => iframe.remove(), 100);
        };

        const finish = (callback, value) => {
          if (settled) return;
          settled = true;
          cleanup();
          callback(value);
        };

        const handleStatus = (status) => {
          if (!status || status.requestId !== requestId) return;
          const state = String(status.state || '').toUpperCase();
          if (state === 'SUCCESS') {
            finish(resolve, status.result || {});
          } else if (state === 'ERROR') {
            finish(reject, new Error(String(status.message || 'Backend ไม่สามารถบันทึกข้อมูลได้')));
          }
        };

        const onMessage = (event) => {
          const host = (() => {
            try { return new URL(event.origin).hostname; } catch (error) { return ''; }
          })();
          if (!(host === 'script.google.com' || host.endsWith('.googleusercontent.com'))) return;
          const message = event.data || {};
          if (message.type !== 'CES_FORM_RESPONSE' || message.requestId !== requestId) return;
          if (message.channel && message.channel !== this.config.channel) return;
          if (message.ok) {
            finish(resolve, message.result || {});
          } else {
            const text = message.error && message.error.message
              ? String(message.error.message)
              : 'Backend ไม่สามารถบันทึกข้อมูลได้';
            finish(reject, new Error(text.replace(/^Exception:\s*/, '')));
          }
        };

        const poll = () => {
          if (settled) return;
          this.fetchStatusJsonp_(requestId, activeScripts)
            .then(handleStatus)
            .catch(() => {})
            .finally(() => {
              if (!settled) pollTimer = global.setTimeout(poll, this.config.pollIntervalMs);
            });
        };

        global.addEventListener('message', onMessage);
        timeoutTimer = global.setTimeout(() => {
          finish(reject, new Error('ยังไม่ได้รับการยืนยันว่าบันทึกลง Google Drive สำเร็จ กรุณาตรวจ Apps Script deployment และสิทธิ์โฟลเดอร์ Drive'));
        }, this.config.requestTimeoutMs);

        document.body.appendChild(iframe);
        document.body.appendChild(form);
        form.submit();
        pollTimer = global.setTimeout(poll, 450);
      });
    }

    fetchStatusJsonp_(requestId, activeScripts) {
      return new Promise((resolve, reject) => {
        const callbackName = '__cesStatus_' + requestId.replace(/[^A-Za-z0-9_]/g, '') + '_' + Date.now();
        const script = document.createElement('script');
        activeScripts.add(script);
        let done = false;

        const cleanup = () => {
          if (done) return;
          done = true;
          delete global[callbackName];
          activeScripts.delete(script);
          script.remove();
        };

        const timer = global.setTimeout(() => {
          cleanup();
          reject(new Error('status timeout'));
        }, 12000);

        global[callbackName] = (status) => {
          global.clearTimeout(timer);
          cleanup();
          resolve(status || {});
        };

        script.onerror = () => {
          global.clearTimeout(timer);
          cleanup();
          reject(new Error('status request failed'));
        };

        const params = new URLSearchParams({
          action: 'status',
          requestId,
          channel: this.config.channel,
          callback: callbackName,
          _: String(Date.now())
        });
        script.src = this.config.backendUrl + '?' + params.toString();
        document.head.appendChild(script);
      });
    }

    makeRequestId_() {
      if (global.crypto && typeof global.crypto.randomUUID === 'function') return global.crypto.randomUUID();
      return 'req-' + Date.now() + '-' + Math.random().toString(36).slice(2, 12);
    }
  }

  global.AppsScriptFormClient = AppsScriptFormClient;
})(window);
