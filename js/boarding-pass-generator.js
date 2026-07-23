(function (global) {
  'use strict';

  const DEFAULTS = Object.freeze({
    width: 2480,
    height: 877,
    dpi: 300,
    quality: 0.91,
    colors: {
      navy: '#071F3B',
      navyDeep: '#031426',
      navySoft: '#0D2B4C',
      gold: '#C9A34E',
      goldLight: '#E8D8B0',
      cream: '#F8F3E8',
      paper: '#FFFDF8',
      ink: '#061B33',
      muted: '#6C7480',
      line: '#D9CBA7',
      lineSoft: '#E9E0CD'
    }
  });

  async function generate(options) {
    const result = normalizeResult(options && options.result);
    const photoData = options && options.photoData;
    const config = options && options.config ? options.config : {};
    const exportConfig = config.export || {};
    const width = Number(exportConfig.widthPx || DEFAULTS.width);
    const height = Number(exportConfig.heightPx || DEFAULTS.height);
    const dpi = Number(exportConfig.dpi || DEFAULTS.dpi);
    const timeoutMs = Number(config.generationTimeoutMs || 12000);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false });

    const [photo, logo] = await Promise.all([
      loadImageWithTimeout(photoData, timeoutMs),
      loadImageWithTimeout(config.logoUrl, timeoutMs).catch(() => null)
    ]);

    const scaleX = width / DEFAULTS.width;
    const scaleY = height / DEFAULTS.height;
    ctx.save();
    ctx.scale(scaleX, scaleY);
    drawTicket(ctx, result, photo, logo, DEFAULTS.colors);
    ctx.restore();

    return setJpegDpiMetadata(canvas.toDataURL('image/jpeg', DEFAULTS.quality), dpi);
  }

  function normalizeResult(result) {
    const value = result || {};
    const selections = value.selections || {};
    const drink = value.role === 'AM_MNG' ? selections.morningDrink : selections.afternoonDrink;
    const sweetness = value.role === 'AM_MNG' ? selections.morningSweetness : selections.afternoonSweetness;
    const food = value.role === 'AM_MNG' ? selections.breakfastFood : 'AFTERNOON BREAK';
    return {
      ticketId: String(value.ticketId || 'CES26-LDR-000000-XXXXXX'),
      employeeId: String(value.employeeId || '-'),
      nickname: String(value.nickname || 'PASSENGER'),
      roleLabel: String(value.roleLabel || '-'),
      eventDate: String(value.eventDate || '-'),
      departure: String(value.departure || '-'),
      arrival: String(value.arrival || '-'),
      route: String(value.route || 'FAVE CASUAL DINING AND WORKING SPACE → WAKE UP - CAFE AND RESTAURANT'),
      drink: String(drink || '-'),
      sweetness: String(sweetness || '-'),
      food: String(food || '-')
    };
  }

  function drawTicket(ctx, result, photo, logo, c) {
    drawPaper(ctx, c);
    drawHeader(ctx, logo, c);
    drawTravelWatermarks(ctx, c);
    drawPerforation(ctx, c);
    drawPhotoSection(ctx, photo, result, c);
    drawMainInformation(ctx, result, c);
    drawStub(ctx, result, c);
    drawFooter(ctx, c);
  }

  function drawPaper(ctx, c) {
    ctx.fillStyle = '#F0EDE5';
    ctx.fillRect(0, 0, DEFAULTS.width, DEFAULTS.height);

    ctx.save();
    ctx.shadowColor = 'rgba(3, 20, 38, 0.24)';
    ctx.shadowBlur = 26;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = c.paper;
    roundedRect(ctx, 18, 18, 2444, 840, 38);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = c.gold;
    ctx.lineWidth = 2;
    roundedRect(ctx, 18, 18, 2444, 840, 38);
    ctx.stroke();
  }

  function drawHeader(ctx, logo, c) {
    const gradient = ctx.createLinearGradient(20, 20, 2450, 180);
    gradient.addColorStop(0, c.navyDeep);
    gradient.addColorStop(0.62, c.navy);
    gradient.addColorStop(1, '#020D1B');
    ctx.fillStyle = gradient;
    roundedRect(ctx, 20, 20, 2440, 190, 34);
    ctx.fill();
    ctx.fillRect(20, 120, 2440, 90);

    ctx.strokeStyle = c.gold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, 210);
    ctx.lineTo(2460, 210);
    ctx.stroke();

    if (logo) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(102, 104, 62, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(40, 42, 124, 124);
      drawContainImage(ctx, logo, 42, 44, 120, 120);
      ctx.restore();
      ctx.strokeStyle = c.goldLight;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(102, 104, 62, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = c.goldLight;
    ctx.font = '800 23px Arial, Helvetica, sans-serif';
    ctx.fillText('CES • LEADERSHIP TRANSFORMATION JOURNEY', 220, 66);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 70px Georgia, Times New Roman, serif';
    ctx.fillText('JOURNEY CHECK-IN', 220, 136);

    ctx.fillStyle = c.goldLight;
    ctx.font = '700 18px Arial, Helvetica, sans-serif';
    ctx.fillText('REFLECT • CONNECT • INSPIRE', 220, 180);

    drawPlaneTrail(ctx, 1320, 76, c);
    drawBoardingBadge(ctx, 1940, 48, c);
  }

  function drawPlaneTrail(ctx, x, y, c) {
    ctx.save();
    ctx.strokeStyle = 'rgba(232, 216, 176, 0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(x + 120, y + 5);
    ctx.bezierCurveTo(x + 280, y - 70, x + 310, y + 100, x + 480, y + 40);
    ctx.bezierCurveTo(x + 560, y + 12, x + 640, y + 74, x + 700, y + 44);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(232, 216, 176, 0.45)';
    ctx.font = '900 58px Arial, Helvetica, sans-serif';
    ctx.save();
    ctx.translate(x + 70, y + 17);
    ctx.rotate(-0.3);
    ctx.fillText('✈', 0, 0);
    ctx.restore();
    ctx.restore();
  }

  function drawBoardingBadge(ctx, x, y, c) {
    const width = 405;
    const height = 66;
    ctx.save();
    ctx.strokeStyle = c.gold;
    ctx.lineWidth = 2;
    roundedRect(ctx, x, y, width, height, 16);
    ctx.stroke();

    ctx.fillStyle = c.gold;
    ctx.beginPath();
    ctx.moveTo(x + width - 98, y + 1);
    ctx.lineTo(x + width - 1, y + 1);
    ctx.lineTo(x + width - 1, y + height - 1);
    ctx.lineTo(x + width - 130, y + height - 1);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = c.goldLight;
    ctx.font = '900 20px Arial, Helvetica, sans-serif';
    ctx.fillText('BOARDING PASS', x + 28, y + 43);

    ctx.fillStyle = c.navyDeep;
    ctx.font = '900 30px Arial, Helvetica, sans-serif';
    ctx.fillText('✈', x + width - 66, y + 44);
    ctx.restore();
  }

  function drawTravelWatermarks(ctx, c) {
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.strokeStyle = c.gold;
    ctx.lineWidth = 2;

    // Globe watermark, left bottom.
    ctx.beginPath();
    ctx.arc(145, 765, 176, 0, Math.PI * 2);
    ctx.stroke();
    [-100, -50, 0, 50, 100].forEach((offset) => {
      ctx.beginPath();
      ctx.ellipse(145, 765, Math.max(12, 176 - Math.abs(offset)), 176, 0, 0, Math.PI * 2);
      ctx.stroke();
    });
    [-90, -45, 0, 45, 90].forEach((offset) => {
      ctx.beginPath();
      ctx.ellipse(145, 765, 176, Math.max(12, 176 - Math.abs(offset)), 0, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Compass watermark, center.
    ctx.beginPath();
    ctx.arc(1435, 360, 118, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(1435, 360, 82, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(1435, 244); ctx.lineTo(1460, 360); ctx.lineTo(1435, 476); ctx.lineTo(1410, 360); ctx.closePath();
    ctx.stroke();
    ctx.restore();

    drawPassportStamp(ctx, 1470, 300, c);
  }

  function drawPassportStamp(ctx, x, y, c) {
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = c.gold;
    ctx.lineWidth = 3;
    ctx.translate(x, y);
    ctx.rotate(-0.12);
    ctx.beginPath();
    ctx.arc(0, 0, 78, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 61, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = '900 27px Arial, Helvetica, sans-serif';
    ctx.fillStyle = c.gold;
    ctx.fillText('✈', -14, 10);
    ctx.font = '800 13px Arial, Helvetica, sans-serif';
    ctx.fillText('LEADERSHIP', -48, -35);
    ctx.fillText('JOURNEY', -32, 53);
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.moveTo(78 + i * 18, -18 + i * 7);
      ctx.bezierCurveTo(110 + i * 18, -28 + i * 7, 135 + i * 18, -7 + i * 7, 168 + i * 18, -18 + i * 7);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPerforation(ctx, c) {
    const x = 1850;
    ctx.save();
    ctx.strokeStyle = '#9EA6AF';
    ctx.lineWidth = 4;
    ctx.setLineDash([14, 17]);
    ctx.beginPath();
    ctx.moveTo(x, 18);
    ctx.lineTo(x, 858);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#F0EDE5';
    ctx.beginPath();
    ctx.arc(x, 18, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, 858, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPhotoSection(ctx, photo, result, c) {
    ctx.fillStyle = '#F7F2E7';
    roundedRect(ctx, 50, 238, 420, 565, 26);
    ctx.fill();

    ctx.save();
    roundedRect(ctx, 78, 260, 365, 405, 24);
    ctx.clip();
    drawCoverImage(ctx, photo, 78, 260, 365, 405);
    ctx.restore();

    ctx.strokeStyle = c.gold;
    ctx.lineWidth = 3;
    roundedRect(ctx, 78, 260, 365, 405, 24);
    ctx.stroke();

    ctx.fillStyle = c.navyDeep;
    ctx.font = '900 24px Arial, Helvetica, sans-serif';
    ctx.fillText('PASSENGER', 80, 713);

    ctx.fillStyle = c.gold;
    ctx.font = '800 16px Arial, Helvetica, sans-serif';
    ctx.fillText('ID', 80, 763);
    drawEmployeeId(ctx, result.employeeId, 126, 758, 23, c.navyDeep);
  }

  function drawMainInformation(ctx, result, c) {
    ctx.fillStyle = c.gold;
    ctx.font = '800 18px Arial, Helvetica, sans-serif';
    ctx.fillText('BOARDING PASS TEMPLATE', 570, 266);

    ctx.fillStyle = c.navyDeep;
    fitText(ctx, result.nickname.toUpperCase(), 570, 334, 930, 58, 34, '900', 'Georgia, Times New Roman, serif');

    ctx.fillStyle = c.muted;
    ctx.font = '800 18px Arial, Helvetica, sans-serif';
    ctx.fillText('EMPLOYEE ID', 570, 392);
    drawEmployeeId(ctx, result.employeeId, 712, 387, 24, c.navyDeep);

    drawInfoCard(ctx, 555, 414, 300, 98, 'GROUP', result.roleLabel, drawGroupIcon, c);
    drawInfoCard(ctx, 875, 414, 300, 98, 'DATE', result.eventDate, drawCalendarIcon, c);
    drawInfoCard(ctx, 1195, 414, 300, 98, 'BOARDING', result.departure, drawClockIcon, c);

    drawRouteCard(ctx, result.route, c);
    drawArrivalCard(ctx, result.arrival, c);
    drawJourneyService(ctx, result, c);
  }

  function drawInfoCard(ctx, x, y, width, height, label, value, iconFn, c) {
    ctx.fillStyle = '#FFFDF8';
    ctx.strokeStyle = c.line;
    ctx.lineWidth = 2;
    roundedRect(ctx, x, y, width, height, 18);
    ctx.fill();
    ctx.stroke();

    iconFn(ctx, x + 44, y + 50, c.gold);

    ctx.fillStyle = c.muted;
    ctx.font = '800 15px Arial, Helvetica, sans-serif';
    ctx.fillText(label, x + 88, y + 32);

    ctx.fillStyle = c.navyDeep;
    fitText(ctx, value, x + 88, y + 72, width - 106, 25, 16, '900', 'Arial, Helvetica, sans-serif');
  }

  function drawRouteCard(ctx, route, c) {
    const parts = splitRoute(route);
    ctx.fillStyle = '#FFFDF8';
    ctx.strokeStyle = c.line;
    ctx.lineWidth = 2;
    roundedRect(ctx, 555, 535, 945, 112, 20);
    ctx.fill();
    ctx.stroke();

    drawRouteIcon(ctx, 605, 590, c.gold);

    ctx.fillStyle = c.gold;
    ctx.font = '800 15px Arial, Helvetica, sans-serif';
    ctx.fillText('ROUTE', 652, 565);

    ctx.fillStyle = c.navyDeep;
    drawWrappedText(ctx, parts[0], 652, 603, 305, 2, 20, 13, 900, 'Arial, Helvetica, sans-serif', 1.2);
    drawPlaneIcon(ctx, 1060, 591, c.gold);
    drawWrappedText(ctx, parts[1], 1140, 603, 300, 2, 20, 13, 900, 'Arial, Helvetica, sans-serif', 1.2);
  }

  function drawArrivalCard(ctx, arrival, c) {
    ctx.fillStyle = '#FFFDF8';
    ctx.strokeStyle = c.line;
    ctx.lineWidth = 2;
    roundedRect(ctx, 1520, 535, 245, 112, 20);
    ctx.fill();
    ctx.stroke();

    drawFlagIcon(ctx, 1565, 591, c.gold);
    ctx.fillStyle = c.muted;
    ctx.font = '800 15px Arial, Helvetica, sans-serif';
    ctx.fillText('ARRIVAL', 1610, 565);
    ctx.fillStyle = c.navyDeep;
    fitText(ctx, arrival, 1610, 607, 125, 30, 18, '900', 'Arial, Helvetica, sans-serif');
  }

  function drawJourneyService(ctx, result, c) {
    ctx.strokeStyle = c.gold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(555, 698);
    ctx.lineTo(845, 698);
    ctx.moveTo(1160, 698);
    ctx.lineTo(1765, 698);
    ctx.stroke();

    ctx.fillStyle = c.gold;
    ctx.font = '900 20px Arial, Helvetica, sans-serif';
    ctx.fillText('✦', 864, 705);
    ctx.fillText('✦', 1134, 705);
    ctx.fillStyle = c.navyDeep;
    ctx.font = '900 24px Arial, Helvetica, sans-serif';
    ctx.fillText('JOURNEY SERVICE', 922, 705);

    ctx.fillStyle = '#FFFDF8';
    ctx.strokeStyle = c.line;
    ctx.lineWidth = 2;
    roundedRect(ctx, 555, 724, 1210, 104, 20);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = c.lineSoft;
    ctx.beginPath();
    ctx.moveTo(920, 742); ctx.lineTo(920, 810);
    ctx.moveTo(1250, 742); ctx.lineTo(1250, 810);
    ctx.stroke();

    const serviceItems = [
      { x: 580, label: 'DRINK', value: result.drink, icon: drawDrinkIcon, maxWidth: 300 },
      { x: 945, label: 'SWEETNESS', value: result.sweetness, icon: drawSweetnessIcon, maxWidth: 260 },
      { x: 1275, label: 'FOOD', value: result.food, icon: drawFoodIcon, maxWidth: 455 }
    ];

    serviceItems.forEach((item) => {
      item.icon(ctx, item.x + 38, 778, c.navyDeep);
      ctx.fillStyle = c.gold;
      ctx.font = '800 15px Arial, Helvetica, sans-serif';
      ctx.fillText(item.label, item.x + 78, 763);
      ctx.fillStyle = c.navyDeep;
      drawWrappedText(ctx, item.value, item.x + 78, 798, item.maxWidth - 80, 2, 18, 12, 800, 'Arial, Helvetica, sans-serif', 1.15);
    });
  }

  function drawStub(ctx, result, c) {
    const x = 1888;
    ctx.fillStyle = c.paper;
    ctx.fillRect(1852, 212, 608, 646);

    ctx.fillStyle = c.navyDeep;
    roundedRect(ctx, x + 24, 246, 310, 58, 14);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 21px Arial, Helvetica, sans-serif';
    ctx.fillText('BOARDING PASS', x + 72, 282);

    ctx.strokeStyle = c.gold;
    ctx.lineWidth = 2;
    roundedRect(ctx, x + 24, 332, 310, 62, 14);
    ctx.stroke();
    ctx.fillStyle = c.gold;
    fitText(ctx, result.ticketId, x + 46, 371, 268, 17, 10, '800', 'Arial, Helvetica, sans-serif');

    ctx.fillStyle = c.gold;
    ctx.font = '800 15px Arial, Helvetica, sans-serif';
    ctx.fillText('PASSENGER', x + 24, 438);
    ctx.fillStyle = c.navyDeep;
    fitText(ctx, result.nickname.toUpperCase(), x + 24, 482, 310, 27, 16, '900', 'Arial, Helvetica, sans-serif');

    ctx.strokeStyle = '#C6CDD5';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(x + 24, 514); ctx.lineTo(x + 334, 514);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = c.gold;
    ctx.font = '800 15px Arial, Helvetica, sans-serif';
    ctx.fillText('ROUTE', x + 24, 556);

    const parts = splitRoute(result.route);
    ctx.fillStyle = c.navyDeep;
    drawWrappedText(ctx, parts[0], x + 24, 597, 310, 2, 19, 12, 900, 'Arial, Helvetica, sans-serif', 1.18);
    drawPlaneIcon(ctx, x + 42, 644, c.gold);
    ctx.fillStyle = c.navyDeep;
    drawWrappedText(ctx, parts[1], x + 66, 655, 268, 2, 19, 12, 900, 'Arial, Helvetica, sans-serif', 1.18);

    ctx.strokeStyle = '#C6CDD5';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(x + 24, 708); ctx.lineTo(x + 334, 708);
    ctx.stroke();
    ctx.setLineDash([]);

    drawBarcode(ctx, x + 20, 730, 340, 72, result.ticketId);

    ctx.fillStyle = c.gold;
    ctx.font = '800 15px Arial, Helvetica, sans-serif';
    ctx.fillText('LEADERSHIP TRANSFORMATION JOURNEY 2026', x + 20, 830);
  }

  function drawFooter(ctx, c) {
    ctx.fillStyle = c.navyDeep;
    ctx.beginPath();
    ctx.moveTo(18, 830);
    ctx.lineTo(1080, 830);
    ctx.lineTo(1140, 858);
    ctx.lineTo(18, 858);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 18px Arial, Helvetica, sans-serif';
    ctx.fillText('LEADERSHIP TRANSFORMATION JOURNEY 2026', 92, 853);

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(1145, 830); ctx.lineTo(1180, 858);
    ctx.moveTo(1174, 830); ctx.lineTo(1209, 858);
    ctx.stroke();

    ctx.strokeStyle = c.gold;
    ctx.beginPath();
    ctx.moveTo(1204, 830); ctx.lineTo(1239, 858);
    ctx.stroke();
  }

  function drawEmployeeId(ctx, value, x, y, fontSize, color) {
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.direction = 'ltr';
    if ('fontKerning' in ctx) ctx.fontKerning = 'none';
    ctx.fillStyle = color;
    ctx.font = `700 ${fontSize}px Arial, Helvetica, sans-serif`;
    ctx.fillText(String(value || ''), Math.round(x), Math.round(y));
    ctx.restore();
  }

  function splitRoute(routeText) {
    const text = String(routeText || '').replace(/\s+/g, ' ').trim();
    const parts = text.split(/\s*(?:→|->|—>|–>)\s*/).map((item) => item.trim()).filter(Boolean);
    if (parts.length >= 2) return [parts[0], parts.slice(1).join(' → ')];
    return [text, ''];
  }

  function drawGroupIcon(ctx, cx, cy, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(cx - 12, cy - 10, 9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 12, cy - 10, 9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy - 18, 10, 0, Math.PI * 2); ctx.fill();
    roundedRect(ctx, cx - 26, cy, 52, 25, 8); ctx.fill();
    ctx.restore();
  }

  function drawCalendarIcon(ctx, cx, cy, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    roundedRect(ctx, cx - 20, cy - 20, 40, 42, 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 20, cy - 8); ctx.lineTo(cx + 20, cy - 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 10, cy - 27); ctx.lineTo(cx - 10, cy - 15); ctx.moveTo(cx + 10, cy - 27); ctx.lineTo(cx + 10, cy - 15); ctx.stroke();
    ctx.fillStyle = color;
    [-10, 0, 10].forEach((dx) => [-1, 10].forEach((dy) => ctx.fillRect(cx + dx - 2, cy + dy - 2, 4, 4)));
    ctx.restore();
  }

  function drawClockIcon(ctx, cx, cy, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(cx, cy, 21, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - 12); ctx.moveTo(cx, cy); ctx.lineTo(cx + 10, cy + 6); ctx.stroke();
    ctx.restore();
  }

  function drawFlagIcon(ctx, cx, cy, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(cx - 10, cy - 24); ctx.lineTo(cx - 10, cy + 25); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 8, cy - 22); ctx.lineTo(cx + 18, cy - 16); ctx.lineTo(cx - 8, cy - 4); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawRouteIcon(ctx, cx, cy, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.moveTo(cx - 22, cy + 12); ctx.bezierCurveTo(cx - 4, cy + 28, cx + 6, cy - 14, cx + 28, cy + 2); ctx.stroke();
    ctx.setLineDash([]);
    [cx - 22, cx + 28].forEach((x) => {
      ctx.beginPath(); ctx.arc(x, cy - 4, 8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - 8, cy - 2); ctx.lineTo(x, cy + 14); ctx.lineTo(x + 8, cy - 2); ctx.closePath(); ctx.fill();
    });
    ctx.restore();
  }

  function drawPlaneIcon(ctx, cx, cy, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.translate(cx, cy);
    ctx.rotate(-0.08);
    ctx.font = '900 34px Arial, Helvetica, sans-serif';
    ctx.fillText('✈', -18, 10);
    ctx.restore();
  }

  function drawDrinkIcon(ctx, cx, cy, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    roundedRect(ctx, cx - 16, cy - 18, 32, 36, 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 20, cy - 22); ctx.lineTo(cx + 20, cy - 22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 10, cy - 28); ctx.lineTo(cx + 14, cy - 28); ctx.stroke();
    ctx.restore();
  }

  function drawSweetnessIcon(ctx, cx, cy, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i += 1) {
      roundedRect(ctx, cx - 18 + i * 12, cy - 10 + (i % 2) * 10, 16, 16, 3); ctx.stroke();
    }
    ctx.restore();
  }

  function drawFoodIcon(ctx, cx, cy, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy + 8, 20, Math.PI, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 23, cy + 8); ctx.lineTo(cx + 23, cy + 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 12, cy); ctx.quadraticCurveTo(cx - 6, cy - 12, cx, cy); ctx.quadraticCurveTo(cx + 7, cy - 14, cx + 13, cy); ctx.stroke();
    ctx.restore();
  }

  function drawBarcode(ctx, x, y, width, height, seed) {
    ctx.fillStyle = '#FFFFFF';
    roundedRect(ctx, x, y, width, height, 10);
    ctx.fill();
    ctx.strokeStyle = '#D6DDE4';
    ctx.lineWidth = 1;
    roundedRect(ctx, x, y, width, height, 10);
    ctx.stroke();

    let cursor = x + 16;
    const end = x + width - 16;
    const text = String(seed || 'CES').split('');
    let index = 0;
    ctx.fillStyle = '#031426';
    while (cursor < end) {
      const code = text[index % text.length].charCodeAt(0);
      const bar = 2 + (code % 6);
      const gap = 2 + ((code >> 2) % 4);
      ctx.fillRect(cursor, y + 10, Math.min(bar, end - cursor), height - 20);
      cursor += bar + gap;
      index += 1;
    }
  }

  function drawWrappedText(ctx, text, x, y, maxWidth, maxLines, fontSize, minSize, weight, family, lineHeightFactor) {
    const value = String(text || '').trim();
    const factor = lineHeightFactor || 1.2;
    let size = fontSize;
    while (size >= minSize) {
      ctx.font = `${weight} ${size}px ${family}`;
      const wrapped = wrapTextLines(ctx, value, maxWidth, maxLines);
      if (wrapped.fits) {
        const lineHeight = size * factor;
        wrapped.lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
        return;
      }
      size -= 1;
    }
    ctx.font = `${weight} ${minSize}px ${family}`;
    const wrapped = wrapTextLines(ctx, value, maxWidth, maxLines);
    const lineHeight = minSize * factor;
    wrapped.lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
  }

  function wrapTextLines(ctx, text, maxWidth, maxLines) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    if (!words.length) return { lines: [''], fits: true };
    const lines = [];
    let current = words[0];
    for (let i = 1; i < words.length; i += 1) {
      const test = `${current} ${words[i]}`;
      if (ctx.measureText(test).width <= maxWidth) current = test;
      else {
        lines.push(current);
        current = words[i];
      }
    }
    lines.push(current);
    if (lines.length <= maxLines) return { lines, fits: true };
    const trimmed = lines.slice(0, maxLines);
    let last = trimmed[maxLines - 1];
    while (last.length && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1).trim();
    trimmed[maxLines - 1] = `${last}…`;
    return { lines: trimmed, fits: false };
  }

  function fitText(ctx, text, x, y, maxWidth, initialSize, minSize, weight, family) {
    let size = initialSize;
    const value = String(text || '');
    while (size > minSize) {
      ctx.font = `${weight} ${size}px ${family}`;
      if (ctx.measureText(value).width <= maxWidth) break;
      size -= 1;
    }
    ctx.fillText(value, x, y);
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function drawCoverImage(ctx, image, x, y, width, height) {
    const ratio = Math.max(width / image.width, height / image.height);
    const drawWidth = image.width * ratio;
    const drawHeight = image.height * ratio;
    ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
  }

  function drawContainImage(ctx, image, x, y, width, height) {
    const ratio = Math.min(width / image.width, height / image.height);
    const drawWidth = image.width * ratio;
    const drawHeight = image.height * ratio;
    ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      if (!src) {
        reject(new Error('ไม่พบแหล่งรูปภาพ'));
        return;
      }
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('โหลดรูปสำหรับ Boarding Pass ไม่สำเร็จ'));
      image.src = src;
    });
  }

  function loadImageWithTimeout(src, timeoutMs) {
    return Promise.race([
      loadImage(src),
      new Promise((_, reject) => setTimeout(() => reject(new Error('โหลดรูปสำหรับ Boarding Pass นานเกินกำหนด')), timeoutMs))
    ]);
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
      for (let i = 0; i < bytes.length; i += 0x8000) {
        output += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      }
      return `${parts[0]},${btoa(output)}`;
    } catch (error) {
      return dataUrl;
    }
  }

  global.BoardingPassGenerator = Object.freeze({ generate });
})(window);
