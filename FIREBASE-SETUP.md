# Firebase Setup Guide

## การตั้งค่า Firebase สำหรับแอพออมเงิน

### 1. โครงสร้างไฟล์

```
├── js/
│   └── firebase-config.js     # Firebase config สำหรับ legacy SDK
├── firebase-config.js         # Firebase config สำหรับ SDK v9+
├── firestore.rules           # Firestore Security Rules
└── FIREBASE-SETUP.md         # คู่มือนี้
```

### 2. การตั้งค่า Firebase Console

#### 2.1 สร้างโปรเจกต์ Firebase
1. ไปที่ [Firebase Console](https://console.firebase.google.com/)
2. สร้างโปรเจกต์ใหม่ชื่อ "save-money-app-3cc2a"
3. เปิดใช้งาน Google Analytics (ถ้าต้องการ)

#### 2.2 เพิ่ม Web App
1. คลิก "Add app" > "Web"
2. ตั้งชื่อแอป: "Save Money App"
3. เปิดใช้งาน Firebase Hosting (ถ้าต้องการ)
4. คัดลอก configuration object

#### 2.3 เปิดใช้งานบริการ
1. **Authentication**: เปิดใช้งาน Email/Password
2. **Firestore Database**: สร้าง database ใน production mode
3. **Storage**: เปิดใช้งาน (ถ้าต้องการเก็บไฟล์)
4. **Analytics**: เปิดใช้งาน (ถ้าต้องการ)

### 3. การตั้งค่า Security Rules

#### 3.1 Firestore Rules
อัปเดต Firestore Security Rules ใน Firebase Console:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // ฟังก์ชันสำหรับตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้ว
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // ฟังก์ชันสำหรับตรวจสอบว่าผู้ใช้เป็นเจ้าของข้อมูล
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // กฎสำหรับคอลเลกชัน transactions
    match /transactions/{transactionId} {
      allow read, write: if isAuthenticated() && 
        resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated() && 
        request.resource.data.userId == request.auth.uid;
    }
    
    // กฎสำหรับคอลเลกชันอื่นๆ
    match /{document=**} {
      allow read, write: if isAuthenticated();
    }
  }
}
```

#### 3.2 Storage Rules (ถ้าใช้)
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 4. การตั้งค่า Authentication

#### 4.1 เปิดใช้งาน Sign-in Methods
1. ไปที่ Authentication > Sign-in method
2. เปิดใช้งาน Email/Password
3. เปิดใช้งาน Google (ถ้าต้องการ)

#### 4.2 เพิ่ม Authorized Domains
1. ไปที่ Authentication > Settings > Authorized domains
2. เพิ่มโดเมน:
   - `localhost` (สำหรับ development)
   - `your-app.firebaseapp.com` (Firebase Hosting)
   - `your-custom-domain.com` (ถ้ามี)

### 5. การใช้งานในโค้ด

#### 5.1 สำหรับ Legacy SDK (firebase v8)
```javascript
// ใช้ไฟล์ js/firebase-config.js
// โหลด Firebase SDK ใน HTML
<script src="https://www.gstatic.com/firebasejs/8.x.x/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/8.x.x/firebase-auth.js"></script>
<script src="https://www.gstatic.com/firebasejs/8.x.x/firebase-firestore.js"></script>
```

#### 5.2 สำหรับ SDK v9+
```javascript
// ใช้ไฟล์ firebase-config.js
import { auth, db, storage } from './firebase-config.js';

// ตัวอย่างการใช้งาน
import { collection, addDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
```

### 6. การทดสอบ

#### 6.1 ทดสอบการเชื่อมต่อ
```javascript
// ทดสอบการเขียนข้อมูล
const testDoc = await addDoc(collection(db, '_test'), {
  timestamp: new Date(),
  message: 'Connection test'
});
console.log('✅ Firebase connection successful');
```

#### 6.2 ทดสอบ Authentication
```javascript
// ทดสอบการเข้าสู่ระบบ
try {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  console.log('✅ Authentication successful');
} catch (error) {
  console.error('❌ Authentication failed:', error);
}
```

### 7. การ Deploy

#### 7.1 Deploy Security Rules
```bash
firebase deploy --only firestore:rules
```

#### 7.2 Deploy to Firebase Hosting
```bash
firebase deploy --only hosting
```

### 8. การแก้ไขปัญหา

#### 8.1 Permission Denied
- ตรวจสอบ Security Rules
- ตรวจสอบ Authorized Domains
- ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้ว

#### 8.2 Network Error
- ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต
- ตรวจสอบ CORS settings
- ตรวจสอบ Firebase project settings

#### 8.3 Authentication Error
- ตรวจสอบ Sign-in methods
- ตรวจสอบ Email verification
- ตรวจสอบ Password requirements

### 9. การ Monitor และ Analytics

#### 9.1 Firebase Analytics
- ดูข้อมูลผู้ใช้ใน Firebase Console
- ตั้งค่า Custom Events
- ดู Performance metrics

#### 9.2 Firestore Usage
- ตรวจสอบ Read/Write operations
- ดู Storage usage
- Monitor costs

### 10. Security Best Practices

1. **Never expose API keys** ใน client-side code
2. **Use Security Rules** อย่างเคร่งครัด
3. **Validate data** ทั้ง client และ server side
4. **Use HTTPS** เสมอ
5. **Regular security audits** ของ Security Rules
6. **Monitor usage** และ costs
7. **Backup data** อย่างสม่ำเสมอ

---

**หมายเหตุ**: ไฟล์ configuration ทั้งหมดในโปรเจกต์นี้ใช้ Firebase project ID: `save-money-app-3cc2a`
