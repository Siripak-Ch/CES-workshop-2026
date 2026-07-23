const state = {
  currentStep: 1,
  totalSteps: 5,
  config: null,
  role: '',
  photoData: '',
  boardingPassData: '',
  latestResult: null,
  latestExport: null
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

let backendClient = null;

document.addEventListener('DOMContentLoaded', async () => {
  bindStaticEvents();

  try {
    backendClient = new AppsScriptBridgeClient(window.CES_APP_CONFIG);
    await backendClient.connect();
    const config = await backendClient.getAppData();
    initApp(config);
  } catch (error) {
    const loading = $('#loading');
    if (loading) loading.textContent = 'เชื่อมต่อระบบไม่สำเร็จ กรุณาตรวจสอบ config.js และ Apps Script deployment';
    handleServerError(error);
  }
});

function bindStaticEvents() {
  $$('[data-role]').forEach((button) => button.addEventListener('click', () => selectRole(button.dataset.role)));
  $$('[data-next]').forEach((button) => button.addEventListener('click', nextStep));
  $$('[data-back]').forEach((button) => button.addEventListener('click', previousStep));
  $('#photoInput').addEventListener('change', handlePhoto);
  $('#submitBtn').addEventListener('click', submitForm);
  $('#downloadJpeg').addEventListener('click', downloadBoardingPass);
  $('#printPass').addEventListener('click', () => window.print());
  $('#retryExport').addEventListener('click', retryExport);
  $('#editAgain').addEventListener('click', () => {
    $('#boardingWrap').classList.remove('show');
    $('#appCard').style.display = '';
    $('#progressWrap').style.display = '';
    goToStep(5);
    window.scrollTo({ top: $('#appCard').offsetTop - 12, behavior: 'smooth' });
  });
}

function initApp(config) {
  state.config = config;
  populateSelect($('#morningDrink'), config.menus.morningDrinks, 'เลือกเครื่องดื่ม');
  populateSelect($('#breakfastFood'), config.menus.breakfastFoods, 'เลือกเมนูอาหาร');
  populateSelect($('#afternoonDrink'), config.menus.afternoonDrinks, 'เลือกเครื่องดื่ม');
  $('#loading').remove();
  goToStep(1);
}

function populateSelect(select, options, placeholder) {
  select.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>` +
    options.map((item) => `<option value="${escapeAttr(item)}">${escapeHtml(item)}</option>`).join('');
}

function selectRole(role) {
  state.role = role;
  $$('[data-role]').forEach((button) => button.classList.toggle('selected', button.dataset.role === role));
  $('#amMenu').hidden = role !== 'AM_MNG';
  $('#staffMenu').hidden = role !== 'SUP_STAFF';
  $('#menuLead').textContent = role === 'AM_MNG'
    ? 'AM / MNG เลือกเครื่องดื่มช่วงเช้าและเมนูอาหารสำหรับ Morning / Lunch'
    : 'SUP / STAFF เลือกเครื่องดื่มสำหรับ Afternoon Break';
}

async function handlePhoto(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    showToast('รองรับรูป JPG, PNG หรือ WebP เท่านั้น', true);
    event.target.value = '';
    return;
  }
  try {
    state.photoData = await compressImage(file, 1200, 0.84);
    $('#photoPreview').src = state.photoData;
  } catch (error) {
    showToast('ไม่สามารถอ่านรูปนี้ได้ กรุณาเลือกรูปใหม่', true);
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
        const context = canvas.getContext('2d');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function nextStep() {
  if (!validateStep(state.currentStep)) return;
  if (state.currentStep === 3) renderJourney();
  if (state.currentStep === 4) renderSummary();
  goToStep(Math.min(state.totalSteps, state.currentStep + 1));
}

function previousStep() {
  goToStep(Math.max(1, state.currentStep - 1));
}

function goToStep(step) {
  state.currentStep = step;
  $$('.step').forEach((panel) => panel.classList.toggle('active', Number(panel.dataset.step) === step));
  const percent = ((step - 1) / state.totalSteps) * 100;
  $('#progressBar').style.width = `${percent}%`;
  $('#progressLabel').textContent = `ขั้นตอน ${step}/${state.totalSteps}`;
}

function validateStep(step) {
  if (step === 1 && !state.role) return fail('กรุณาเลือก AM / MNG หรือ SUP / STAFF');
  if (step === 2) {
    const employeeId = $('#employeeId').value.trim();
    if (!/^[A-Za-z0-9._-]{2,20}$/.test(employeeId)) return fail('กรุณากรอกรหัสพนักงานให้ถูกต้อง');
    if (!$('#nickname').value.trim()) return fail('กรุณากรอกชื่อเล่น');
    if (!state.photoData) return fail('กรุณาแนบรูปของคุณ');
    if (!$('#consent').checked) return fail('กรุณายินยอมให้จัดเก็บรูปสำหรับกิจกรรมนี้');
  }
  if (step === 3) {
    if (state.role === 'AM_MNG' && !$('#morningDrink').value) return fail('กรุณาเลือกเครื่องดื่มช่วงเช้า');
    if (state.role === 'AM_MNG' && !$('#breakfastFood').value) return fail('กรุณาเลือกเมนูอาหาร');
    if (state.role === 'SUP_STAFF' && !$('#afternoonDrink').value) return fail('กรุณาเลือกเครื่องดื่มช่วงบ่าย');
  }
  if (step === 4 && !$('#agendaRead').checked) return fail('กรุณายืนยันว่าอ่านรายละเอียดกิจกรรมแล้ว');
  return true;
}

function renderJourney() {
  const agenda = state.config.agenda[state.role] || [];
  $('#agenda').innerHTML = agenda.map(([time, title]) => `
    <div class="agenda-row"><div class="agenda-time">${escapeHtml(time)}</div><div class="agenda-title">${escapeHtml(title)}</div></div>
  `).join('');

  const locations = [state.config.event.morningLocation];
  if (state.role === 'AM_MNG' || state.config.event.showDinnerForStaff) locations.push(state.config.event.dinnerLocation);
  $('#locations').innerHTML = locations.map((location) => `
    <article class="location-card">
      <div class="tag">${escapeHtml(location.label)}</div>
      <h3>${escapeHtml(location.name)}</h3>
      <p>เวลา ${escapeHtml(location.time)}</p>
      <p>${escapeHtml(location.address)}</p>
      <a class="map-link" href="${escapeAttr(location.mapUrl)}" target="_blank" rel="noopener">เปิด Google Maps ↗</a>
    </article>
  `).join('');
}

function renderSummary() {
  const items = [
    ['กลุ่ม', state.role === 'AM_MNG' ? 'AM / MNG' : 'SUP / STAFF'],
    ['รหัสพนักงาน', $('#employeeId').value.trim().toUpperCase()],
    ['ชื่อเล่น', $('#nickname').value.trim()],
    ['ไฟล์ Boarding Pass', 'JPEG 2480 × 877 px / 21 × 7.425 ซม.']
  ];
  if (state.role === 'AM_MNG') {
    items.push(['เครื่องดื่มช่วงเช้า', $('#morningDrink').value]);
    items.push(['เมนูอาหาร', $('#breakfastFood').value]);
  } else {
    items.push(['เครื่องดื่มช่วงบ่าย', $('#afternoonDrink').value]);
  }
  $('#summary').innerHTML = items.map(([label, value]) => `
    <div class="summary-item"><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></div>
  `).join('');
}

async function submitForm() {
  const button = $('#submitBtn');
  button.disabled = true;
  button.textContent = 'กำลังบันทึกข้อมูล…';

  const payload = {
    role: state.role,
    employeeId: $('#employeeId').value.trim(),
    nickname: $('#nickname').value.trim(),
    photoData: state.photoData,
    consent: $('#consent').checked,
    agendaRead: $('#agendaRead').checked,
    morningDrink: state.role === 'AM_MNG' ? $('#morningDrink').value : '',
    breakfastFood: state.role === 'AM_MNG' ? $('#breakfastFood').value : '',
    afternoonDrink: state.role === 'SUP_STAFF' ? $('#afternoonDrink').value : ''
  };

  try {
    const result = await backendClient.submitCheckIn(payload);
    state.latestResult = result;
    button.textContent = 'กำลังสร้าง JPEG…';
    await showAndExportBoardingPass(result);
    button.disabled = false;
    button.textContent = 'ยืนยัน Check-in';
  } catch (error) {
    button.disabled = false;
    button.textContent = 'ยืนยัน Check-in';
    handleServerError(error);
  }
}

async function showAndExportBoardingPass(result) {
  state.boardingPassData = await createBoardingPassJpeg(result, state.photoData, state.config);
  $('#boardingPassImage').src = state.boardingPassData;
  $('#appCard').style.display = 'none';
  $('#progressWrap').style.display = 'none';
  $('#boardingWrap').classList.add('show');
  setExportStatus('กำลังบันทึก JPEG ลง Google Drive…', 'กรุณารอสักครู่ ระบบกำลังผูกไฟล์กับข้อมูล Check-in', 'pending');
  $('#retryExport').hidden = true;
  $('#driveFileLink').hidden = true;
  window.scrollTo({ top: $('#boardingWrap').offsetTop - 16, behavior: 'smooth' });

  try {
    const exportResult = await persistBoardingPass();
    state.latestExport = exportResult;
    setExportStatus(
      'บันทึก Boarding Pass JPEG เรียบร้อยแล้ว',
      `${exportResult.fileName} • ${exportResult.printSize} • ${exportResult.widthPx} × ${exportResult.heightPx} px`,
      'success'
    );
    $('#driveFileLink').href = exportResult.fileUrl;
    $('#driveFileLink').hidden = false;
    showToast(result.updatedExisting ? 'อัปเดตข้อมูลและ JPEG เดิมเรียบร้อยแล้ว' : 'Check-in และสร้าง JPEG สำเร็จแล้ว');
  } catch (error) {
    state.latestExport = null;
    setExportStatus(
      'Check-in สำเร็จ แต่ยังบันทึก JPEG ลง Drive ไม่สำเร็จ',
      error && error.message ? error.message : 'กรุณากดบันทึก JPEG อีกครั้ง',
      'error'
    );
    $('#retryExport').hidden = false;
    handleServerError(error);
  }
}

async function persistBoardingPass() {
  if (!state.latestResult || !state.boardingPassData) throw new Error('ยังไม่มีข้อมูล Boarding Pass สำหรับบันทึก');
  return backendClient.saveBoardingPassJpeg({
    ticketId: state.latestResult.ticketId,
    employeeId: state.latestResult.employeeId,
    nickname: state.latestResult.nickname,
    boardingPassData: state.boardingPassData
  });
}

async function retryExport() {
  const button = $('#retryExport');
  button.disabled = true;
  button.textContent = 'กำลังบันทึก…';
  setExportStatus('กำลังบันทึก JPEG ลง Google Drive…', 'กำลังลองใหม่', 'pending');
  try {
    const result = await persistBoardingPass();
    state.latestExport = result;
    setExportStatus(
      'บันทึก Boarding Pass JPEG เรียบร้อยแล้ว',
      `${result.fileName} • ${result.printSize} • ${result.widthPx} × ${result.heightPx} px`,
      'success'
    );
    $('#driveFileLink').href = result.fileUrl;
    $('#driveFileLink').hidden = false;
    button.hidden = true;
    showToast('บันทึก JPEG สำเร็จแล้ว');
  } catch (error) {
    setExportStatus('ยังบันทึก JPEG ไม่สำเร็จ', error.message || 'กรุณาลองอีกครั้ง', 'error');
    handleServerError(error);
  } finally {
    button.disabled = false;
    button.textContent = 'บันทึก JPEG อีกครั้ง';
  }
}

function setExportStatus(title, detail, status) {
  $('#exportStatus').textContent = title;
  $('#exportDetail').textContent = detail;
  $('.export-panel').dataset.status = status;
}

function downloadBoardingPass() {
  if (!state.boardingPassData || !state.latestResult) {
    showToast('ยังไม่มี Boarding Pass สำหรับดาวน์โหลด', true);
    return;
  }
  const anchor = document.createElement('a');
  anchor.href = state.boardingPassData;
  anchor.download = sanitizeDownloadName(`BoardingPass_${state.latestResult.ticketId}_${state.latestResult.nickname}.jpg`);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

async function createBoardingPassJpeg(result, photoData, config) {
  const exportConfig = config.export || { widthPx: 2480, heightPx: 877 };
  const width = Number(exportConfig.widthPx || 2480);
  const height = Number(exportConfig.heightPx || 877);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch (error) { /* use fallback fonts */ }
  }
  const photo = await loadImage(photoData);

  const navy = '#0B2E59';
  const navy2 = '#153D70';
  const gold = '#C7A252';
  const cream = '#F8F2E5';
  const paper = '#FFFDF8';
  const sage = '#91A083';
  const ink = '#17324F';
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

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 34px "Noto Sans Thai", Tahoma, sans-serif';
  ctx.fillText('CES • TEAM JOURNEY PASSPORT', 104, 104);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#EED99F';
  ctx.font = '700 27px "Noto Sans Thai", Tahoma, sans-serif';
  ctx.fillText('LEAD • INSPIRE • ELEVATE', width - 104, 101);
  ctx.textAlign = 'left';

  drawJourneyDecoration(ctx, 70, height - 180, 1700, 105, sage, gold);

  // Photo panel
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
  ctx.font = '900 22px "Noto Sans Thai", Tahoma, sans-serif';
  ctx.fillText('PASSENGER', 150, 618);
  ctx.fillStyle = muted;
  ctx.font = '600 22px "Noto Sans Thai", Tahoma, sans-serif';
  ctx.fillText(`ID ${result.employeeId}`, 150, 650);

  // Main title and passenger
  ctx.fillStyle = gold;
  ctx.font = '900 25px "Noto Sans Thai", Tahoma, sans-serif';
  ctx.fillText('BOARDING PASS • LEADERSHIP TRANSFORMATION JOURNEY 2026', 485, 235);
  ctx.fillStyle = navy;
  ctx.font = '800 92px "Playfair Display", Georgia, serif';
  fitText(ctx, String(result.nickname || '').toUpperCase(), 485, 345, 1230, 92, 52, '800', '"Playfair Display", Georgia, serif');
  ctx.fillStyle = muted;
  ctx.font = '700 28px "Noto Sans Thai", Tahoma, sans-serif';
  ctx.fillText(`PASSENGER ID  ${result.employeeId}`, 490, 398);

  // Route
  ctx.fillStyle = navy;
  ctx.font = '900 76px "Playfair Display", Georgia, serif';
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

  // Metadata boxes
  const metaY = 560;
  const metaItems = [
    ['GROUP', result.roleLabel],
    ['DATE', result.eventDate],
    ['BOARDING', result.departure],
    ['GATE', result.gate]
  ];
  metaItems.forEach((item, index) => {
    drawMetaBlock(ctx, 485 + (index * 298), metaY, 270, 105, item[0], item[1], navy, muted, gold);
  });

  // Service selection
  const serviceText = result.role === 'AM_MNG'
    ? [result.selections.morningDrink, result.selections.breakfastFood].filter(Boolean).join(' • ')
    : result.selections.afternoonDrink;
  ctx.fillStyle = navy;
  ctx.font = '900 21px "Noto Sans Thai", Tahoma, sans-serif';
  ctx.fillText('JOURNEY SERVICE', 485, 716);
  ctx.fillStyle = muted;
  ctx.font = '600 24px "Noto Sans Thai", Tahoma, sans-serif';
  fitText(ctx, serviceText || 'CES TEAM EXPERIENCE', 485, 753, 1180, 24, 19, '600', '"Noto Sans Thai", Tahoma, sans-serif');

  // Perforation
  ctx.strokeStyle = '#C8C4BA';
  ctx.lineWidth = 4;
  ctx.setLineDash([16, 16]);
  ctx.beginPath();
  ctx.moveTo(stubX, 188);
  ctx.lineTo(stubX, height - 58);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = cream;
  ctx.beginPath();
  ctx.arc(stubX, 182, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(stubX, height - 48, 24, 0, Math.PI * 2);
  ctx.fill();

  // Stub
  const gradient = ctx.createLinearGradient(stubX, 0, width, height);
  gradient.addColorStop(0, navy);
  gradient.addColorStop(1, navy2);
  ctx.fillStyle = gradient;
  roundRect(ctx, stubX + 18, 192, width - stubX - 54, height - 238, 30);
  ctx.fill();

  ctx.fillStyle = '#EED99F';
  ctx.font = '900 25px "Noto Sans Thai", Tahoma, sans-serif';
  ctx.fillText('BOARDING PASS', stubX + 70, 255);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 36px "Noto Sans Thai", Tahoma, sans-serif';
  fitText(ctx, result.ticketId, stubX + 70, 315, 465, 36, 24, '800', '"Noto Sans Thai", Tahoma, sans-serif');

  drawStubLine(ctx, stubX + 70, 365, 'PASSENGER', result.nickname, gold);
  drawStubLine(ctx, stubX + 70, 445, 'ROUTE', result.route, gold);
  drawStubLine(ctx, stubX + 70, 525, 'BOARDING', `${result.departure} • ${result.gate}`, gold);
  drawBarcode(ctx, stubX + 70, 610, 450, 112, result.ticketId);

  ctx.fillStyle = '#EED99F';
  ctx.font = '700 19px "Noto Sans Thai", Tahoma, sans-serif';
  ctx.fillText('REFLECT • CONNECT • INSPIRE • APPRECIATE', stubX + 70, 768);

  const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.94);
  return setJpegDpiMetadata(jpegDataUrl, Number(exportConfig.dpi || 300));
}

function setJpegDpiMetadata(dataUrl, dpi) {
  try {
    const parts = dataUrl.split(',');
    const binary = atob(parts[1]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);

    for (let i = 2; i < Math.min(bytes.length - 18, 128); i += 1) {
      const isJfif = bytes[i] === 0xFF && bytes[i + 1] === 0xE0 &&
        bytes[i + 4] === 0x4A && bytes[i + 5] === 0x46 &&
        bytes[i + 6] === 0x49 && bytes[i + 7] === 0x46 && bytes[i + 8] === 0x00;
      if (!isJfif) continue;

      const density = Math.max(1, Math.min(65535, Math.round(dpi)));
      bytes[i + 11] = 1; // dots per inch
      bytes[i + 12] = (density >> 8) & 0xFF;
      bytes[i + 13] = density & 0xFF;
      bytes[i + 14] = (density >> 8) & 0xFF;
      bytes[i + 15] = density & 0xFF;
      break;
    }

    let output = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      output += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    return `${parts[0]},${btoa(output)}`;
  } catch (error) {
    return dataUrl;
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function drawCoverImage(ctx, image, x, y, width, height) {
  const ratio = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * ratio;
  const drawHeight = image.height * ratio;
  const offsetX = x + (width - drawWidth) / 2;
  const offsetY = y + (height - drawHeight) / 2;
  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
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
  ctx.font = '800 17px "Noto Sans Thai", Tahoma, sans-serif';
  ctx.fillText(label, x + 26, y + 34);
  ctx.fillStyle = navy;
  ctx.font = '900 29px "Noto Sans Thai", Tahoma, sans-serif';
  fitText(ctx, value, x + 26, y + 76, width - 44, 29, 20, '900', '"Noto Sans Thai", Tahoma, sans-serif');
}

function drawStubLine(ctx, x, y, label, value, gold) {
  ctx.fillStyle = '#D0D9E4';
  ctx.font = '700 18px "Noto Sans Thai", Tahoma, sans-serif';
  ctx.fillText(label, x, y);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 27px "Noto Sans Thai", Tahoma, sans-serif';
  fitText(ctx, value, x, y + 35, 455, 27, 20, '900', '"Noto Sans Thai", Tahoma, sans-serif');
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
    const barWidth = 3 + (code % 8);
    const gap = 3 + ((code >> 2) % 6);
    ctx.fillRect(cursor, y + 15, Math.min(barWidth, end - cursor), height - 30);
    cursor += barWidth + gap;
    index += 1;
  }
}

function drawPlane(ctx, x, y, navy, gold) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = navy;
  ctx.beginPath();
  ctx.moveTo(-55, -5);
  ctx.lineTo(44, -5);
  ctx.lineTo(80, -36);
  ctx.lineTo(95, -31);
  ctx.lineTo(74, 0);
  ctx.lineTo(95, 31);
  ctx.lineTo(80, 36);
  ctx.lineTo(44, 5);
  ctx.lineTo(-55, 5);
  ctx.lineTo(-86, 23);
  ctx.lineTo(-96, 18);
  ctx.lineTo(-74, 0);
  ctx.lineTo(-96, -18);
  ctx.lineTo(-86, -23);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawJourneyDecoration(ctx, x, y, width, height, sage, gold) {
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = sage;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x, y + height);
  for (let i = 0; i <= 12; i += 1) {
    const px = x + (width / 12) * i;
    const py = y + height - (i % 3 === 0 ? 68 : i % 2 === 0 ? 42 : 22);
    ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.strokeStyle = gold;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y + height - 8);
  ctx.bezierCurveTo(x + width * 0.25, y + 12, x + width * 0.62, y + height + 5, x + width, y + 20);
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

function handleServerError(error) {
  const message = error && error.message ? error.message : String(error || 'เกิดข้อผิดพลาด');
  showToast(message.replace(/^Exception:\s*/, ''), true);
}

function fail(message) {
  showToast(message, true);
  return false;
}

let toastTimer;
function showToast(message, isError = false) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3600);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[character]));
}

function escapeAttr(value) {
  return escapeHtml(value);
}
