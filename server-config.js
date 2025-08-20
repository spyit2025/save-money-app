// ===== Firebase Admin SDK Configuration =====
// ไฟล์นี้ใช้สำหรับ server-side operations เท่านั้น
// อย่าใช้ใน frontend หรือแชร์ในที่สาธารณะ

const admin = require('firebase-admin');

// Service Account Key (เก็บไว้ใน environment variables)
const serviceAccount = {
  "type": "service_account",
  "project_id": "save-money-app-3cc2a",
  "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID,
  "private_key": process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  "client_email": process.env.FIREBASE_CLIENT_EMAIL,
  "client_id": process.env.FIREBASE_CLIENT_ID,
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": process.env.FIREBASE_CLIENT_X509_CERT_URL,
  "universe_domain": "googleapis.com"
};

// Initialize Firebase Admin
let adminApp;
try {
  adminApp = admin.app();
} catch (error) {
  adminApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'save-money-app-3cc2a'
  });
}

// Export Admin services
const adminAuth = admin.auth(adminApp);
const adminDb = admin.firestore(adminApp);
const adminStorage = admin.storage(adminApp);

module.exports = {
  adminApp,
  adminAuth,
  adminDb,
  adminStorage
};

// ตัวอย่างการใช้งาน:
/*
const { adminAuth, adminDb } = require('./server-config.js');

// สร้าง custom token
const customToken = await adminAuth.createCustomToken(uid);

// อ่านข้อมูลจาก Firestore
const doc = await adminDb.collection('users').doc(uid).get();

// ส่ง push notification
await admin.messaging().send({
  token: userToken,
  notification: {
    title: 'การแจ้งเตือน',
    body: 'ข้อความแจ้งเตือน'
  }
});
*/
