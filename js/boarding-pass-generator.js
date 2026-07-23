(function (global) {
  'use strict';

  const BASE = Object.freeze({
    width: 2480,
    height: 877,
    dpi: 300,
    jpegQuality: 0.78,
    splitX: 1850,
    colors: Object.freeze({
      navy: '#092A50',
      navyDeep: '#041A33',
      navyMid: '#123F70',
      gold: '#C8A24B',
      goldLight: '#E6D4AA',
      cream: '#F7F2E8',
      paper: '#FFFDF8',
      ink: '#0A2B52',
      muted: '#6B7480',
      line: '#D9CBAA',
      lineSoft: '#E9E1D1',
      white: '#FFFFFF'
    })
  });

  async function generate(options) {
    const input = normalizeResult(options && options.result);
    const photoData = options && options.photoData;
    const config = options && options.config ? options.config : {};
    const exportConfig = config.export || {};
    const targetWidth = Number(exportConfig.widthPx || BASE.width);
    const targetHeight = Number(exportConfig.heightPx || BASE.height);
    const dpi = Number(exportConfig.dpi || BASE.dpi);
    const timeoutMs = Number(config.generationTimeoutMs || 12000);

    if (!photoData) throw new Error('ไม่พบรูปผู้เข้าร่วมสำหรับ Boarding Pass');

    const [photo, logo] = await Promise.all([
      loadImageWithTimeout(photoData, timeoutMs),
      loadImageWithTimeout(config.logoUrl, timeoutMs).catch(() => null)
    ]);

    const baseCanvas = document.createElement('canvas');
    baseCanvas.width = BASE.width;
    baseCanvas.height = BASE.height;
    const ctx = baseCanvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('อุปกรณ์นี้ไม่รองรับ Canvas สำหรับสร้าง Boarding Pass');

    drawTicket(ctx, input, photo, logo, BASE.colors);

    let outputCanvas = baseCanvas;
    if (targetWidth !== BASE.width || targetHeight !== BASE.height) {
      outputCanvas = document.createElement('canvas');
      outputCanvas.width = targetWidth;
      outputCanvas.height = targetHeight;
      const outputCtx = outputCanvas.getContext('2d', { alpha: false });
      outputCtx.fillStyle = '#FFFFFF';
      outputCtx.fillRect(0, 0, targetWidth, targetHeight);
      const scale = Math.min(targetWidth / BASE.width, targetHeight / BASE.height);
      const drawWidth = BASE.width * scale;
      const drawHeight = BASE.height * scale;
      outputCtx.drawImage(baseCanvas, (targetWidth - drawWidth) / 2, (targetHeight - drawHeight) / 2, drawWidth, drawHeight);
    }

    return setJpegDpiMetadata(outputCanvas.toDataURL('image/jpeg', BASE.jpegQuality), dpi);
  }

  function normalizeResult(result) {
    const value = result || {};
    const selections = value.selections || {};
    const isManager = value.role === 'AM_MNG';
    return {
      ticketId: safeString(value.ticketId, 'CES26-LDR-000000-XXXXXX'),
      employeeId: safeString(value.employeeId, '-'),
      nickname: safeString(value.nickname, 'PASSENGER'),
      roleLabel: safeString(value.roleLabel, '-'),
      eventDate: safeString(value.eventDate, '-'),
      departure: safeString(value.departure, '-'),
      arrival: safeString(value.arrival, '-'),
      routeFrom: 'FAVE CASUAL DINING AND WORKING SPACE',
      routeTo: 'WAKE UP - CAFE AND RESTAURANT',
      drink: safeString(isManager ? selections.morningDrink : selections.afternoonDrink, '-'),
      sweetness: safeString(isManager ? selections.morningSweetness : selections.afternoonSweetness, '-'),
      food: safeString(isManager ? selections.breakfastFood : 'AFTERNOON BREAK', '-')
    };
  }

  function safeString(value, fallback) {
    const text = String(value == null ? '' : value).trim();
    return text || fallback;
  }

  function drawTicket(ctx, data, photo, logo, c) {
    drawOuterPaper(ctx, c);
    drawHeader(ctx, logo, c);
    drawPerforation(ctx, c);
    drawPhotoPanel(ctx, data, photo, c);
    drawPassengerInformation(ctx, data, c);
    drawRoutePanel(ctx, data, c);
    drawJourneyService(ctx, data, c);
    drawStub(ctx, data, c);
    drawFooter(ctx, c);
  }

  function drawOuterPaper(ctx, c) {
    ctx.fillStyle = '#EEEAE1';
    ctx.fillRect(0, 0, BASE.width, BASE.height);

    ctx.save();
    ctx.shadowColor = 'rgba(4, 26, 51, 0.18)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = c.paper;
    roundedRect(ctx, 16, 16, 2448, 845, 38);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = c.gold;
    ctx.lineWidth = 2;
    roundedRect(ctx, 16, 16, 2448, 845, 38);
    ctx.stroke();

    drawSubtleMap(ctx, c);
  }

  function drawHeader(ctx, logo, c) {
    const header = ctx.createLinearGradient(20, 20, 2460, 190);
    header.addColorStop(0, c.navyDeep);
    header.addColorStop(0.67, c.navy);
    header.addColorStop(1, '#061F3C');
    ctx.fillStyle = header;
    roundedRect(ctx, 20, 20, 2440, 188, 34);
    ctx.fill();
    ctx.fillRect(20, 112, 2440, 96);

    ctx.strokeStyle = c.gold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, 208);
    ctx.lineTo(2460, 208);
    ctx.stroke();

    if (logo) {
      ctx.save();
      ctx.fillStyle = c.white;
      ctx.beginPath();
      ctx.arc(100, 101, 62, 0, Math.PI * 2);
      ctx.fill();
      ctx.clip();
      drawContainImage(ctx, logo, 42, 43, 116, 116);
      ctx.restore();
      ctx.strokeStyle = c.goldLight;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(100, 101, 62, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = c.goldLight;
    ctx.font = font(20, 800, 'Arial, Helvetica, sans-serif');
    ctx.fillText('CES • LEADERSHIP TRANSFORMATION JOURNEY', 195, 64);

    ctx.fillStyle = c.white;
    ctx.font = font(51, 900, 'Georgia, Times New Roman, serif');
    ctx.fillText('JOURNEY CHECK-IN', 195, 133);

    ctx.fillStyle = c.goldLight;
    ctx.font = font(16, 700, 'Arial, Helvetica, sans-serif');
    ctx.fillText('REFLECT • CONNECT • INSPIRE', 198, 174);

    drawPlaneTrail(ctx, 1335, 77, c);
    drawBoardingBadge(ctx, 1970, 50, c);
  }

  function drawPlaneTrail(ctx, x, y, c) {
    ctx.save();
    ctx.strokeStyle = 'rgba(230, 212, 170, 0.34)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 11]);
    ctx.beginPath();
    ctx.moveTo(x + 65, y + 22);
    ctx.bezierCurveTo(x + 210, y - 45, x + 275, y + 95, x + 430, y + 35);
    ctx.bezierCurveTo(x + 520, y + 4, x + 620, y + 85, x + 710, y + 46);
    ctx.stroke();
    ctx.setLineDash([]);
    drawPlaneIcon(ctx, x, y, 1.35, c.goldLight, -0.30);
    ctx.restore();
  }

  function drawBoardingBadge(ctx, x, y, c) {
    const width = 365;
    const height = 62;
    ctx.strokeStyle = c.gold;
    ctx.lineWidth = 2;
    roundedRect(ctx, x, y, width, height, 15);
    ctx.stroke();

    ctx.fillStyle = c.gold;
    ctx.beginPath();
    ctx.moveTo(x + width - 92, y + 1);
    ctx.lineTo(x + width - 1, y + 1);
    ctx.lineTo(x + width - 1, y + height - 1);
    ctx.lineTo(x + width - 124, y + height - 1);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = c.goldLight;
    ctx.font = font(18, 900, 'Arial, Helvetica, sans-serif');
    ctx.fillText('BOARDING PASS', x + 24, y + 40);
    drawPlaneIcon(ctx, x + width - 70, y + 31, 0.58, c.navyDeep, 0);
  }

  function drawPhotoPanel(ctx, data, photo, c) {
    ctx.fillStyle = '#F6F1E8';
    roundedRect(ctx, 48, 236, 415, 570, 26);
    ctx.fill();

    ctx.save();
    roundedRect(ctx, 76, 258, 360, 405, 23);
    ctx.clip();
    drawCoverImage(ctx, photo, 76, 258, 360, 405);
    ctx.restore();

    ctx.strokeStyle = c.gold;
    ctx.lineWidth = 3;
    roundedRect(ctx, 76, 258, 360, 405, 23);
    ctx.stroke();

    ctx.fillStyle = c.ink;
    ctx.font = font(22, 900, 'Arial, Helvetica, sans-serif');
    ctx.fillText('PASSENGER', 78, 710);

    drawIdCardIcon(ctx, 77, 741, 0.66, c.gold);
    ctx.fillStyle = c.muted;
    ctx.font = font(15, 800, 'Arial, Helvetica, sans-serif');
    ctx.fillText('EMPLOYEE ID', 116, 758);
    drawEmployeeId(ctx, data.employeeId, 247, 757, 21, c.ink);
  }

  function drawPassengerInformation(ctx, data, c) {
    ctx.fillStyle = c.gold;
    ctx.font = font(16, 800, 'Arial, Helvetica, sans-serif');
    ctx.fillText('BOARDING PASS TEMPLATE', 535, 265);

    ctx.fillStyle = c.ink;
    const nicknameFamily = containsThai(data.nickname)
      ? 'Tahoma, Arial, sans-serif'
      : 'Georgia, Times New Roman, serif';
    fitText(ctx, data.nickname.toUpperCase(), 535, 326, 875, 49, 29, 900, nicknameFamily);

    ctx.fillStyle = c.muted;
    ctx.font = font(16, 800, 'Arial, Helvetica, sans-serif');
    ctx.fillText('EMPLOYEE ID', 536, 372);
    drawEmployeeId(ctx, data.employeeId, 665, 371, 21, c.ink);

    drawInfoCard(ctx, 530, 394, 285, 96, 'GROUP', data.roleLabel, 'group', c);
    drawInfoCard(ctx, 830, 394, 285, 96, 'DATE', data.eventDate, 'calendar', c);
    drawInfoCard(ctx, 1130, 394, 285, 96, 'BOARDING', data.departure, 'clock', c);
  }

  function drawInfoCard(ctx, x, y, width, height, label, value, icon, c) {
    ctx.fillStyle = c.paper;
    ctx.strokeStyle = c.line;
    ctx.lineWidth = 2;
    roundedRect(ctx, x, y, width, height, 17);
    ctx.fill();
    ctx.stroke();

    const iconX = x + 42;
    const iconY = y + 51;
    drawIconByName(ctx, icon, iconX, iconY, 0.75, c.gold);

    ctx.fillStyle = c.muted;
    ctx.font = font(14, 800, 'Arial, Helvetica, sans-serif');
    ctx.fillText(label, x + 82, y + 32);

    ctx.fillStyle = c.ink;
    fitText(ctx, value, x + 82, y + 68, width - 98, 22, 14, 900, 'Arial, Helvetica, sans-serif');
  }

  function drawRoutePanel(ctx, data, c) {
    ctx.fillStyle = c.paper;
    ctx.strokeStyle = c.line;
    ctx.lineWidth = 2;
    roundedRect(ctx, 530, 515, 890, 118, 18);
    ctx.fill();
    ctx.stroke();

    drawPinIcon(ctx, 568, 574, 0.85, c.gold);
    ctx.fillStyle = c.gold;
    ctx.font = font(14, 800, 'Arial, Helvetica, sans-serif');
    ctx.fillText('ROUTE', 602, 548);

    ctx.fillStyle = c.ink;
    drawWrappedText(ctx, data.routeFrom, 602, 579, 318, 2, 18, 13, 900, 'Arial, Helvetica, sans-serif', 1.18);
    drawPlaneIcon(ctx, 1020, 575, 0.75, c.gold, 0);
    drawWrappedText(ctx, data.routeTo, 1090, 579, 292, 2, 18, 13, 900, 'Arial, Helvetica, sans-serif', 1.18);

    ctx.fillStyle = c.paper;
    ctx.strokeStyle = c.line;
    roundedRect(ctx, 1435, 515, 275, 118, 18);
    ctx.fill();
    ctx.stroke();

    drawFlagIcon(ctx, 1474, 574, 0.8, c.gold);
    ctx.fillStyle = c.muted;
    ctx.font = font(14, 800, 'Arial, Helvetica, sans-serif');
    ctx.fillText('ARRIVAL', 1520, 548);
    ctx.fillStyle = c.ink;
    fitText(ctx, data.arrival, 1520, 588, 160, 28, 18, 900, 'Arial, Helvetica, sans-serif');
  }

  function drawJourneyService(ctx, data, c) {
    ctx.strokeStyle = c.gold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(530, 684);
    ctx.lineTo(782, 684);
    ctx.moveTo(1144, 684);
    ctx.lineTo(1710, 684);
    ctx.stroke();

    drawDiamond(ctx, 808, 684, 8, c.gold);
    drawDiamond(ctx, 1121, 684, 8, c.gold);
    ctx.fillStyle = c.ink;
    ctx.font = font(25, 900, 'Arial, Helvetica, sans-serif');
    ctx.fillText('JOURNEY SERVICE', 844, 692);

    ctx.fillStyle = c.paper;
    ctx.strokeStyle = c.line;
    roundedRect(ctx, 530, 704, 1180, 126, 18);
    ctx.fill();
    ctx.stroke();

    drawServiceBox(ctx, {
      x: 546, y: 720, w: 310, h: 96,
      label: 'DRINK', value: data.drink,
      icon: () => drawCupIcon(ctx, 580, 765, 0.70, c.navyMid),
      valueWidth: 220,
      fontSize: 20,
      minSize: 14
    }, c);

    drawServiceBox(ctx, {
      x: 874, y: 720, w: 252, h: 96,
      label: 'SWEETNESS', value: data.sweetness,
      icon: () => drawSugarIcon(ctx, 908, 765, 0.68, c.navyMid),
      valueWidth: 150,
      fontSize: 20,
      minSize: 14
    }, c);

    drawServiceBox(ctx, {
      x: 1144, y: 720, w: 548, h: 96,
      label: 'FOOD', value: data.food,
      icon: () => drawFoodIcon(ctx, 1178, 765, 0.68, c.navyMid),
      valueWidth: 448,
      fontSize: 20,
      minSize: 13,
      multiLine: true
    }, c);
  }

  function drawServiceBox(ctx, options, c) {
    ctx.fillStyle = '#FFFEFB';
    ctx.strokeStyle = c.lineSoft;
    ctx.lineWidth = 2;
    roundedRect(ctx, options.x, options.y, options.w, options.h, 14);
    ctx.fill();
    ctx.stroke();

    options.icon();

    ctx.fillStyle = c.gold;
    ctx.font = font(13, 800, 'Arial, Helvetica, sans-serif');
    ctx.fillText(options.label, options.x + 62, options.y + 25);

    ctx.fillStyle = c.ink;
    if (options.multiLine) {
      drawWrappedText(
        ctx,
        options.value,
        options.x + 62,
        options.y + 56,
        options.valueWidth,
        2,
        options.fontSize,
        options.minSize,
        800,
        'Tahoma, Arial, sans-serif',
        1.22
      );
    } else {
      fitText(
        ctx,
        options.value,
        options.x + 62,
        options.y + 58,
        options.valueWidth,
        options.fontSize,
        options.minSize,
        800,
        'Tahoma, Arial, sans-serif'
      );
    }
  }

  function drawStub(ctx, data, c) {
    const x = 1885;

    ctx.fillStyle = c.paper;
    ctx.fillRect(BASE.splitX + 3, 210, 590, 640);

    ctx.fillStyle = c.navyDeep;
    roundedRect(ctx, x, 252, 318, 56, 14);
    ctx.fill();
    ctx.fillStyle = c.white;
    ctx.font = font(20, 900, 'Arial, Helvetica, sans-serif');
    ctx.fillText('BOARDING PASS', x + 42, 287);

    ctx.strokeStyle = c.gold;
    ctx.lineWidth = 2;
    roundedRect(ctx, x, 331, 318, 60, 13);
    ctx.stroke();
    ctx.fillStyle = c.gold;
    fitText(ctx, data.ticketId, x + 18, 368, 282, 15, 10, 800, 'Arial, Helvetica, sans-serif');

    ctx.fillStyle = c.gold;
    ctx.font = font(13, 800, 'Arial, Helvetica, sans-serif');
    ctx.fillText('PASSENGER', x, 432);
    ctx.fillStyle = c.ink;
    fitText(ctx, data.nickname.toUpperCase(), x, 470, 320, 24, 15, 900, containsThai(data.nickname) ? 'Tahoma, Arial, sans-serif' : 'Arial, Helvetica, sans-serif');

    ctx.strokeStyle = '#BFC5CC';
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 7]);
    ctx.beginPath();
    ctx.moveTo(x, 492); ctx.lineTo(x + 318, 492);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = c.gold;
    ctx.font = font(13, 800, 'Arial, Helvetica, sans-serif');
    ctx.fillText('ROUTE', x, 530);
    ctx.fillStyle = c.ink;
    drawWrappedText(ctx, data.routeFrom, x, 560, 318, 2, 17, 12, 900, 'Arial, Helvetica, sans-serif', 1.14);
    drawPlaneIcon(ctx, x + 12, 617, 0.45, c.gold, 0);
    drawWrappedText(ctx, data.routeTo, x + 40, 618, 278, 2, 17, 12, 900, 'Arial, Helvetica, sans-serif', 1.14);

    ctx.strokeStyle = '#BFC5CC';
    ctx.setLineDash([7, 7]);
    ctx.beginPath();
    ctx.moveTo(x, 664); ctx.lineTo(x + 318, 664);
    ctx.stroke();
    ctx.setLineDash([]);

    drawBarcode(ctx, x, 690, 332, 80, data.ticketId, c);
    ctx.fillStyle = c.gold;
    ctx.font = font(12, 800, 'Arial, Helvetica, sans-serif');
    ctx.fillText('LEADERSHIP TRANSFORMATION JOURNEY 2026', x, 806);
  }

  function drawPerforation(ctx, c) {
    const x = BASE.splitX;
    ctx.save();
    ctx.strokeStyle = '#969FA9';
    ctx.lineWidth = 4;
    ctx.setLineDash([13, 17]);
    ctx.beginPath();
    ctx.moveTo(x, 20);
    ctx.lineTo(x, 858);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#EEEAE1';
    ctx.beginPath(); ctx.arc(x, 17, 18, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x, 860, 18, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawFooter(ctx, c) {
    ctx.fillStyle = c.navyDeep;
    ctx.beginPath();
    ctx.moveTo(20, 827);
    ctx.lineTo(1120, 827);
    ctx.lineTo(1170, 860);
    ctx.lineTo(20, 860);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = c.white;
    ctx.font = font(15, 800, 'Arial, Helvetica, sans-serif');
    ctx.fillText('LEADERSHIP TRANSFORMATION JOURNEY 2026', 72, 851);

    ctx.strokeStyle = c.white;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(1175, 827); ctx.lineTo(1215, 860);
    ctx.moveTo(1200, 827); ctx.lineTo(1240, 860);
    ctx.stroke();
    ctx.strokeStyle = c.gold;
    ctx.beginPath();
    ctx.moveTo(1232, 827); ctx.lineTo(1272, 860);
    ctx.stroke();
  }

  function drawSubtleMap(ctx, c) {
    ctx.save();
    ctx.globalAlpha = 0.045;
    ctx.strokeStyle = c.gold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(250, 720, 180, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath();
      ctx.ellipse(250, 720, 180 - Math.abs(i) * 35, 180, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(250, 720, 180, 180 - Math.abs(i) * 35, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(2140, 525, 160, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // ---------- Custom vector icons: no emoji/font glyph dependency ----------

  function drawIconByName(ctx, name, x, y, scale, color) {
    if (name === 'group') return drawGroupIcon(ctx, x, y, scale, color);
    if (name === 'calendar') return drawCalendarIcon(ctx, x, y, scale, color);
    if (name === 'clock') return drawClockIcon(ctx, x, y, scale, color);
  }

  function drawGroupIcon(ctx, x, y, s, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, -14, 10, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-20, -9, 8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(20, -9, 8, 0, Math.PI * 2); ctx.fill();
    roundedRect(ctx, -16, 2, 32, 25, 7); ctx.fill();
    roundedRect(ctx, -34, 5, 16, 20, 5); ctx.fill();
    roundedRect(ctx, 18, 5, 16, 20, 5); ctx.fill();
    ctx.restore();
  }

  function drawCalendarIcon(ctx, x, y, s, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    roundedRect(ctx, -27, -24, 54, 51, 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-27, -9); ctx.lineTo(27, -9); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-15, -31); ctx.lineTo(-15, -16); ctx.moveTo(15, -31); ctx.lineTo(15, -16); ctx.stroke();
    ctx.fillStyle = color;
    [-15, 0, 15].forEach((dx) => [-1, 13].forEach((dy) => ctx.fillRect(dx - 3, dy - 3, 6, 6)));
    ctx.restore();
  }

  function drawClockIcon(ctx, x, y, s, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, 27, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -15); ctx.moveTo(0, 0); ctx.lineTo(13, 8); ctx.stroke();
    ctx.restore();
  }

  function drawIdCardIcon(ctx, x, y, s, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    roundedRect(ctx, -24, -17, 48, 34, 4); ctx.stroke();
    ctx.beginPath(); ctx.arc(-10, -3, 5, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(-10, 10, 8, Math.PI, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2, -6); ctx.lineTo(17, -6); ctx.moveTo(2, 3); ctx.lineTo(17, 3); ctx.moveTo(2, 12); ctx.lineTo(13, 12); ctx.stroke();
    ctx.restore();
  }

  function drawPinIcon(ctx, x, y, s, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 28);
    ctx.bezierCurveTo(-18, 7, -22, -4, -22, -13);
    ctx.arc(0, -13, 22, Math.PI, 0);
    ctx.bezierCurveTo(22, -4, 18, 7, 0, 28);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(0, -13, 7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawPlaneIcon(ctx, x, y, s, color, rotation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation || 0);
    ctx.scale(s, s);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(40, 0);
    ctx.lineTo(8, -5);
    ctx.lineTo(-8, -28);
    ctx.lineTo(-17, -28);
    ctx.lineTo(-11, -5);
    ctx.lineTo(-30, -4);
    ctx.lineTo(-39, -13);
    ctx.lineTo(-45, -13);
    ctx.lineTo(-41, 0);
    ctx.lineTo(-45, 13);
    ctx.lineTo(-39, 13);
    ctx.lineTo(-30, 4);
    ctx.lineTo(-11, 5);
    ctx.lineTo(-17, 28);
    ctx.lineTo(-8, 28);
    ctx.lineTo(8, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawFlagIcon(ctx, x, y, s, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-15, 28); ctx.lineTo(-15, -29); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-12, -27); ctx.lineTo(25, -18); ctx.lineTo(-12, -7); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawCupIcon(ctx, x, y, s, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    roundedRect(ctx, -21, -18, 42, 45, 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-27, -25); ctx.lineTo(27, -25); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-14, -32); ctx.lineTo(15, -32); ctx.stroke();
    ctx.restore();
  }

  function drawSugarIcon(ctx, x, y, s, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    drawCube(ctx, -18, 2, 18); drawCube(ctx, 3, 2, 18); drawCube(ctx, -7, -17, 18);
    ctx.restore();
  }

  function drawCube(ctx, x, y, size) {
    roundedRect(ctx, x, y, size, size, 3); ctx.stroke();
  }

  function drawFoodIcon(ctx, x, y, s, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 12, 25, Math.PI, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-30, 12); ctx.lineTo(30, 12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-17, 1); ctx.quadraticCurveTo(-9, -12, 0, 0); ctx.quadraticCurveTo(9, -12, 17, 1); ctx.stroke();
    ctx.restore();
  }

  function drawDiamond(ctx, x, y, size, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x - size, y);
    ctx.closePath();
    ctx.fill();
  }

  function drawBarcode(ctx, x, y, width, height, seed, c) {
    ctx.fillStyle = c.white;
    ctx.strokeStyle = c.line;
    ctx.lineWidth = 2;
    roundedRect(ctx, x, y, width, height, 10);
    ctx.fill();
    ctx.stroke();

    const text = String(seed || 'CES');
    const left = x + 12;
    const right = x + width - 12;
    let cursor = left;
    let index = 0;
    ctx.fillStyle = c.navyDeep;
    while (cursor < right) {
      const code = text.charCodeAt(index % text.length);
      const barWidth = 2 + (code % 5);
      const gap = 2 + ((code >> 3) % 4);
      ctx.fillRect(cursor, y + 10, Math.min(barWidth, right - cursor), height - 20);
      cursor += barWidth + gap;
      index += 1;
    }
  }

  // ---------- text / image / geometry helpers ----------

  function drawEmployeeId(ctx, value, x, y, size, color) {
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.direction = 'ltr';
    if ('fontKerning' in ctx) ctx.fontKerning = 'none';
    ctx.fillStyle = color;
    ctx.font = font(size, 700, 'Arial, Helvetica, sans-serif');
    ctx.fillText(String(value || ''), Math.round(x), Math.round(y));
    ctx.restore();
  }

  function fitText(ctx, text, x, y, maxWidth, initialSize, minSize, weight, family) {
    let size = initialSize;
    const value = String(text || '');
    while (size > minSize) {
      ctx.font = font(size, weight, family);
      if (ctx.measureText(value).width <= maxWidth) break;
      size -= 1;
    }
    ctx.fillText(value, x, y);
  }

  function drawWrappedText(ctx, text, x, y, maxWidth, maxLines, initialSize, minSize, weight, family, lineHeightFactor) {
    const value = String(text || '').trim();
    const factor = Number(lineHeightFactor || 1.2);
    let size = initialSize;
    while (size >= minSize) {
      ctx.font = font(size, weight, family);
      const wrapped = wrapTextLines(ctx, value, maxWidth, maxLines);
      if (wrapped.fits) {
        wrapped.lines.forEach((line, index) => ctx.fillText(line, x, y + index * size * factor));
        return;
      }
      size -= 1;
    }
    ctx.font = font(minSize, weight, family);
    const wrapped = wrapTextLines(ctx, value, maxWidth, maxLines);
    wrapped.lines.forEach((line, index) => ctx.fillText(line, x, y + index * minSize * factor));
  }

  function wrapTextLines(ctx, text, maxWidth, maxLines) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    if (!words.length) return { lines: [''], fits: true };
    const lines = [];
    let current = words[0];
    for (let i = 1; i < words.length; i += 1) {
      const test = current + ' ' + words[i];
      if (ctx.measureText(test).width <= maxWidth) current = test;
      else { lines.push(current); current = words[i]; }
    }
    lines.push(current);
    if (lines.length <= maxLines) return { lines, fits: true };

    const clipped = lines.slice(0, maxLines);
    let last = clipped[maxLines - 1];
    while (last.length && ctx.measureText(last + '…').width > maxWidth) last = last.slice(0, -1).trim();
    clipped[maxLines - 1] = last + '…';
    return { lines: clipped, fits: false };
  }

  function font(size, weight, family) {
    return String(weight) + ' ' + String(size) + 'px ' + family;
  }

  function containsThai(text) {
    return /[\u0E00-\u0E7F]/.test(String(text || ''));
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

  function loadImageWithTimeout(src, timeoutMs) {
    return Promise.race([
      loadImage(src),
      new Promise((_, reject) => setTimeout(() => reject(new Error('โหลดรูปสำหรับ Boarding Pass นานเกินกำหนด')), timeoutMs))
    ]);
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('โหลดรูปสำหรับ Boarding Pass ไม่สำเร็จ'));
      image.src = src;
    });
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
          bytes[i + 6] === 0x49 && bytes[i + 7] === 0x46 && bytes[i + 8] === 0;
        if (!isJfif) continue;
        const density = Math.max(1, Math.min(65535, Math.round(dpi)));
        bytes[i + 11] = 1;
        bytes[i + 12] = (density >> 8) & 0xFF;
        bytes[i + 13] = density & 0xFF;
        bytes[i + 14] = (density >> 8) & 0xFF;
        bytes[i + 15] = density & 0xFF;
        break;
      }
      let output = '';
      for (let offset = 0; offset < bytes.length; offset += 0x8000) {
        output += String.fromCharCode.apply(null, bytes.subarray(offset, offset + 0x8000));
      }
      return parts[0] + ',' + btoa(output);
    } catch (error) {
      return dataUrl;
    }
  }

  global.BoardingPassGenerator = Object.freeze({ generate });
})(window);
