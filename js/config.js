/** CES Boarding Pass v11 public frontend configuration. */
window.CES_APP_CONFIG = Object.freeze({
  backendUrl: 'https://script.google.com/macros/s/AKfycby9OLRUG2SoRYdTW35fzhxH4_lqcuM60KGdClqrqkAQ66cFu3I7swUD1PchhkB8GRjbyg/exec',
  channel: 'CES_BOARDING_PASS_FORM_V4',
  requestTimeoutMs: 120000,
  pollIntervalMs: 700,
  generationTimeoutMs: 12000,
  driveFolderUrl: 'https://drive.google.com/drive/folders/16avdTExhV5kFuzbfGpk9plzRqq9OAJ_g',
  logoUrl: 'assets/images/workshop-passport-logo.png',
  export: { mimeType: 'image/jpeg', widthCm: 21, heightCm: 7.425, widthPx: 2480, heightPx: 877, dpi: 300 },
  event: {
    name: 'Leadership Transformation Journey 2026', dateISO: '2026-07-31', dateDisplay: '31 JUL 2026', dateThai: '31 กรกฎาคม 2569',
    theme: 'Reflect • Connect • Inspire • Appreciate',
    dressCode: 'Cozy Journey & Nature — ขาว ครีม เบจ น้ำตาลอ่อน Sage หรือ Olive',
    showDinnerForStaff: true,
    morningLocation: {
      label: 'MORNING / AFTERNOON',
      name: 'Fave Casual Dining and Working Space',
      time: '09:30–17:00',
      address: 'ซอยรัชดาภิเษก 32 แยก 2 (ด้านหลังมหาวิทยาลัยราชภัฏจันทรเกษม) แขวงจันทรเกษม เขตจตุจักร กรุงเทพมหานคร',
      mapUrl: 'https://maps.app.goo.gl/GbaLX3xW7fM8seFM6', image: 'assets/images/location-fave.png'
    },
    dinnerLocation: {
      label: 'DINNER',
      name: 'Wake Up - Cafe and Restaurant',
      time: '18:00–23:00',
      address: '171/2 ถนนโชคชัย 4 ซอย 7 (ซอยลาดพร้าว 53 / โชคชัย 4 แยก 7) แขวงลาดพร้าว เขตลาดพร้าว กรุงเทพมหานคร',
      mapUrl: 'https://maps.app.goo.gl/3W91sYQbvBptCaVt5', image: 'assets/images/location-wakeup.jpg'
    }
  },
  menus: {
    sweetnessLevels: ['ไม่หวาน', '25%', '50%', '75%', '100%'],
    morningDrinks: [
      ['Americano (ร้อน/เย็น)','ice-americano.jpg'], ['Latte (ร้อน/เย็น)','ice-latte.jpg'],
      ['Cappuccino (ร้อน/เย็น)','ice-cappuccino.jpg'], ['Cocoa (ร้อน/เย็น)','cocoa.jpg'],
      ['Matcha Coconut','matcha-premium.jpg'], ['Matcha Orange','matcha-premium.jpg'],
      ['Americano Coconut','coconut-americano.jpg'], ['Americano Orange','orange-americano.jpg'],
      ['Peach Tea','peach-tea.jpg'], ['Orange Juice','fresh-orange-juice.jpg']
    ].map(([name,file]) => ({name, image:`assets/images/menu/${file}`})),
    breakfastFoods: [
      ['ข้าวผัดต้มยำทะเล','tom-yum-fried-rice.jpg'],
      ['ก๋วยเตี๋ยวคั่วกะเพราเนื้อ','krapao-beef-noodle.jpg'],
      ['ผัดไทยกุ้งสด','pad-thai-shrimp.jpg'],
      ['ข้าวสามชั้นคั่วพริกเกลือ + ไข่ดาว','crispy-pork-rice.jpg'],
      ['Linguini Truffle Sauce','linguine-truffle.jpg'],
      ['Spaghetti ผัดพริกแห้งกระเทียมไส้แคบกรอบ','spaghetti-aglio-olio.jpg'],
      ['Penne ซอสมะเขือเทศรสเผ็ดใส่กุ้ง','linguine-arrabiata.jpg']
    ].map(([name,file]) => ({name, image:`assets/images/menu/${file}`})),
    afternoonDrinks: [
      ['Americano (ร้อน/เย็น)','ice-americano.jpg'], ['Latte (ร้อน/เย็น)','ice-latte.jpg'],
      ['Cappuccino (ร้อน/เย็น)','ice-cappuccino.jpg'], ['Cocoa (ร้อน/เย็น)','cocoa.jpg'],
      ['Thai Tea','thai-tea.jpg'], ['Americano Coconut','coconut-americano.jpg'],
      ['Americano Orange','orange-americano.jpg'], ['แดงโซดา','plum-soda.jpg'],
      ['บ๊วยโซดา','plum-soda.jpg'], ['Watermelon Blended','fresh-orange-juice.jpg'],
      ['Mint Chocolate','mint-chocolate.jpg']
    ].map(([name,file]) => ({name, image:`assets/images/menu/${file}`}))
  },
  agenda: {
    AM_MNG: [
      ['09:30–10:00','Team Journey Check-in'], ['10:00–10:15','Journey Opening: Vision & Transformation'],
      ['10:15–11:45','H1 Recap & Team Insight'], ['11:45–13:00','Lunch & Casual Connect'],
      ['13:00–13:15','Theme Vision & Introduction'], ['13:15–13:30','Leadership Message: From Vision to Action'],
      ['13:30–13:45','Identity in Motion: Journey Role'], ['13:45–14:45','Puzzle Hunt & Team Build'],
      ['14:45–15:45','Creative Workshop & Sharing'], ['15:45–16:45','Transformation Reflection: Reflection Card'],
      ['16:45–17:00','Closing the Journey: Capture & Commitment']
    ],
    SUP_STAFF: [
      ['13:00–13:15','Theme Vision & Introduction'], ['13:15–13:30','Leadership Message: From Vision to Action'],
      ['13:30–13:45','Identity in Motion: Journey Role'], ['13:45–14:45','Puzzle Hunt & Team Build'],
      ['14:45–15:45','Creative Workshop & Sharing'], ['15:45–16:45','Transformation Reflection: Reflection Card'],
      ['16:45–17:00','Closing the Journey: Capture & Commitment']
    ]
  }
});
