(function () {
  'use strict';

  const config = window.CES_APP_CONFIG;
  const state = {
    step: 1,
    totalSteps: 4,
    role: '',
    photoData: '',
    boardingPassData: '',
    latestResult: null
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const client = new AppsScriptFormClient(config);
  const stepNames = ['เลือกกลุ่ม', 'ข้อมูลผู้เดินทาง', 'เลือกเมนู', 'ตรวจสอบการเดินทาง'];

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    populateSelect($('#morningDrink'), config.menus.morningDrinks, 'เลือกเครื่องดื่ม');
    populateSelect($('#breakfastFood'), config.menus.breakfastFoods, 'เลือกเมนูอาหาร');
    populateSelect($('#afternoonDrink'), config.menus.afternoonDrinks, 'เลือกเครื่องดื่ม');

    $$('[data-role]').forEach((button) => button.addEventListener('click', () => selectRole(button.dataset.role)));
    $('#nextBtn').addEventListener('click', nextStep);
    $('#backBtn').addEventListener('click', previousStep);
    $('#submitBtn').addEventListener('click', submitForm);
    $('#photoInput').addEventListener('change', handlePhoto);
    $('#downloadJpeg').addEventListener('click', downloadBoardingPass);
    $('#printPass').addEventListener('click', () => window.print());
    $('#editAgain').addEventListener('click', editAgain);

    goToStep(1);
  }

  function populateSelect(select, items, placeholder) {
    select.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>` +
      items.map((item) => `<option value="${escapeAttr(item)}">${escapeHtml(item)}</option>`).join('');
  }

  function selectRole(role) {
    state.role = role;
    $$('[data-role]').forEach((button) => button.classList.toggle('selected', button.dataset.role === role));
    $('#amMenu').hidden = role !== 'AM_MNG';
    $('#staffMenu').hidden = role !== 'SUP_STAFF';
    $('#menuLead').textContent = role === 'AM_MNG'
      ? 'เลือกเครื่องดื่มช่วงเช้าและอาหารสำหรับ Morning / Lunch'
      : 'เลือกเครื่องดื่มสำหรับ Afternoon Break';
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
      state.photoData = await compressImage(file, 760, 0.74);
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
    if (state.step === 3) renderFinalStep();
    goToStep(Math.min(state.totalSteps, state.step + 1));
  }

  function previousStep() {
    goToStep(Math.max(1, state.step - 1));
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
  }

  function validateStep(step) {
    if (step === 1 && !state.role) return fail('กรุณาเลือก AM / MNG หรือ SUP / STAFF');
    if (step === 2) {
      const employeeId = $('#employeeId').value.trim();
      if (!/^[A-Za-z0-9._-]{2,20}$/.test(employeeId)) return fail('กรุณากรอกรหัสพนักงานให้ถูกต้อง');
      if (!$('#nickname').value.trim()) return fail('กรุณากรอกชื่อเล่น');
      if (!state.photoData) return fail('กรุณาถ่ายรูปหรือเลือกรูป');
      if (!$('#consent').checked) return fail('กรุณายินยอมให้จัดเก็บรูป');
    }
    if (step === 3) {
      if (state.role === 'AM_MNG' && !$('#morningDrink').value) return fail('กรุณาเลือกเครื่องดื่มช่วงเช้า');
      if (state.role === 'AM_MNG' && !$('#breakfastFood').value) return fail('กรุณาเลือกเมนูอาหาร');
      if (state.role === 'SUP_STAFF' && !$('#afternoonDrink').value) return fail('กรุณาเลือกเครื่องดื่มช่วงบ่าย');
    }
    if (step === 4 && !$('#agendaRead').checked) return fail('กรุณายืนยันว่าอ่านรายละเอียดแล้ว');
    return true;
  }

  function renderFinalStep() {
    const agenda = config.agenda[state.role] || [];
    $('#agenda').innerHTML = agenda.map(([time, title]) => `
      <div class="agenda-row"><div class="agenda-time">${escapeHtml(time)}</div><div class="agenda-title">${escapeHtml(title)}</div></div>
    `).join('');

    const locations = [config.event.morningLocation];
    if (state.role === 'AM_MNG' || config.event.showDinnerForStaff) locations.push(config.event.dinnerLocation);
    $('#locations').innerHTML = locations.map((location) => `
      <article class="location-card">
        <div class="tag">${escapeHtml(location.label)}</div>
        <h3>${escapeHtml(location.name)}</h3>
        <p>เวลา ${escapeHtml(location.time)}</p>
        <p>${escapeHtml(location.address)}</p>
        <a class="map-link" href="${escapeAttr(location.mapUrl)}" target="_blank" rel="noopener">เปิด Google Maps ↗</a>
      </article>
    `).join('');

    const items = [
      ['กลุ่ม', state.role === 'AM_MNG' ? 'AM / MNG' : 'SUP / STAFF'],
      ['รหัสพนักงาน', $('#employeeId').value.trim().toUpperCase()],
      ['ชื่อเล่น', $('#nickname').value.trim()]
    ];
    if (state.role === 'AM_MNG') {
      items.push(['เครื่องดื่ม', $('#morningDrink').value], ['อาหาร', $('#breakfastFood').value]);
    } else {
      items.push(['เครื่องดื่ม', $('#afternoonDrink').value]);
    }
    $('#summary').innerHTML = items.map(([label, value]) => `
      <div class="summary-item"><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></div>
    `).join('');
  }

  async function submitForm() {
    if (!validateStep(4)) return;

    const button = $('#submitBtn');
    button.disabled = true;
    showSaving('กำลังสร้าง Boarding Pass…');

    try {
      const employeeId = $('#employeeId').value.trim().toUpperCase();
      const nickname = $('#nickname').value.trim();
      const ticketId = createTicketId(state.role, employeeId);
      const draft = buildBoardingResult(ticketId, employeeId, nickname);

      state.boardingPassData = await createBoardingPassJpeg(draft, state.photoData, config);
      $('#savingText').textContent = 'กำลังบันทึกข้อมูล รูป และ JPEG ลง Google Drive…';

      const result = await client.submitCheckIn({
        role: state.role,
        employeeId,
        nickname,
        ticketId,
        photoData: state.photoData,
        boardingPassData: state.boardingPassData,
        consent: true,
        agendaRead: true,
        morningDrink: state.role === 'AM_MNG' ? $('#morningDrink').value : '',
        breakfastFood: state.role === 'AM_MNG' ? $('#breakfastFood').value : '',
        afternoonDrink: state.role === 'SUP_STAFF' ? $('#afternoonDrink').value : ''
      });

      state.latestResult = result;
      showResult(result);
    } catch (error) {
      handleError(error);
    } finally {
      hideSaving();
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
      route: state.role === 'AM_MNG' ? 'FAVE → WAKE UP' : 'FAVE',
      selections: {
        morningDrink: state.role === 'AM_MNG' ? $('#morningDrink').value : '',
        breakfastFood: state.role === 'AM_MNG' ? $('#breakfastFood').value : '',
        afternoonDrink: state.role === 'SUP_STAFF' ? $('#afternoonDrink').value : ''
      }
    };
  }

  function showResult(result) {
    $('#boardingPassImage').src = state.boardingPassData;
    $('#driveFileLink').href = result.boardingPassFileUrl;
    $('#resultMessage').textContent = result.updatedExisting
      ? `อัปเดตข้อมูลของ ${result.nickname} และสร้างไฟล์ใหม่เรียบร้อยแล้ว`
      : `Check-in สำเร็จสำหรับ ${result.nickname} • ${result.ticketId}`;
    $('#appCard').hidden = true;
    $('.progress-card').hidden = true;
    $('#bottomActions').hidden = true;
    $('#resultCard').hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Check-in และบันทึก JPEG สำเร็จแล้ว');
  }

  function editAgain() {
    $('#resultCard').hidden = true;
    $('#appCard').hidden = false;
    $('.progress-card').hidden = false;
    $('#bottomActions').hidden = false;
    goToStep(4);
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
    const [photo, logo] = await Promise.all([loadImage(photoData), loadImage(appConfig.logoUrl)]);

    const navy = '#0B2E59';
    const navy2 = '#174778';
    const gold = '#C7A252';
    const cream = '#F8F2E5';
    const paper = '#FFFDF8';
    const sage = '#91A083';
    const muted = '#667587';
    const stubX = 1860;

    ctx.fillStyle = cream;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = paper;
    roundRect(ctx, 36, 36, width - 72, height - 72, 42);
    ctx.fill();

    ctx.fillStyle = navy;
    roundRect(ctx, 36, 36, width - 72, 126, 42);
    ctx.fill();
    ctx.fillRect(36, 110, width - 72, 52);
    ctx.fillStyle = gold;
    ctx.fillRect(36, 162, width - 72, 8);

    ctx.save();
    ctx.beginPath();
    ctx.arc(108, 101, 49, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#FFFDF8';
    ctx.fillRect(59, 52, 98, 98);
    ctx.drawImage(logo, 59, 52, 98, 98);
    ctx.restore();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 31px Tahoma, Arial, sans-serif';
    ctx.fillText('CES • TEAM JOURNEY PASSPORT', 180, 105);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#EED99F';
    ctx.font = '700 25px Tahoma, Arial, sans-serif';
    ctx.fillText('LEAD • INSPIRE • ELEVATE', width - 104, 101);
    ctx.textAlign = 'left';

    drawJourneyDecoration(ctx, 70, height - 180, 1700, 105, sage, gold);

    ctx.fillStyle = '#EEF0E7';
    roundRect(ctx, 105, 220, 322, 432, 34);
    ctx.fill();
    ctx.save();
    roundRect(ctx, 125, 240, 282, 330, 28);
    ctx.clip();
    drawCoverImage(ctx, photo, 125, 240, 282, 330);
    ctx.restore();
    ctx.strokeStyle = gold;
    ctx.lineWidth = 6;
    roundRect(ctx, 125, 240, 282, 330, 28);
    ctx.stroke();
    ctx.fillStyle = navy;
    ctx.font = '900 22px Tahoma, Arial, sans-serif';
    ctx.fillText('PASSENGER', 150, 618);
    ctx.fillStyle = muted;
    ctx.font = '600 22px Tahoma, Arial, sans-serif';
    ctx.fillText(`ID ${result.employeeId}`, 150, 650);

    ctx.fillStyle = gold;
    ctx.font = '900 24px Tahoma, Arial, sans-serif';
    ctx.fillText('BOARDING PASS • LEADERSHIP TRANSFORMATION JOURNEY 2026', 485, 235);
    ctx.fillStyle = navy;
    fitText(ctx, String(result.nickname || '').toUpperCase(), 485, 345, 1230, 90, 48, '800', 'Georgia, serif');
    ctx.fillStyle = muted;
    ctx.font = '700 27px Tahoma, Arial, sans-serif';
    ctx.fillText(`PASSENGER ID  ${result.employeeId}`, 490, 398);

    ctx.fillStyle = navy;
    ctx.font = '900 74px Georgia, serif';
    ctx.fillText('CES', 495, 505);
    ctx.textAlign = 'right';
    ctx.fillText('LTJ', 1720, 505);
    ctx.textAlign = 'left';
    ctx.strokeStyle = gold;
    ctx.lineWidth = 5;
    ctx.setLineDash([24, 18]);
    ctx.beginPath();
    ctx.moveTo(690, 480);
    ctx.lineTo(1518, 480);
    ctx.stroke();
    ctx.setLineDash([]);
    drawPlane(ctx, 1090, 478, navy, gold);

    const metaItems = [
      ['GROUP', result.roleLabel], ['DATE', result.eventDate],
      ['BOARDING', result.departure], ['GATE', result.gate]
    ];
    metaItems.forEach((item, index) => drawMetaBlock(ctx, 485 + index * 298, 560, 270, 105, item[0], item[1], navy, muted, gold));

    const serviceText = result.role === 'AM_MNG'
      ? [result.selections.morningDrink, result.selections.breakfastFood].filter(Boolean).join(' • ')
      : result.selections.afternoonDrink;
    ctx.fillStyle = navy;
    ctx.font = '900 21px Tahoma, Arial, sans-serif';
    ctx.fillText('JOURNEY SERVICE', 485, 716);
    ctx.fillStyle = muted;
    fitText(ctx, serviceText || 'CES TEAM EXPERIENCE', 485, 753, 1180, 24, 18, '600', 'Tahoma, Arial, sans-serif');

    ctx.strokeStyle = '#C8C4BA';
    ctx.lineWidth = 4;
    ctx.setLineDash([16, 16]);
    ctx.beginPath();
    ctx.moveTo(stubX, 188);
    ctx.lineTo(stubX, height - 58);
    ctx.stroke();
    ctx.setLineDash([]);

    const gradient = ctx.createLinearGradient(stubX, 0, width, height);
    gradient.addColorStop(0, navy);
    gradient.addColorStop(1, navy2);
    ctx.fillStyle = gradient;
    roundRect(ctx, stubX + 18, 192, width - stubX - 54, height - 238, 30);
    ctx.fill();

    ctx.fillStyle = '#EED99F';
    ctx.font = '900 25px Tahoma, Arial, sans-serif';
    ctx.fillText('BOARDING PASS', stubX + 70, 255);
    ctx.fillStyle = '#FFFFFF';
    fitText(ctx, result.ticketId, stubX + 70, 315, 465, 34, 21, '800', 'Tahoma, Arial, sans-serif');
    drawStubLine(ctx, stubX + 70, 365, 'PASSENGER', result.nickname, gold);
    drawStubLine(ctx, stubX + 70, 445, 'ROUTE', result.route, gold);
    drawStubLine(ctx, stubX + 70, 525, 'BOARDING', `${result.departure} • ${result.gate}`, gold);
    drawBarcode(ctx, stubX + 70, 610, 450, 112, result.ticketId);
    ctx.fillStyle = '#EED99F';
    ctx.font = '700 18px Tahoma, Arial, sans-serif';
    ctx.fillText('REFLECT • CONNECT • INSPIRE • APPRECIATE', stubX + 70, 768);

    return setJpegDpiMetadata(canvas.toDataURL('image/jpeg', 0.90), Number(exp.dpi || 300));
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
    ctx.fillStyle = '#F7F2E7';
    roundRect(ctx, x, y, width, height, 18);
    ctx.fill();
    ctx.fillStyle = gold;
    ctx.fillRect(x, y, 7, height);
    ctx.fillStyle = muted;
    ctx.font = '800 17px Tahoma, Arial, sans-serif';
    ctx.fillText(label, x + 26, y + 34);
    ctx.fillStyle = navy;
    fitText(ctx, value, x + 26, y + 76, width - 44, 29, 19, '900', 'Tahoma, Arial, sans-serif');
  }

  function drawStubLine(ctx, x, y, label, value, gold) {
    ctx.fillStyle = '#D0D9E4';
    ctx.font = '700 18px Tahoma, Arial, sans-serif';
    ctx.fillText(label, x, y);
    ctx.fillStyle = '#FFFFFF';
    fitText(ctx, value, x, y + 35, 455, 27, 19, '900', 'Tahoma, Arial, sans-serif');
    ctx.strokeStyle = gold;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.moveTo(x, y + 49);
    ctx.lineTo(x + 455, y + 49);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawBarcode(ctx, x, y, width, height, seed) {
    ctx.fillStyle = '#FFFFFF';
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

  function drawPlane(ctx, x, y, navy, gold) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = navy;
    ctx.beginPath();
    ctx.moveTo(-55, -5); ctx.lineTo(44, -5); ctx.lineTo(80, -36); ctx.lineTo(95, -31);
    ctx.lineTo(74, 0); ctx.lineTo(95, 31); ctx.lineTo(80, 36); ctx.lineTo(44, 5);
    ctx.lineTo(-55, 5); ctx.lineTo(-86, 23); ctx.lineTo(-96, 18); ctx.lineTo(-74, 0);
    ctx.lineTo(-96, -18); ctx.lineTo(-86, -23); ctx.closePath(); ctx.fill();
    ctx.fillStyle = gold; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }

  function drawJourneyDecoration(ctx, x, y, width, height, sage, gold) {
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = sage;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x, y + height);
    for (let i = 0; i <= 12; i += 1) {
      const px = x + width / 12 * i;
      const py = y + height - (i % 3 === 0 ? 68 : i % 2 === 0 ? 42 : 22);
      ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.strokeStyle = gold;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y + height - 8);
    ctx.bezierCurveTo(x + width * .25, y + 12, x + width * .62, y + height + 5, x + width, y + 20);
    ctx.stroke();
    ctx.restore();
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
