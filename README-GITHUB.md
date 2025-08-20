# 💰 แอพออมเงิน - GitHub Pages

## 🌐 Live Demo
- **URL:** https://kengkajm.github.io หรือ https://kengkajm.github.io/save-money-app
- **Status:** ✅ Deployed

## 📱 ฟีเจอร์
- ✅ การจัดการรายรับ-รายจ่าย
- ✅ การตั้งเป้าหมายการออม
- ✅ แผนภูมิและสถิติ
- ✅ การแจ้งเตือน
- ✅ Responsive Design
- ✅ PWA Support

## 🚀 การ Deploy

### วิธีที่ 1: ใช้สคริปต์ (แนะนำ)
**Windows:**
```bash
deploy-github.bat
```

**Linux/Mac:**
```bash
chmod +x deploy-github.sh
./deploy-github.sh
```

### วิธีที่ 2: ใช้คำสั่ง Git
```bash
git add .
git commit -m "Update app"
git push origin main
```

## 🔧 การตั้งค่า

### ขั้นตอนที่ 1: สร้าง GitHub Repository
1. ไปที่ [GitHub.com](https://github.com)
2. สร้าง repository ใหม่
3. ตั้งชื่อ: `kengkajm.github.io` หรือ `save-money-app`

### ขั้นตอนที่ 2: เชื่อมต่อ Repository
```bash
git remote add origin https://github.com/kengkajm/repository-name.git
git branch -M main
git push -u origin main
```

### ขั้นตอนที่ 3: ตั้งค่า GitHub Pages
1. ไปที่ Settings > Pages
2. เลือก Source: "Deploy from a branch"
3. เลือก Branch: "main"
4. เลือก Folder: "/ (root)"

## 📁 โครงสร้างไฟล์
```
save-money-app/
├── index.html          # หน้าล็อกอิน
├── dashboard.html      # หน้าหลัก
├── css/
│   └── style.css      # สไตล์
├── js/
│   ├── app.js         # ฟังก์ชันหลัก
│   ├── auth.js        # การยืนยันตัวตน
│   ├── dashboard.js   # หน้าหลัก
│   └── firebase-config.js # การตั้งค่า Firebase
├── 404.html           # หน้า error
└── README.md          # คู่มือ
```

## 🔥 Firebase Configuration
แอปใช้ Firebase เป็น backend:
- **Authentication:** Email/Password
- **Firestore:** ฐานข้อมูล
- **Hosting:** (สำรอง)

## 🌐 Domain Options

### ตัวเลือกที่ 1: GitHub Pages (ฟรีตลอดไป)
- **URL:** https://kengkajm.github.io
- **ข้อดี:** ฟรี เสถียร ปลอดภัย
- **ข้อเสีย:** URL ยาว

### ตัวเลือกที่ 2: Custom Domain
- **ซื้อจาก:** [Freenom.com](https://freenom.com)
- **ราคา:** ฟรี 12 เดือนแรก
- **ต่ออายุ:** $10-15/ปี

## 🔄 การอัปเดต

### อัปเดตแอป:
```bash
git add .
git commit -m "Update: description"
git push origin main
```

### อัปเดต Firebase:
```bash
firebase deploy --only hosting
```

## 🚨 การแก้ไขปัญหา

### ปัญหา: หน้าเว็บแสดง 404
1. ตรวจสอบ repository name
2. ตรวจสอบ Settings > Pages
3. รอ 5-10 นาที

### ปัญหา: แอปไม่ทำงาน
1. ตรวจสอบ Console ใน Developer Tools
2. ตรวจสอบ Firebase config
3. ตรวจสอบ CORS settings

### ปัญหา: Git Push ล้มเหลว
1. ตรวจสอบ Git credentials
2. ตรวจสอบ repository permissions
3. ตรวจสอบ internet connection

## 📊 Performance
- **Load Time:** < 2 วินาที
- **Size:** ~500KB
- **CDN:** GitHub Pages CDN
- **SSL:** HTTPS ฟรี

## 🔒 Security
- **HTTPS:** ✅
- **CORS:** ✅
- **XSS Protection:** ✅
- **Content Security Policy:** ✅

## 📞 การสนับสนุน
- **GitHub:** [github.com/support](https://github.com/support)
- **Firebase:** [firebase.google.com/support](https://firebase.google.com/support)
- **Documentation:** [pages.github.com](https://pages.github.com)

## 📄 License
MIT License - ใช้งานได้ฟรี

---

**สร้างโดย:** Kengkaj Mingmongkoljamrus  
**อัปเดตล่าสุด:** $(date)  
**เวอร์ชัน:** 1.0.0
