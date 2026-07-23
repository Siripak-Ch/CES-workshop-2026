# CES Boarding Pass v9 — Template & Mobile Photo Fix

เวอร์ชันนี้ปรับตาม Google Slides / PowerPoint Template **Journey Check-in** ที่แนบมา โดย Template ต้นฉบับประกอบด้วยช่อง Passenger, Employee ID, Group, Date, Boarding, Route, Arrival, Journey Service และ Boarding Pass stub.

## อัปเดต
- ใช้ Boarding Pass Template ตามไฟล์แนบและปรับขนาด Output เป็น **21 × 7.425 ซม. / 2480 × 877 px / 300 DPI**
- เพิ่มปุ่มแยก **ถ่ายรูปใหม่** และ **เลือกจากอัลบั้ม / ไฟล์**
- รูปอาหารและเครื่องดื่มใช้ `object-fit: contain` เพื่อไม่ถูกยืดหรือ crop
- แยกเมนูเครื่องดื่มช่วงเช้าและช่วงบ่ายตามตารางล่าสุด
- แสดงชื่อและที่อยู่ Fave / Wake Up แบบเต็ม
- เพิ่ม Timeout และ Template fallback เพื่อไม่ให้ค้างตอนสร้าง Boarding Pass

## Template Files
- `boarding-pass-template/Journey_Check-in_Source_Template.pptx` — ไฟล์ต้นฉบับที่ผู้ใช้อัปโหลด
- `boarding-pass-template/Journey_Check-in_Template_21x7.425cm.pptx` — เวอร์ชันขนาดสำหรับพิมพ์
- `frontend-github/assets/images/boarding-pass-template.png` — Background ที่ Web App ใช้จริง

## Deploy
1. นำ `frontend-github/` ทั้งหมดขึ้น GitHub root
2. นำไฟล์ใน `backend-appscript/src/` ไปแทนใน Apps Script
3. รัน `applyDefaultConfigToScriptProperties()`
4. รัน `setupProject()`
5. Deploy → Manage deployments → Edit → New version → Deploy
