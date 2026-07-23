/** Public frontend configuration. The page renders immediately from this file. */
window.CES_APP_CONFIG = Object.freeze({
  backendUrl: 'https://script.google.com/macros/s/AKfycbz3hLT_SJMngqs5DJtRg2qRTUTWvPTc450ORz_CwfibYD2g9nUdPeo_DadAIcLcajd34g/exec',
  channel: 'CES_BOARDING_PASS_FORM_V2',
  requestTimeoutMs: 120000,
  logoUrl: 'assets/images/logo-transparent.png',
  export: {
    mimeType: 'image/jpeg',
    widthCm: 21,
    heightCm: 7.425,
    widthPx: 2480,
    heightPx: 877,
    dpi: 300
  },
  event: {
    name: 'Leadership Transformation Journey 2026',
    dateISO: '2026-07-31',
    dateDisplay: '31 JUL 2026',
    dateThai: '31 กรกฎาคม 2569',
    theme: 'Reflect • Connect • Inspire • Appreciate',
    dressCode: 'Cozy Journey & Nature — ขาว ครีม เบจ น้ำตาลอ่อน Sage หรือ Olive',
    showDinnerForStaff: false,
    morningLocation: {
      label: 'MORNING / AFTERNOON',
      name: 'Fave Casual Dining and Working Space',
      time: '09:30–17:00',
      address: 'ซอยรัชดาภิเษก 32 แยก 2 เขตจตุจักร',
      mapUrl: 'https://maps.app.goo.gl/GbaLX3xW7fM8seFM6'
    },
    dinnerLocation: {
      label: 'DINNER',
      name: 'Wake Up - Cafe and Restaurant',
      time: '18:00–23:00',
      address: '171/2 ถนนโชคชัย 4 ซอย 7 (ซอยลาดพร้าว 53)',
      mapUrl: 'https://maps.app.goo.gl/kxmnHsuNfaaG4uQE8'
    }
  },
  menus: {
    morningDrinks: [
      'Ice Americano', 'Ice Latte', 'Ice Cappuccino', 'Orange Americano',
      'Coconut Americano', 'Matcha Premium', 'Cocoa', 'Peach Tea',
      'Fresh Orange Juice'
    ],
    breakfastFoods: [
      'ข้าวผัดกระเทียมเนื้อย่างจิ้มแจ่ว', 'ผัดไทยกุ้งสด',
      'ข้าวสามชั้นคั่วพริกเกลือ', 'Penne Pink Sauce Salmon',
      'Linguine Truffle Cream Sauce', 'Spaghetti Aglio Olio'
    ],
    afternoonDrinks: [
      'Ice Americano', 'Ice Latte', 'Ice Cappuccino', 'Orange Americano',
      'Coconut Americano', 'Matcha Premium', 'Cocoa', 'Dark Cocoa',
      'Mint Chocolate', 'Plum Soda'
    ]
  },
  agenda: {
    AM_MNG: [
      ['09:30–10:00', 'Team Journey Check-in'],
      ['10:00–10:15', 'Journey Opening: Vision & Transformation'],
      ['10:15–11:45', 'H1 Recap & Team Insight'],
      ['11:45–13:00', 'Lunch & Casual Connect'],
      ['13:00–13:15', 'Theme Vision & Introduction'],
      ['13:15–13:30', 'Leadership Message: From Vision to Action'],
      ['13:30–13:45', 'Identity in Motion: Journey Role'],
      ['13:45–14:45', 'Puzzle Hunt & Team Build'],
      ['14:45–15:45', 'Creative Workshop & Sharing'],
      ['15:45–16:45', 'Transformation Reflection: Reflection Card'],
      ['16:45–17:00', 'Closing the Journey: Capture & Commitment']
    ],
    SUP_STAFF: [
      ['13:00–13:15', 'Theme Vision & Introduction'],
      ['13:15–13:30', 'Leadership Message: From Vision to Action'],
      ['13:30–13:45', 'Identity in Motion: Journey Role'],
      ['13:45–14:45', 'Puzzle Hunt & Team Build'],
      ['14:45–15:45', 'Creative Workshop & Sharing'],
      ['15:45–16:45', 'Transformation Reflection: Reflection Card'],
      ['16:45–17:00', 'Closing the Journey: Capture & Commitment']
    ]
  }
});
