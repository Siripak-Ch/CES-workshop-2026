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
      state.photoData = await compressImage(file, 640, 0.72);
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
      // Generate locally first, so the user always sees the Boarding Pass immediately.
      state.boardingPassData = await createBoardingPassJpeg(draft, state.photoData, config);
      state.latestResult = Object.assign({}, draft, {
        boardingPassFileUrl: config.driveFolderUrl,
        optimistic: true,
        updatedExisting: false
      });
      hideSaving();
      showResult(state.latestResult, true);

      const result = await client.submitCheckIn({
        role: state.role,
        employeeId,
        nickname,
        ticketId,
        photoData: state.photoData,
        boardingPassData: state.boardingPassData,
        consent: true,
        agendaRead: true,
        morningDrink: state.role === 'AM_MNG' ? state.selections.morningDrink : '',
        morningSweetness: state.role === 'AM_MNG' ? state.selections.morningSweetness : '',
        breakfastFood: state.role === 'AM_MNG' ? state.selections.breakfastFood : '',
        afternoonDrink: state.role === 'SUP_STAFF' ? state.selections.afternoonDrink : '',
        afternoonSweetness: state.role === 'SUP_STAFF' ? state.selections.afternoonSweetness : ''
      });

      state.latestResult = Object.assign({}, draft, result);
      showResult(state.latestResult, false);
    } catch (error) {
      // Keep the local JPEG available even if Drive response is delayed.
      hideSaving();
      if (state.boardingPassData) {
        $('#resultMessage').textContent = 'สร้าง Boarding Pass แล้ว แต่ยังไม่ได้รับการยืนยันจาก Google Drive กรุณาดาวน์โหลด JPEG ไว้ก่อน แล้วตรวจสอบ Deployment ของ Apps Script';
        $('#driveFileLink').href = config.driveFolderUrl;
        $('#driveFileLink').textContent = 'เปิดโฟลเดอร์ Drive';
        showToast(error && error.message ? error.message : 'การบันทึก Drive ตอบกลับช้า', true);
      } else {
        handleError(error);
      }
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

  function showResult(result, pending) {
    $('#boardingPassImage').src = state.boardingPassData;
    $('#driveFileLink').href = result.boardingPassFileUrl || config.driveFolderUrl;
    $('#driveFileLink').textContent = pending ? 'เปิดโฟลเดอร์ Drive' : 'เปิดไฟล์ใน Drive';
    if (pending) {
      $('#resultMessage').textContent = `สร้าง Boarding Pass สำหรับ ${result.nickname} แล้ว • กำลังบันทึก JPEG ลง Google Drive…`;
    } else {
      $('#resultMessage').textContent = result.optimistic
        ? `ส่งข้อมูลของ ${result.nickname} ไปยังระบบแล้ว • กรุณาตรวจไฟล์ในโฟลเดอร์ Drive`
        : result.updatedExisting
          ? `อัปเดตข้อมูลของ ${result.nickname} และสร้างไฟล์ใหม่เรียบร้อยแล้ว`
          : `Check-in สำเร็จสำหรับ ${result.nickname} • ${result.ticketId}`;
    }
    $('#appCard').hidden = true;
    $('.progress-card').hidden = true;
    $('#bottomActions').hidden = true;
    $('#resultCard').hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (!pending) showToast(result.optimistic ? 'ส่งข้อมูลเรียบร้อย กรุณาตรวจ Drive' : 'Check-in และบันทึก JPEG สำเร็จแล้ว');
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
    const exp = appConfig.export;
    const width = Number(exp.widthPx || 2480);
    const height = Number(exp.heightPx || 877);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false });

    const images = await Promise.all([
      loadImageWithTimeout(photoData, Number(appConfig.generationTimeoutMs || 12000)),
      loadImageWithTimeout(appConfig.boardingTemplateUrl, Number(appConfig.generationTimeoutMs || 12000)).catch(() => null)
    ]);
    const photo = images[0];
    const template = images[1];

    if (template) ctx.drawImage(template, 0, 0, width, height);
    else drawTemplateFallback(ctx, width, height);

    const navy = '#103560';
    const gold = '#CFA84C';
    const muted = '#647589';

    // Participant photo — crop only, never stretch.
    ctx.save();
    roundRect(ctx, 84, 280, 391, 370, 26);
    ctx.clip();
    drawCoverImage(ctx, photo, 84, 280, 391, 370);
    ctx.restore();

    // Keep employee ID numerals level and aligned with the template labels.
    drawEmployeeId(ctx, result.employeeId, 132, 749, 21, muted);

    ctx.fillStyle = navy;
    fitText(ctx, String(result.nickname || '').toUpperCase(), 590, 378, 1150, 72, 38, '900', 'Georgia, serif');
    drawEmployeeId(ctx, result.employeeId, 785, 435, 24, muted);

    drawDynamicValue(ctx, result.roleLabel, 616, 536, 235, 28, 17, navy);
    drawDynamicValue(ctx, result.eventDate, 926, 536, 235, 27, 16, navy);
    drawDynamicValue(ctx, result.departure, 1236, 536, 235, 28, 17, navy);
    drawDynamicValue(ctx, result.route, 616, 681, 540, 23, 11, navy);
    drawDynamicValue(ctx, result.arrival, 1236, 681, 235, 28, 17, navy);

    const drink = result.role === 'AM_MNG' ? result.selections.morningDrink : result.selections.afternoonDrink;
    const sweetness = result.role === 'AM_MNG' ? result.selections.morningSweetness : result.selections.afternoonSweetness;
    const food = result.role === 'AM_MNG' ? result.selections.breakfastFood : 'AFTERNOON BREAK';
    ctx.fillStyle = muted;
    fitText(ctx, `DRINK  ${drink} • SWEETNESS ${sweetness}`, 590, 804, 1160, 20, 13, '700', 'Tahoma, Arial, sans-serif');
    fitText(ctx, `FOOD  ${food}`, 590, 833, 1160, 20, 13, '700', 'Tahoma, Arial, sans-serif');

    ctx.fillStyle = gold;
    fitText(ctx, result.ticketId, 1900, 370, 455, 20, 13, '800', 'Tahoma, Arial, sans-serif');
    ctx.fillStyle = '#FFFFFF';
    fitText(ctx, result.nickname, 1900, 470, 455, 27, 17, '900', 'Tahoma, Arial, sans-serif');
    fitText(ctx, result.route, 1900, 585, 455, 21, 12, '800', 'Tahoma, Arial, sans-serif');
    drawBarcode(ctx, 1900, 650, 455, 100, result.ticketId);

    return setJpegDpiMetadata(canvas.toDataURL('image/jpeg', 0.86), Number(exp.dpi || 300));
  }

  function loadImageWithTimeout(src, timeoutMs) {
    return Promise.race([
      loadImage(src),
      new Promise((_, reject) => setTimeout(() => reject(new Error('โหลดรูปสำหรับ Boarding Pass นานเกินกำหนด')), timeoutMs))
    ]);
  }

  function drawEmployeeId(ctx, value, x, y, fontSize, color) {
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.direction = 'ltr';
    if ('fontKerning' in ctx) ctx.fontKerning = 'none';
    ctx.fillStyle = color;
    ctx.font = `700 ${fontSize}px Arial, Helvetica, sans-serif`;
    ctx.fillText(String(value || ''), Math.round(x), Math.round(y));
    ctx.restore();
  }

  function drawDynamicValue(ctx, text, x, y, maxWidth, initialSize, minSize, color) {
    ctx.fillStyle = color;
    fitText(ctx, text, x, y, maxWidth, initialSize, minSize, '900', 'Tahoma, Arial, sans-serif');
  }

  function drawTemplateFallback(ctx, width, height) {
    ctx.fillStyle = '#FFFDFD'; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#103560'; roundRect(ctx, 12, 12, width - 24, 193, 36); ctx.fill();
    ctx.fillStyle = '#CFA84C'; ctx.font = '800 27px Arial'; ctx.fillText('CES • LEADERSHIP TRANSFORMATION JOURNEY PASSPORT', 200, 75);
    ctx.fillStyle = '#FFFFFF'; ctx.font = '900 70px Georgia'; ctx.fillText('Journey Check-in', 200, 155);
    ctx.fillStyle = '#F7F3EB'; roundRect(ctx, 54, 250, 451, 540, 30); ctx.fill();
    ctx.strokeStyle = '#CFA84C'; ctx.lineWidth = 5; roundRect(ctx, 84, 280, 391, 370, 26); ctx.stroke();
  }

  function setJpegDpiMetadata(dataUrl, dpi) {
    try {
      const parts = dataUrl.split(',');
      const binary = atob(parts[1]);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      for (let i = 2; i < Math.min(bytes.length - 18, 128); i += 1) {
        const jfif = bytes[i] === 0xFF && bytes[i + 1] === 0xE0 && bytes[i + 4] === 0x4A && bytes[i + 5] === 0x46 && bytes[i + 6] === 0x49 && bytes[i + 7] === 0x46 && bytes[i + 8] === 0;
        if (!jfif) continue;
        const density = Math.max(1, Math.min(65535, Math.round(dpi)));
        bytes[i + 11] = 1;
        bytes[i + 12] = (density >> 8) & 0xFF;
        bytes[i + 13] = density & 0xFF;
        bytes[i + 14] = (density >> 8) & 0xFF;
        bytes[i + 15] = density & 0xFF;
        break;
      }
      let output = '';
      for (let i = 0; i < bytes.length; i += 0x8000) output += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      return `${parts[0]},${btoa(output)}`;
    } catch (error) {
      return dataUrl;
    }
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('โหลดรูปสำหรับ Boarding Pass ไม่สำเร็จ'));
      image.src = src;
    });
  }

  function drawCoverImage(ctx, image, x, y, width, height) {
    const ratio = Math.max(width / image.width, height / image.height);
    const dw = image.width * ratio;
    const dh = image.height * ratio;
    ctx.drawImage(image, x + (width - dw) / 2, y + (height - dh) / 2, dw, dh);
  }

  function roundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function drawMetaBlock(ctx, x, y, width, height, label, value, navy, muted, gold) {
    ctx.fillStyle = '#faf6ee';
    roundRect(ctx, x, y, width, height, 18);
    ctx.fill();
    ctx.fillStyle = gold;
    ctx.fillRect(x, y, 6, height);
    ctx.fillStyle = muted;
    ctx.font = '800 16px Tahoma, Arial, sans-serif';
    ctx.fillText(label, x + 24, y + 28);
    ctx.fillStyle = navy;
    fitText(ctx, value, x + 24, y + 67, width - 44, 26, 18, '900', 'Tahoma, Arial, sans-serif');
  }

  function drawStubLine(ctx, x, y, label, value, gold) {
    ctx.fillStyle = '#d0dae5';
    ctx.font = '700 18px Tahoma, Arial, sans-serif';
    ctx.fillText(label, x, y);
    ctx.fillStyle = '#ffffff';
    fitText(ctx, value, x, y + 34, 450, 26, 18, '900', 'Tahoma, Arial, sans-serif');
    ctx.strokeStyle = gold;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.moveTo(x, y + 48);
    ctx.lineTo(x + 450, y + 48);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawBarcode(ctx, x, y, width, height, seed) {
    ctx.fillStyle = '#fff';
    roundRect(ctx, x, y, width, height, 10);
    ctx.fill();
    let cursor = x + 18;
    const end = x + width - 18;
    const text = String(seed || 'CES').split('');
    let index = 0;
    ctx.fillStyle = '#0B2E59';
    while (cursor < end) {
      const code = text[index % text.length].charCodeAt(0);
      const bar = 3 + code % 8;
      const gap = 3 + (code >> 2) % 6;
      ctx.fillRect(cursor, y + 15, Math.min(bar, end - cursor), height - 30);
      cursor += bar + gap;
      index += 1;
    }
  }

  function fitText(ctx, text, x, y, maxWidth, initialSize, minSize, weight, family) {
    let size = initialSize;
    const value = String(text || '');
    while (size > minSize) {
      ctx.font = `${weight} ${size}px ${family}`;
      if (ctx.measureText(value).width <= maxWidth) break;
      size -= 2;
    }
    ctx.fillText(value, x, y);
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
