# 🚀 การ Deploy ไปยัง GitHub Pages

## 📋 ขั้นตอนการตั้งค่า

### ขั้นตอนที่ 1: สร้าง GitHub Repository

1. **ไปที่ GitHub.com** และล็อกอิน
2. **คลิก "New repository"** หรือ "New"
3. **ตั้งชื่อ repository:**
   - **ตัวเลือกที่ 1:** `kengkajm.github.io` (สำหรับ username.github.io)
   - **ตัวเลือกที่ 2:** `save-money-app` (สำหรับ custom domain)
4. **เลือก "Public"**
5. **ไม่ต้องเลือก "Add a README file"**
6. **คลิก "Create repository"**

### ขั้นตอนที่ 2: เชื่อมต่อกับ GitHub Repository

**สำหรับ repository ชื่อ `kengkajm.github.io`:**
```bash
git remote add origin https://github.com/kengkajm/kengkajm.github.io.git
git branch -M main
git push -u origin main
```

**สำหรับ repository ชื่อ `save-money-app`:**
```bash
git remote add origin https://github.com/kengkajm/save-money-app.git
git branch -M main
git push -u origin main
```

### ขั้นตอนที่ 3: ตั้งค่า GitHub Pages

1. **ไปที่ repository** ที่สร้างไว้
2. **คลิก "Settings"** (แท็บด้านบน)
3. **เลื่อนลงไปหา "Pages"** (เมนูด้านซ้าย)
4. **เลือก Source:**
   - เลือก "Deploy from a branch"
   - เลือก Branch: "main"
   - เลือก Folder: "/ (root)"
5. **คลิก "Save"**

### ขั้นตอนที่ 4: รอ Deploy

- **เวลา:** 2-5 นาที
- **URL:** จะแสดงในหน้า Pages
- **ตัวอย่าง:** `https://kengkajm.github.io` หรือ `https://kengkajm.github.io/save-money-app`

---

## 🌐 URL ที่จะได้

### ตัวเลือกที่ 1: username.github.io
- **Repository:** `kengkajm.github.io`
- **URL:** `https://kengkajm.github.io`
- **ข้อดี:** URL สั้น สวย
- **ข้อเสีย:** ใช้ได้แค่ 1 repository

### ตัวเลือกที่ 2: username.github.io/repository-name
- **Repository:** `save-money-app`
- **URL:** `https://kengkajm.github.io/save-money-app`
- **ข้อดี:** ใช้ได้หลาย repository
- **ข้อเสีย:** URL ยาว

---

## 🔧 การตั้งค่า Custom Domain (ถ้าต้องการ)

### ขั้นตอนที่ 1: ซื้อ Domain
1. ไปที่ [freenom.com](https://freenom.com)
2. เลือก domain `.tk` ฟรี 12 เดือน
3. ลงทะเบียนและยืนยัน

### ขั้นตอนที่ 2: เพิ่ม Custom Domain ใน GitHub
1. ไปที่ Settings > Pages
2. กรอก Custom domain: `your-domain.tk`
3. คลิก "Save"
4. เลือก "Enforce HTTPS"

### ขั้นตอนที่ 3: ตั้งค่า DNS
1. ไปที่ domain registrar (Freenom)
2. เพิ่ม DNS records:

**Type A:**
```
Name: @
Value: 185.199.108.153
Value: 185.199.109.153
Value: 185.199.110.153
Value: 185.199.111.153
```

**Type CNAME:**
```
Name: www
Value: kengkajm.github.io
```

---

## 🔄 การอัปเดตแอป

### วิธีที่ 1: ผ่าน Command Line
```bash
git add .
git commit -m "Update app"
git push origin main
```

### วิธีที่ 2: ผ่าน GitHub Desktop
1. เปิด GitHub Desktop
2. Commit changes
3. Push to origin

### วิธีที่ 3: ผ่าน GitHub Web
1. ไปที่ repository
2. อัปโหลดไฟล์ใหม่
3. Commit changes

---

## 🚨 การแก้ไขปัญหา

### ปัญหา: หน้าเว็บแสดง 404
1. ตรวจสอบ repository name
2. ตรวจสอบ Settings > Pages
3. รอ 5-10 นาที

### ปัญหา: แอปไม่ทำงาน
1. ตรวจสอบ Console ใน Developer Tools
2. ตรวจสอบ Firebase config
3. ตรวจสอบ CORS settings

### ปัญหา: Custom Domain ไม่ทำงาน
1. ตรวจสอบ DNS records
2. รอ 24-48 ชั่วโมง
3. ตรวจสอบ HTTPS settings

---

## 💡 เคล็ดลับ

1. **ใช้ HTTPS:** GitHub Pages รองรับ HTTPS ฟรี
2. **Custom 404:** สร้างไฟล์ `404.html` สำหรับ error page
3. **Jekyll:** GitHub Pages ใช้ Jekyll (ไม่จำเป็นสำหรับ static files)
4. **Branch:** ใช้ branch `main` หรือ `master`
5. **Cache:** ไฟล์จะถูก cache อัตโนมัติ

---

## 📊 ข้อดีของ GitHub Pages

✅ **ฟรีตลอดไป**
✅ **เสถียร ปลอดภัย**
✅ **รองรับ HTTPS**
✅ **รองรับ Custom Domain**
✅ **Auto-deploy จาก Git**
✅ **ไม่มีข้อจำกัด bandwidth**
✅ **รองรับ CDN**

---

## 🎯 ขั้นตอนต่อไป

1. **สร้าง GitHub repository**
2. **Push code ไปยัง GitHub**
3. **ตั้งค่า GitHub Pages**
4. **ทดสอบแอป**
5. **เพิ่ม Custom Domain (ถ้าต้องการ)**

---

## 📞 การสนับสนุน

- **GitHub Pages:** [pages.github.com](https://pages.github.com)
- **GitHub Support:** [github.com/support](https://github.com/support)
- **Jekyll:** [jekyllrb.com](https://jekyllrb.com)
