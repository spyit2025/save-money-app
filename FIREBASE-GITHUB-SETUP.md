# การตั้งค่า Firebase สำหรับ GitHub Pages

## ปัญหาที่พบ
เมื่อ deploy แอพไปยัง GitHub Pages แล้ว ข้อมูลไม่สามารถบันทึกลง Firebase ได้ แม้ว่าจะทำงานปกติใน localhost

## สาเหตุของปัญหา
1. **Domain Authorization**: Firebase ไม่ได้อนุญาตให้ domain ของ GitHub Pages เขียนข้อมูล
2. **Firestore Security Rules**: กฎความปลอดภัยไม่อนุญาตให้เขียนข้อมูลจาก domain ภายนอก
3. **HTTPS/HTTP Protocol**: GitHub Pages ใช้ HTTPS แต่ Firebase อาจตั้งค่าให้ทำงานเฉพาะ HTTP

## วิธีแก้ไข

### 1. เพิ่ม Domain ใน Firebase Authentication

1. ไปที่ [Firebase Console](https://console.firebase.google.com/)
2. เลือกโปรเจค `save-money-app-3a5ac`
3. ไปที่ **Authentication** > **Settings** > **Authorized domains**
4. เพิ่ม domain ต่อไปนี้:
   ```
   spyit2025.github.io
   *.github.io
   ```

### 2. ตรวจสอบ Firestore Security Rules

1. ไปที่ **Firestore Database** > **Rules**
2. ตรวจสอบว่ากฎอนุญาตให้เขียนข้อมูลจาก domain ภายนอก:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // อนุญาตให้ผู้ใช้ที่ login แล้วเข้าถึงข้อมูลของตัวเอง
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // อนุญาตให้ผู้ใช้ที่ login แล้วเข้าถึงข้อมูล transactions ของตัวเอง
    match /users/{userId}/transactions/{transactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // อนุญาตให้ผู้ใช้ที่ login แล้วเข้าถึงข้อมูล goals ของตัวเอง
    match /users/{userId}/goals/{goalId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // อนุญาตให้ผู้ใช้ที่ login แล้วเข้าถึงข้อมูล categories ของตัวเอง
    match /users/{userId}/categories/{categoryId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // อนุญาตให้ผู้ใช้ที่ login แล้วเข้าถึงข้อมูล global categories
    match /categories/{categoryId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == categoryId;
    }
  }
}
```

### 3. ตรวจสอบการตั้งค่า Hosting (ถ้ามี)

1. ไปที่ **Hosting** ใน Firebase Console
2. ตรวจสอบว่า domain `spyit2025.github.io` ถูกเพิ่มในรายการหรือไม่

### 4. ทดสอบการเชื่อมต่อ

หลังจากตั้งค่าแล้ว ให้ทดสอบ:

1. เปิด Developer Console (F12)
2. ไปที่เว็บไซต์: https://spyit2025.github.io/save-money-app/
3. ตรวจสอบ console logs:
   - ✅ `Firestore connection test successful` = ทำงานปกติ
   - ❌ `Firestore connection test failed` = ยังมีปัญหา

### 5. การแก้ไขปัญหาเพิ่มเติม

#### ถ้ายังมีปัญหา Permission Denied:

1. **ตรวจสอบ Authentication State**:
   ```javascript
   // ใน console ของ browser
   firebase.auth().onAuthStateChanged((user) => {
     console.log('Auth state:', user ? 'Logged in' : 'Not logged in');
     if (user) console.log('User ID:', user.uid);
   });
   ```

2. **ทดสอบการเขียนข้อมูลโดยตรง**:
   ```javascript
   // ใน console ของ browser
   firebase.firestore().collection('test').doc('test').set({
     test: true,
     timestamp: firebase.firestore.FieldValue.serverTimestamp()
   }).then(() => {
     console.log('Write test successful');
   }).catch((error) => {
     console.error('Write test failed:', error);
   });
   ```

#### ถ้ามีปัญหา Network:

1. ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต
2. ตรวจสอบว่าไม่มีการบล็อก Firebase domains
3. ลองใช้ VPN หรือเปลี่ยนเครือข่าย

### 6. การตรวจสอบสถานะ

หลังจากแก้ไขแล้ว ให้ตรวจสอบ:

- [ ] Domain `spyit2025.github.io` ถูกเพิ่มใน Authorized domains
- [ ] Firestore Security Rules อนุญาตให้เขียนข้อมูล
- [ ] ผู้ใช้ login สำเร็จ
- [ ] การทดสอบการเชื่อมต่อผ่าน
- [ ] สามารถเพิ่มรายการใหม่ได้
- [ ] ข้อมูลแสดงในตาราง

### 7. การติดต่อ Support

หากยังมีปัญหา:

1. ตรวจสอบ Firebase Console > Project Settings > General
2. ตรวจสอบ API Key และการตั้งค่าอื่นๆ
3. ดู logs ใน Firebase Console > Functions (ถ้ามี)
4. ติดต่อ Firebase Support

## หมายเหตุ

- การตั้งค่าเหล่านี้จะใช้เวลาประมาณ 5-10 นาทีในการ propagate
- หลังจากแก้ไขแล้ว ให้ clear browser cache และลองใหม่
- ตรวจสอบ console logs เพื่อดูข้อผิดพลาดที่เฉพาะเจาะจง
