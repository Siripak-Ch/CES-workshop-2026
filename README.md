# Frontend — GitHub Pages

หน้าเว็บ Responsive สำหรับ Check-in สร้าง Boarding Pass JPEG และสั่งพิมพ์ลง A4

## ผลลัพธ์ Boarding Pass

- รูปแบบ: JPEG
- ขนาดภาพ: **2480 × 877 px**
- Metadata: **300 DPI**
- ขนาดจริง: **21 × 7.425 ซม. แนวนอน**
- Print: **A4 Landscape** วางกลางหน้าแบบ Actual Size

Frontend ใช้ Canvas สร้าง JPEG โดยตรง จึงไม่ต้องพึ่ง html2canvas หรือไลบรารีภายนอกสำหรับการ Export

## โครงสร้าง

```text
frontend-github/
├─ index.html
├─ 404.html
├─ .nojekyll
├─ assets/
│  ├─ css/styles.css
│  └─ js/
│     ├─ config.js
│     ├─ config.example.js
│     ├─ backend-client.js
│     └─ app.js
└─ .github/workflows/pages.yml
```

## 1. ตั้งค่า Frontend

เปิด `assets/js/config.js` แล้วใส่ Apps Script `/exec` URL:

```javascript
window.CES_APP_CONFIG = Object.freeze({
  backendUrl: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
  channel: 'CES_BOARDING_PASS_V1',
  connectTimeoutMs: 15000,
  requestTimeoutMs: 60000
});
```

ข้อสำคัญ:

- ใช้ `/exec` ไม่ใช่ `/dev`
- `channel` ต้องตรงกับ Backend
- Backend `allowedOrigins` ต้องมี `https://YOUR_GITHUB_USERNAME.github.io`

## 2. ทดสอบบนเครื่อง

```bash
python -m http.server 5500
```

เปิด `http://localhost:5500`

## 3. อัปโหลดขึ้น GitHub

```bash
git init
git add .
git commit -m "Add CES JPEG boarding pass"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

Repository → **Settings → Pages** → Source: **GitHub Actions**

## 4. วิธี Export ของผู้ใช้

หลังยืนยัน Check-in ระบบจะ:

1. สร้างภาพ Boarding Pass จาก Canvas
2. แสดง Preview จาก JPEG จริง
3. บันทึก JPEG ลง Google Drive ผ่าน Apps Script
4. แสดงปุ่มเปิดไฟล์ใน Drive
5. ให้ดาวน์โหลด JPEG ลงเครื่อง
6. ให้พิมพ์ A4 แนวนอน

ตอนพิมพ์ ให้เลือก:

- Paper: A4
- Orientation: Landscape
- Scale: 100% / Actual size
- Margins: None หรือ Default โดยห้ามเลือก Fit to page
