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
    apiKey: "AIzaSyAwU1TprM3YZ5vbf9tg19zSJqRxbUyNL24",
    authDomain: "save-money-app-3cc2a.firebaseapp.com",
    projectId: "save-money-app-3cc2a",
    storageBucket: "save-money-app-3cc2a.firebasestorage.app",
    messagingSenderId: "288105338186",
    appId: "1:288105338186:web:62826d370ba3c9a1dc5db3",
    measurementId: "G-LY562KHEW6"
};

// ตรวจสอบ environment และ domain
function checkEnvironment() {
    const currentDomain = window.location.hostname;
    const isLocalhost = currentDomain === 'localhost' || currentDomain === '127.0.0.1';
    const isGitHubPages = currentDomain.includes('github.io');
    const isHttps = window.location.protocol === 'https:';
    
    console.log('Current domain:', currentDomain);
    console.log('Is localhost:', isLocalhost);
    console.log('Is GitHub Pages:', isGitHubPages);
    console.log('Is HTTPS:', isHttps);
    
    return { isLocalhost, isGitHubPages, isHttps };
}

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
    } catch (e) {
        // Silent error handling
    }
}

// ตั้งค่า Firestore ก่อนสร้าง instance
if (!window.firestoreConfigured) {
    try {
        firebase.firestore.setLogLevel('error');
        window.firestoreConfigured = true;
    } catch (e) {
        // Silent error handling
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
    } catch (e) {
        // Silent error handling
    }
}

// เริ่มต้น Analytics (ถ้ามี)
let analytics;
try {
    if (typeof firebase.analytics !== 'undefined') {
        analytics = firebase.analytics();
    }
} catch (e) {
    // Analytics not available
}

// ฟังก์ชันสำหรับการทดสอบการเชื่อมต่อ Firestore
async function testFirestoreConnection() {
    const env = checkEnvironment();
    
    try {
        // ทดสอบการเขียนข้อมูลชั่วคราว
        const testDoc = db.collection('_test_connection').doc('test');
        await testDoc.set({
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            domain: window.location.hostname,
            protocol: window.location.protocol,
            userAgent: navigator.userAgent
        });
        
        // ลบข้อมูลทดสอบ
        await testDoc.delete();
        
        console.log('✅ Firestore connection test successful');
        return true;
    } catch (error) {
        console.error('❌ Firestore connection test failed:', error);
        
        // แสดงข้อผิดพลาดที่เฉพาะเจาะจง
        if (error.code === 'permission-denied') {
            console.error('🔒 Permission denied - Check Firestore Security Rules');
            console.error('💡 Make sure your domain is allowed in Firebase Console');
            console.error('🌐 Current domain:', window.location.hostname);
            
            if (env.isGitHubPages) {
                console.error('📝 For GitHub Pages, add these domains to Firebase Console:');
                console.error('   - spyit2025.github.io');
                console.error('   - *.github.io (if using custom domain)');
            }
        } else if (error.code === 'unavailable') {
            console.error('🌐 Network unavailable - Check internet connection');
        } else if (error.code === 'unauthenticated') {
            console.error('🔐 User not authenticated');
        }
        
        return false;
    }
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
            errorMessage = 'ไม่มีสิทธิ์เข้าถึงข้อมูล - กรุณาตรวจสอบการตั้งค่า Firebase';
            console.error('🔒 Permission denied error detected');
            console.error('🌐 Current domain:', window.location.hostname);
            console.error('💡 Check Firebase Console > Authentication > Settings > Authorized domains');
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

// ทดสอบการเชื่อมต่อเมื่อโหลดหน้า
document.addEventListener('DOMContentLoaded', async () => {
    const env = checkEnvironment();
    
    // รอให้ Firebase พร้อมใช้งาน
    setTimeout(async () => {
        const connectionTest = await testFirestoreConnection();
        
        if (!connectionTest) {
            if (env.isGitHubPages) {
                showNotification('⚠️ ตรวจพบปัญหาการเชื่อมต่อ Firebase กรุณาตรวจสอบการตั้งค่า', 'warning');
                console.error('🔧 Troubleshooting steps for GitHub Pages:');
                console.error('1. Go to Firebase Console > Authentication > Settings');
                console.error('2. Add "spyit2025.github.io" to Authorized domains');
                console.error('3. Check Firestore Security Rules');
            }
        } else {
            console.log('✅ Firebase connection verified');
        }
    }, 2000);
});

// Firebase พร้อมใช้งาน
// Firebase config loaded successfully

// ส่งออกตัวแปรสำหรับใช้ในไฟล์อื่น
window.firebaseConfig = {
    auth,
    db,
    analytics,
    handleFirebaseError,
    showNotification,
    sanitizeInput,
    validateEmail,
    validatePassword,
    testFirestoreConnection,
    checkEnvironment
};
