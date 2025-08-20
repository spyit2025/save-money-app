// ===== การตั้งค่า Firebase =====
// ไฟล์นี้ใช้สำหรับการเชื่อมต่อกับ Firebase

// ฟังก์ชันสำหรับการทำความสะอาดข้อมูล input
function sanitizeInput(input) {
    if (typeof input !== 'string') {
        return '';
    }
    
    // ลบ HTML tags และ special characters ที่อันตราย
    return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
}

// ฟังก์ชันสำหรับการตรวจสอบความถูกต้องของอีเมล
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// ฟังก์ชันสำหรับการตรวจสอบความแข็งแกร่งของรหัสผ่าน
function validatePassword(password) {
    // ต้องมีอย่างน้อย 8 ตัวอักษร, ตัวพิมพ์ใหญ่, ตัวพิมพ์เล็ก, ตัวเลข
    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
}

// การตั้งค่า Firebase สำหรับแอพออมเงิน
const firebaseConfig = {
    apiKey: "AIzaSyDVdFnEfNoImZ_JISEfsBsjcUcCtIcsVkE",
    authDomain: "save-money-app-3a5ac.firebaseapp.com",
    projectId: "save-money-app-3a5ac",
    storageBucket: "save-money-app-3a5ac.firebasestorage.app",
    messagingSenderId: "240747947950",
    appId: "1:240747947950:web:767ea89348bb892a580a3f",
    measurementId: "G-Y249PYTSJW"
};

// เริ่มต้น Firebase
let app;
try {
    app = firebase.app();
} catch (e) {
    app = firebase.initializeApp(firebaseConfig);
}

// ตั้งค่า Firestore ก่อนสร้าง instance (เฉพาะครั้งแรก)
if (!window.firestoreConfigured) {
    try {
        // ตั้งค่า global Firestore settings
        firebase.firestore.setLogLevel('error'); // ลด log level
        window.firestoreConfigured = true;
        console.log('ตั้งค่า Firestore สำเร็จ');
    } catch (e) {
        console.log('ไม่สามารถตั้งค่า Firestore ได้:', e.message);
    }
}

// ตั้งค่า Firestore ก่อนสร้าง instance
if (!window.firestoreConfigured) {
    try {
        firebase.firestore.setLogLevel('error');
        window.firestoreConfigured = true;
        console.log('ตั้งค่า Firestore สำเร็จ');
    } catch (e) {
        console.log('ไม่สามารถตั้งค่า Firestore ได้:', e.message);
    }
}

// เริ่มต้นบริการต่างๆ
const auth = firebase.auth();
const db = firebase.firestore();

// ตั้งค่า cache หลังจากสร้าง instance
if (!window.firestoreCacheConfigured) {
    try {
        db.settings({
            cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
        });
        window.firestoreCacheConfigured = true;
        console.log('ตั้งค่า Firestore cache สำเร็จ');
    } catch (e) {
        console.log('ไม่สามารถตั้งค่า Firestore cache ได้:', e.message);
    }
}

// เริ่มต้น Analytics (ถ้ามี)
let analytics;
try {
    if (typeof firebase.analytics !== 'undefined') {
        analytics = firebase.analytics();
    }
} catch (e) {
    console.log('Analytics ไม่พร้อมใช้งาน');
}

// ฟังก์ชันสำหรับการจัดการข้อผิดพลาด
function handleFirebaseError(error) {
    console.error('Firebase Error:', error);
    
    let errorMessage = 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
    
    switch (error.code) {
        case 'auth/user-not-found':
            errorMessage = 'ไม่พบผู้ใช้นี้';
            break;
        case 'auth/wrong-password':
            errorMessage = 'รหัสผ่านไม่ถูกต้อง';
            break;
        case 'auth/email-already-in-use':
            errorMessage = 'อีเมลนี้ถูกใช้งานแล้ว';
            break;
        case 'auth/weak-password':
            errorMessage = 'รหัสผ่านอ่อนเกินไป';
            break;
        case 'auth/invalid-email':
            errorMessage = 'รูปแบบอีเมลไม่ถูกต้อง';
            break;
        case 'permission-denied':
            errorMessage = 'ไม่มีสิทธิ์เข้าถึงข้อมูล';
            break;
        case 'unavailable':
            errorMessage = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้';
            break;
        case 'auth/too-many-requests':
            errorMessage = 'มีการพยายามเข้าสู่ระบบมากเกินไป กรุณาลองใหม่ในภายหลัง';
            break;
        case 'auth/network-request-failed':
            errorMessage = 'เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย';
            break;
    }
    
    return errorMessage;
}

// ฟังก์ชันสำหรับการแสดงการแจ้งเตือน
function showNotification(message, type = 'info') {
    // สร้าง element สำหรับการแจ้งเตือน
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    notification.innerHTML = `
        ${sanitizeInput(message)}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // เพิ่มการแจ้งเตือนลงในหน้า
    document.body.appendChild(notification);
    
    // ลบการแจ้งเตือนหลังจาก 5 วินาที
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Firebase พร้อมใช้งาน
console.log('Firebase config โหลดเรียบร้อยแล้ว');

// ส่งออกตัวแปรสำหรับใช้ในไฟล์อื่น
window.firebaseConfig = {
    auth,
    db,
    analytics,
    handleFirebaseError,
    showNotification,
    sanitizeInput,
    validateEmail,
    validatePassword
};
