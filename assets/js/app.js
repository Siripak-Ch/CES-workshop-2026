(function () {
  'use strict';

  const config = window.CES_APP_CONFIG;
  const state = {
    step: 1,
    totalSteps: 3,
    role: '',
    photoData: '',
    boardingPassData: '',
    latestResult: null,
    lastPayload: null,
    selections: {
      morningDrink: '',
      morningSweetness: '50%',
      breakfastFood: '',
      afternoonDrink: '',
      afternoonSweetness: '50%'
    }
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const client = new AppsScriptFormClient(config);
  const stepNames = ['เลือกกลุ่ม', 'ข้อมูลผู้เดินทาง', 'เมนูและยืนยัน'];

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    populateSelect($('#morningSweetness'), config.menus.sweetnessLevels, 'เลือกความหวาน');
    populateSelect($('#afternoonSweetness'), config.menus.sweetnessLevels, 'เลือกความหวาน');
    $('#morningSweetness').value = state.selections.morningSweetness;
    $('#afternoonSweetness').value = state.selections.afternoonSweetness;

    renderOptionGrid('morningDrinkGrid', config.menus.morningDrinks, 'morningDrink', 'drink');
    renderOptionGrid('foodGrid', config.menus.breakfastFoods, 'breakfastFood', 'food');
    renderOptionGrid('afternoonDrinkGrid', config.menus.afternoonDrinks, 'afternoonDrink', 'drink');

    $$('[data-role]').forEach((button) => button.addEventListener('click', () => selectRole(button.dataset.role)));
    $('#nextBtn').addEventListener('click', nextStep);
    $('#backBtn').addEventListener('click', previousStep);
    $('#submitBtn').addEventListener('click', submitForm);
    $('#cameraInput').addEventListener('change', handlePhoto);
    $('#albumInput').addEventListener('change', handlePhoto);
    $('#downloadJpeg').addEventListener('click', downloadBoardingPass);
    $('#printPass').addEventListener('click', () => window.print());
    $('#editAgain').addEventListener('click', editAgain);
    $('#retrySave').addEventListener('click', retrySave);
    $('#morningSweetness').addEventListener('change', () => { state.selections.morningSweetness = $('#morningSweetness').value; refreshReview(); });
    $('#afternoonSweetness').addEventListener('change', () => { state.selections.afternoonSweetness = $('#afternoonSweetness').value; refreshReview(); });
    $('#employeeId').addEventListener('input', refreshReview);
    $('#nickname').addEventListener('input', refreshReview);

    goToStep(1);
    refreshReview();
  }

  function populateSelect(select, items, placeholder) {
    select.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>` +
      items.map((item) => `<option value="${escapeAttr(item)}">${escapeHtml(item)}</option>`).join('');
  }

  function renderOptionGrid(containerId, items, stateKey, type) {
    const container = $('#' + containerId);
    container.innerHTML = items.map((item, index) => {
      const name = typeof item === 'string' ? item : item.name;
      const sub = typeof item === 'string' ? '' : (item.sub || '');
      const image = typeof item === 'object' ? item.image : '';
      const badge = typeof item === 'object' ? item.badge : '';
      const tone = typeof item === 'object' ? item.tone : '';
      const selected = state.selections[stateKey] === name;
      const thumbHtml = image
        ? `<div class="thumb"><img src="${escapeAttr(image)}" alt="${escapeAttr(name)}"></div>`
        : `<div class="thumb fallback" style="background:${escapeAttr(getThumbBackground(tone, type))}">${escapeHtml(badge || getFallbackMark(type))}<br><span style="font-size:11px;font-weight:700;line-height:1.2;display:block;margin-top:4px">${escapeHtml(type === 'food' ? 'MENU' : 'DRINK')}</span></div>`;
      return `
        <button type="button" class="option-card ${selected ? 'selected' : ''}" data-select="${escapeAttr(stateKey)}" data-value="${escapeAttr(name)}" data-index="${index}">
          ${thumbHtml}
          <div class="name">${escapeHtml(name)}</div>
          ${sub ? `<div class="sub">${escapeHtml(sub)}</div>` : ''}
        </button>`;
    }).join('');

    container.querySelectorAll('[data-select]').forEach((button) => {
      button.addEventListener('click', () => {
        state.selections[stateKey] = button.dataset.value;
        renderOptionGrid(containerId, items, stateKey, type);
        refreshReview();
      });
    });
  }

  function getFallbackMark(type) {
    return type === 'food' ? '🍽️' : '☕';
  }

  function getThumbBackground(tone, type) {
    if (type === 'drink') return 'linear-gradient(135deg,#0b2e59,#28598a)';
    const map = {
      gold: 'linear-gradient(135deg,#cfad61,#f1d79f)',
      navy: 'linear-gradient(135deg,#0b2e59,#28598a)',
      sage: 'linear-gradient(135deg,#7d9468,#b9c69a)',
      rose: 'linear-gradient(135deg,#ad6d75,#dbb3b9)',
      olive: 'linear-gradient(135deg,#6f7f4c,#b2bf84)'
    };
    return map[tone] || 'linear-gradient(135deg,#6f7f4c,#b2bf84)';
  }

  function selectRole(role) {
    state.role = role;
    $$('[data-role]').forEach((button) => button.classList.toggle('selected', button.dataset.role === role));
    $('#amMenu').hidden = role !== 'AM_MNG';
    $('#staffMenu').hidden = role !== 'SUP_STAFF';
    $('#menuLead').textContent = role === 'AM_MNG'
      ? 'เลือกเครื่องดื่มช่วงเช้า ระดับความหวาน และเมนูอาหารจาก Fave'
      : 'เลือกเครื่องดื่มช่วงบ่ายและระดับความหวาน';
    refreshReview();
  }

  async function handlePhoto(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('รองรับ JPG, PNG หรือ WebP เท่านั้น', true);
      event.target.value = '';
      return;
    }
    try {
      state.photoData = await compressImage(file, 560, 0.68);
      $('#photoPreview').src = state.photoData;
    } catch (error) {
      state.photoData = '';
      showToast('อ่านรูปไม่สำเร็จ กรุณาเลือกรูปใหม่', true);
    }
  }

  function compressImage(file, maxDimension, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const image = new Image();
        image.onerror = reject;
        image.onload = () => {
          const ratio = Math.min(1, maxDimension / Math.max(image.width, image.height));
          const width = Math.max(1, Math.round(image.width * ratio));
          const height = Math.max(1, Math.round(image.height * ratio));
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d', { alpha: false });
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(image, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function nextStep() {
    if (!validateStep(state.step)) return;
    if (state.step < state.totalSteps) goToStep(state.step + 1);
  }

  function previousStep() {
    if (state.step > 1) goToStep(state.step - 1);
  }

  function goToStep(step) {
    state.step = step;
    $$('.step').forEach((panel) => panel.classList.toggle('active', Number(panel.dataset.step) === step));
    $('#progressLabel').textContent = `${step}. ${stepNames[step - 1]}`;
    $('#progressCount').textContent = `${step}/${state.totalSteps}`;
    $('#progressBar').style.width = `${(step / state.totalSteps) * 100}%`;
    $('#backBtn').hidden = step === 1;
    $('#nextBtn').hidden = step === state.totalSteps;
    $('#submitBtn').hidden = step !== state.totalSteps;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    refreshReview();
  }

  function validateStep(step) {
    if (step === 1 && !state.role) return fail('กรุณาเลือก AM / MNG หรือ SUP / STAFF');
    if (step === 2) {
      const employeeId = $('#employeeId').value.trim();
      if (!/^[A-Za-z0-9._-]{2,20}$/.test(employeeId)) return fail('กรุณากรอกรหัสพนักงานให้ถูกต้อง');
      if (!$('#nickname').value.trim()) return fail('กรุณากรอกชื่อเล่น');
      if (!state.photoData) return fail('กรุณาถ่ายรูปหรือเลือกรูป');
    }
    if (step === 3) {
      if (state.role === 'AM_MNG' && !state.selections.morningDrink) return fail('กรุณาเลือกเครื่องดื่มช่วงเช้า');
      if (state.role === 'AM_MNG' && !state.selections.morningSweetness) return fail('กรุณาเลือกระดับความหวาน');
      if (state.role === 'AM_MNG' && !state.selections.breakfastFood) return fail('กรุณาเลือกเมนูอาหาร');
      if (state.role === 'SUP_STAFF' && !state.selections.afternoonDrink) return fail('กรุณาเลือกเครื่องดื่มช่วงบ่าย');
      if (state.role === 'SUP_STAFF' && !state.selections.afternoonSweetness) return fail('กรุณาเลือกระดับความหวาน');
    }
    return true;
  }

  function refreshReview() {
    renderAgenda();
    renderLocations();
    renderSummary();
  }

  function renderAgenda() {
    const agenda = config.agenda[state.role] || [];
    $('#agenda').innerHTML = agenda.map(([time, title]) => `
      <div class="agenda-row"><div class="agenda-time">${escapeHtml(time)}</div><div class="agenda-title">${escapeHtml(title)}</div></div>
    `).join('');
  }

  function renderLocations() {
    const locations = [config.event.morningLocation];
    if (state.role === 'AM_MNG' || config.event.showDinnerForStaff) locations.push(config.event.dinnerLocation);
    $('#locations').innerHTML = locations.map((location) => `
      <article class="location-card">
        <img src="${escapeAttr(location.image)}" alt="${escapeAttr(location.name)}">
        <div class="location-body">
          <div class="tag">${escapeHtml(location.label)}</div>
          <h3>${escapeHtml(location.name)}</h3>
          <p>เวลา ${escapeHtml(location.time)}</p>
          <p>${escapeHtml(location.address)}</p>
          <a class="map-link" href="${escapeAttr(location.mapUrl)}" target="_blank" rel="noopener">เปิด Google Maps ↗</a>
        </div>
      </article>
    `).join('');
  }

  function renderSummary() {
    const items = [
      ['กลุ่ม', state.role === 'AM_MNG' ? 'AM / MNG' : state.role === 'SUP_STAFF' ? 'SUP / STAFF' : '-'],
      ['รหัสพนักงาน', $('#employeeId').value.trim().toUpperCase() || '-'],
      ['ชื่อเล่น', $('#nickname').value.trim() || '-']
    ];
    if (state.role === 'AM_MNG') {
      items.push(
        ['เครื่องดื่ม', state.selections.morningDrink || '-'],
        ['ความหวาน', state.selections.morningSweetness || '-'],
        ['อาหาร', state.selections.breakfastFood || '-']
      );
    } else if (state.role === 'SUP_STAFF') {
      items.push(
        ['เครื่องดื่ม', state.selections.afternoonDrink || '-'],
        ['ความหวาน', state.selections.afternoonSweetness || '-']
      );
    }
    $('#summary').innerHTML = items.map(([label, value]) => `
      <div class="summary-item"><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></div>
    `).join('');
  }

  async function submitForm() {
    if (!validateStep(3)) return;

    const button = $('#submitBtn');
    button.disabled = true;
    showSaving('กำลังสร้าง Boarding Pass…');

    const employeeId = $('#employeeId').value.trim().toUpperCase();
    const nickname = $('#nickname').value.trim();
    const ticketId = createTicketId(state.role, employeeId);
    const draft = buildBoardingResult(ticketId, employeeId, nickname);

    try {
      state.boardingPassData = await createBoardingPassJpeg(draft, state.photoData, config);
      state.lastPayload = buildSubmitPayload(draft);
      $('#savingText').textContent = 'กำลังบันทึกข้อมูลและ JPEG ลง Google Drive…';

      const result = await client.submitCheckIn(state.lastPayload);
      state.latestResult = Object.assign({}, draft, result);
      hideSaving();
      showResult(state.latestResult, true);
    } catch (error) {
      hideSaving();
      if (state.boardingPassData) {
        state.latestResult = draft;
        showResult(draft, false, error && error.message ? error.message : 'บันทึก Google Drive ไม่สำเร็จ');
      } else {
        handleError(error);
      }
    } finally {
      button.disabled = false;
    }
  }

  function buildSubmitPayload(draft) {
    return {
      role: state.role,
      employeeId: draft.employeeId,
      nickname: draft.nickname,
      ticketId: draft.ticketId,
      photoData: state.photoData,
      boardingPassData: state.boardingPassData,
      consent: true,
      agendaRead: true,
      morningDrink: state.role === 'AM_MNG' ? state.selections.morningDrink : '',
      morningSweetness: state.role === 'AM_MNG' ? state.selections.morningSweetness : '',
      breakfastFood: state.role === 'AM_MNG' ? state.selections.breakfastFood : '',
      afternoonDrink: state.role === 'SUP_STAFF' ? state.selections.afternoonDrink : '',
      afternoonSweetness: state.role === 'SUP_STAFF' ? state.selections.afternoonSweetness : ''
    };
  }

  async function retrySave() {
    if (!state.lastPayload || !state.boardingPassData) return fail('ไม่พบข้อมูลสำหรับบันทึกซ้ำ');
    const button = $('#retrySave');
    button.disabled = true;
    showSaving('กำลังลองบันทึกลง Google Drive อีกครั้ง…');
    try {
      const result = await client.submitCheckIn(state.lastPayload);
      state.latestResult = Object.assign({}, state.latestResult || {}, result);
      hideSaving();
      showResult(state.latestResult, true);
    } catch (error) {
      hideSaving();
      showResult(state.latestResult || {}, false, error && error.message ? error.message : 'บันทึก Google Drive ไม่สำเร็จ');
    } finally {
      button.disabled = false;
    }
  }

  function buildBoardingResult(ticketId, employeeId, nickname) {
    return {
      ticketId,
      employeeId,
      nickname,
      role: state.role,
      roleLabel: state.role === 'AM_MNG' ? 'AM / MNG' : 'SUP / STAFF',
      departure: state.role === 'AM_MNG' ? '09:30' : '13:00',
      arrival: '17:00',
      gate: state.role === 'AM_MNG' ? 'LEAD' : 'TEAM',
      eventDate: config.event.dateDisplay,
      eventDateThai: config.event.dateThai,
      route: 'FAVE CASUAL DINING AND WORKING SPACE → WAKE UP - CAFE AND RESTAURANT',
      selections: {
        morningDrink: state.role === 'AM_MNG' ? state.selections.morningDrink : '',
        morningSweetness: state.role === 'AM_MNG' ? state.selections.morningSweetness : '',
        breakfastFood: state.role === 'AM_MNG' ? state.selections.breakfastFood : '',
        afternoonDrink: state.role === 'SUP_STAFF' ? state.selections.afternoonDrink : '',
        afternoonSweetness: state.role === 'SUP_STAFF' ? state.selections.afternoonSweetness : ''
      }
    };
  }

  function showResult(result, confirmed, errorMessage) {
    $('#boardingPassImage').src = state.boardingPassData;
    $('#appCard').hidden = true;
    $('.progress-card').hidden = true;
    $('#bottomActions').hidden = true;
    $('#resultCard').hidden = false;

    const retryButton = $('#retrySave');
    if (confirmed) {
      $('#driveFileLink').href = result.boardingPassFileUrl || config.driveFolderUrl;
      $('#driveFileLink').textContent = result.boardingPassFileUrl ? 'เปิดไฟล์ใน Drive' : 'เปิดโฟลเดอร์ Drive';
      $('#resultMessage').textContent = result.updatedExisting
        ? `อัปเดตข้อมูลของ ${result.nickname} และบันทึก JPEG ลง Google Drive สำเร็จแล้ว`
        : `Check-in สำเร็จสำหรับ ${result.nickname} • บันทึก JPEG ลง Google Drive แล้ว`;
      retryButton.hidden = true;
      showToast('Check-in และบันทึก Google Drive สำเร็จแล้ว');
    } else {
      $('#driveFileLink').href = config.driveFolderUrl;
      $('#driveFileLink').textContent = 'เปิดโฟลเดอร์ Drive';
      $('#resultMessage').textContent = `สร้าง Boarding Pass แล้ว แต่ยังบันทึกลง Google Drive ไม่สำเร็จ: ${errorMessage || 'ไม่ทราบสาเหตุ'}`;
      retryButton.hidden = false;
      showToast(errorMessage || 'บันทึก Google Drive ไม่สำเร็จ', true);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function editAgain() {
    $('#resultCard').hidden = true;
    $('#appCard').hidden = false;
    $('.progress-card').hidden = false;
    $('#bottomActions').hidden = false;
    goToStep(3);
  }

  function showSaving(text) {
    $('#savingText').textContent = text;
    $('#savingOverlay').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function hideSaving() {
    $('#savingOverlay').hidden = true;
    document.body.style.overflow = '';
  }

  function downloadBoardingPass() {
    if (!state.boardingPassData || !state.latestResult) return fail('ยังไม่มี Boarding Pass');
    const a = document.createElement('a');
    a.href = state.boardingPassData;
    a.download = sanitizeDownloadName(`BoardingPass_${state.latestResult.ticketId}_${state.latestResult.nickname}.jpg`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function createTicketId(role, employeeId) {
    const prefix = role === 'AM_MNG' ? 'LDR' : 'TEAM';
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = new Uint8Array(8);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
    let code = '';
    for (let i = 0; i < bytes.length; i += 1) {
      const value = window.crypto && window.crypto.getRandomValues ? bytes[i] : Math.floor(Math.random() * 256);
      code += chars[value % chars.length];
    }
    return `CES26-${prefix}-${employeeId}-${code}`;
  }


  async function createBoardingPassJpeg(result, photoData, appConfig) {
    if (!window.BoardingPassGenerator || typeof window.BoardingPassGenerator.generate !== 'function') {
      throw new Error('ไม่พบ Boarding Pass Generator');
    }
    return window.BoardingPassGenerator.generate({ result, photoData, config: appConfig });
  }

  function sanitizeDownloadName(value) {
    return String(value).replace(/[\\/:*?"<>|#%{}~&]/g, '-').replace(/\s+/g, '-').slice(0, 160);
  }

  function handleError(error) {
    const message = error && error.message ? error.message : String(error || 'เกิดข้อผิดพลาด');
    showToast(message.replace(/^Exception:\s*/, ''), true);
  }

  function fail(message) {
    showToast(message, true);
    return false;
  }

  let toastTimer;
  function showToast(message, isError) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.toggle('error', Boolean(isError));
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3800);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[ch]);
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }
})();
