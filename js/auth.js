// ===== ระบบ Authentication =====
// ไฟล์นี้จัดการการเข้าสู่ระบบและการสมัครสมาชิก

// ตัวแปรสำหรับเก็บข้อมูลผู้ใช้ปัจจุบัน
let currentUser = null;

// ตัวแปรสำหรับจำกัดการเรียก API
let loginAttempts = 0;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 นาที
let lockoutTime = 0;

// ตัวแปรสำหรับ Auto Logout
let inactivityTimer = null;
let sessionTimeout = 30; // นาที (ค่าเริ่มต้น)
let autoLogoutEnabled = true; // เปิดใช้งาน Auto Logout (ค่าเริ่มต้น)
let lastActivity = Date.now();

// ฟังก์ชันสำหรับการตรวจสอบสถานะการเข้าสู่ระบบ
function checkAuthState() {
    // ป้องกันการเรียกซ้ำ
    if (window.authStateChecked) {
        return;
    }
    
    auth.onAuthStateChanged((user) => {
        if (user) {
            // ผู้ใช้เข้าสู่ระบบแล้ว
            currentUser = user;
            // ผู้ใช้เข้าสู่ระบบสำเร็จ
            
            // เริ่มต้น Auto Logout สำหรับผู้ใช้ที่เข้าสู่ระบบแล้ว
            initAutoLogout();
            
            // ตรวจสอบว่าอยู่ในหน้าไหน
            const currentPage = window.location.pathname;
            
            if (currentPage.includes('index.html') || currentPage === '/' || currentPage === '') {
                // ถ้าอยู่ในหน้า login ให้ไปหน้า dashboard
                if (!window.redirecting) {
                    window.redirecting = true;
                    window.location.href = 'dashboard.html';
                }
            } else {
                // อัปเดตข้อมูลผู้ใช้ในหน้า dashboard
                updateUserInfo(user);
            }
        } else {
            // ผู้ใช้ไม่ได้เข้าสู่ระบบ
            currentUser = null;
            
            // ตรวจสอบว่าอยู่ในหน้าไหน
            const currentPage = window.location.pathname;
            
            if (!currentPage.includes('index.html') && currentPage !== '/' && currentPage !== '') {
                // ถ้าไม่ได้อยู่ในหน้า login ให้ไปหน้า login
                if (!window.redirecting) {
                    window.redirecting = true;
                    window.location.href = 'index.html';
                }
            }
        }
        
        // ตั้งค่าสถานะว่าได้ตรวจสอบแล้ว
        window.authStateChecked = true;
    });
}

// ฟังก์ชันสำหรับการตรวจสอบการล็อกอินที่มากเกินไป
function checkLoginAttempts() {
    const now = Date.now();
    
    // ตรวจสอบว่าถูก lockout หรือไม่
    if (lockoutTime > now) {
        const remainingTime = Math.ceil((lockoutTime - now) / 1000 / 60);
        showNotification(`บัญชีถูกล็อค กรุณาลองใหม่ใน ${remainingTime} นาที`, 'warning');
        return false;
    }
    
    // รีเซ็ต lockout ถ้าเกินเวลา
    if (lockoutTime > 0 && now > lockoutTime) {
        loginAttempts = 0;
        lockoutTime = 0;
    }
    
    return true;
}

// ฟังก์ชันสำหรับการเข้าสู่ระบบ
async function signIn(email, password) {
    try {
        // ตรวจสอบการล็อกอินที่มากเกินไป
        if (!checkLoginAttempts()) {
            return;
        }
        
        // ทำความสะอาดข้อมูล input
        const cleanEmail = sanitizeInput(email);
        const cleanPassword = password; // ไม่ต้อง sanitize password
        
        // ตรวจสอบความถูกต้องของอีเมล
        if (!validateEmail(cleanEmail)) {
            showNotification('รูปแบบอีเมลไม่ถูกต้อง', 'warning');
            return;
        }
        
        // แสดง loading
        const loginBtn = document.querySelector('#loginForm button[type="submit"]');
        const originalText = loginBtn.innerHTML;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>กำลังเข้าสู่ระบบ...';
        loginBtn.disabled = true;
        
        // ตรวจสอบ checkbox "จดจำฉัน"
        const rememberMe = document.getElementById('rememberMe').checked;
        
        // เข้าสู่ระบบด้วย Firebase
        const userCredential = await auth.signInWithEmailAndPassword(cleanEmail, cleanPassword);
        const user = userCredential.user;
        
        // รีเซ็ตการนับการล็อกอินที่ล้มเหลว
        loginAttempts = 0;
        lockoutTime = 0;
        
        // บันทึกข้อมูลผู้ใช้ลงใน Firestore (ถ้ายังไม่มี)
        await saveUserData(user);
        
        // จัดการ "จดจำฉัน"
        if (rememberMe) {
            // ตั้งค่า persistence เป็น LOCAL (จดจำตลอด)
            await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            localStorage.setItem('rememberMe', 'true');
            localStorage.setItem('userEmail', cleanEmail);
        } else {
            // ตั้งค่า persistence เป็น SESSION (จดจำเฉพาะ session)
            await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
            localStorage.removeItem('rememberMe');
            localStorage.removeItem('userEmail');
        }
        
        showNotification('เข้าสู่ระบบสำเร็จ!', 'success');
        
        // ไปหน้า dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
        
    } catch (error) {
        console.error('ข้อผิดพลาดในการเข้าสู่ระบบ:', error);
        
        // เพิ่มการนับการล็อกอินที่ล้มเหลว
        loginAttempts++;
        
        if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
            lockoutTime = Date.now() + LOCKOUT_DURATION;
            showNotification('บัญชีถูกล็อคเนื่องจากมีการล็อกอินผิดหลายครั้ง กรุณาลองใหม่ใน 15 นาที', 'danger');
        } else {
            const errorMessage = handleFirebaseError(error);
            showNotification(errorMessage, 'danger');
        }
        
        // คืนค่าปุ่มเดิม
        const loginBtn = document.querySelector('#loginForm button[type="submit"]');
        loginBtn.innerHTML = originalText;
        loginBtn.disabled = false;
    }
}

// ฟังก์ชันสำหรับการสมัครสมาชิก
async function signUp(email, password, displayName) {
    try {
        // ทำความสะอาดข้อมูล input
        const cleanEmail = sanitizeInput(email);
        const cleanDisplayName = sanitizeInput(displayName);
        const cleanPassword = password; // ไม่ต้อง sanitize password
        
        // ตรวจสอบความถูกต้องของอีเมล
        if (!validateEmail(cleanEmail)) {
            showNotification('รูปแบบอีเมลไม่ถูกต้อง', 'warning');
            return;
        }
        
        // ตรวจสอบความแข็งแกร่งของรหัสผ่าน
        if (!validatePassword(cleanPassword)) {
            showNotification('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร และประกอบด้วยตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก ตัวเลข และอักขระพิเศษ', 'warning');
            return;
        }
        
        // ตรวจสอบความยาวของชื่อ
        if (cleanDisplayName.length < 2 || cleanDisplayName.length > 50) {
            showNotification('ชื่อต้องมีความยาวระหว่าง 2-50 ตัวอักษร', 'warning');
            return;
        }
        
        // แสดง loading
        const registerBtn = document.querySelector('#registerForm button[type="submit"]');
        const originalText = registerBtn.innerHTML;
        registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>กำลังสมัครสมาชิก...';
        registerBtn.disabled = true;
        
        // สร้างบัญชีผู้ใช้ใหม่
        const userCredential = await auth.createUserWithEmailAndPassword(cleanEmail, cleanPassword);
        const user = userCredential.user;
        
        // อัปเดตชื่อผู้ใช้
        await user.updateProfile({
            displayName: cleanDisplayName
        });
        
        // บันทึกข้อมูลผู้ใช้ลงใน Firestore
        await saveUserData(user);
        
        showNotification('สมัครสมาชิกสำเร็จ!', 'success');
        
        // ไปหน้า dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
        
    } catch (error) {
        console.error('ข้อผิดพลาดในการสมัครสมาชิก:', error);
        const errorMessage = handleFirebaseError(error);
        showNotification(errorMessage, 'danger');
        
        // คืนค่าปุ่มเดิม
        const registerBtn = document.querySelector('#registerForm button[type="submit"]');
        registerBtn.innerHTML = originalText;
        registerBtn.disabled = false;
    }
}

// ฟังก์ชันสำหรับการออกจากระบบ
async function signOut() {
    try {
        // หยุด Auto Logout timer
        stopAutoLogout();
        
        await auth.signOut();
        showNotification('ออกจากระบบสำเร็จ', 'info');
        
        // ไปหน้า login
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
        
    } catch (error) {
        console.error('ข้อผิดพลาดในการออกจากระบบ:', error);
        showNotification('เกิดข้อผิดพลาดในการออกจากระบบ', 'danger');
    }
}

// ฟังก์ชันสำหรับการลืมรหัสผ่าน
async function resetPassword(email) {
    try {
        await auth.sendPasswordResetEmail(email);
        showNotification('ส่งอีเมลรีเซ็ตรหัสผ่านแล้ว กรุณาตรวจสอบกล่องจดหมาย', 'success');
    } catch (error) {
        console.error('ข้อผิดพลาดในการรีเซ็ตรหัสผ่าน:', error);
        const errorMessage = handleFirebaseError(error);
        showNotification(errorMessage, 'danger');
    }
}

// ฟังก์ชันสำหรับการบันทึกข้อมูลผู้ใช้ลงใน Firestore
async function saveUserData(user) {
    try {
        const userRef = db.collection('users').doc(user.uid);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            // สร้างข้อมูลผู้ใช้ใหม่
            await userRef.set({
                email: user.email,
                displayName: user.displayName || 'ผู้ใช้ใหม่',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                settings: {
                    currency: 'THB',
                    language: 'th',
                    theme: 'light'
                }
            });
            
            // สร้างหมวดหมู่เริ่มต้น
            await createDefaultCategories(user.uid);
        } else {
            // อัปเดตเวลาล็อกอินล่าสุด
            await userRef.update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    } catch (error) {
        console.error('ข้อผิดพลาดในการบันทึกข้อมูลผู้ใช้:', error);
    }
}

// ฟังก์ชันสำหรับการสร้างหมวดหมู่เริ่มต้น
async function createDefaultCategories(userId) {
    const defaultCategories = [
        // หมวดหารายรับ
        { name: 'เงินเดือน', type: 'income', icon: 'fas fa-money-bill-wave', color: '#28a745' },
        { name: 'โบนัส', type: 'income', icon: 'fas fa-gift', color: '#17a2b8' },
        { name: 'รายได้เสริม', type: 'income', icon: 'fas fa-plus-circle', color: '#ffc107' },
        { name: 'การลงทุน', type: 'income', icon: 'fas fa-chart-line', color: '#6f42c1' },
        
        // หมวดหารายจ่าย
        { name: 'อาหาร', type: 'expense', icon: 'fas fa-utensils', color: '#dc3545' },
        { name: 'การเดินทาง', type: 'expense', icon: 'fas fa-car', color: '#fd7e14' },
        { name: 'ที่อยู่อาศัย', type: 'expense', icon: 'fas fa-home', color: '#6c757d' },
        { name: 'สาธารณูปโภค', type: 'expense', icon: 'fas fa-bolt', color: '#ffc107' },
        { name: 'ความบันเทิง', type: 'expense', icon: 'fas fa-gamepad', color: '#e83e8c' },
        { name: 'สุขภาพ', type: 'expense', icon: 'fas fa-heartbeat', color: '#20c997' },
        { name: 'การศึกษา', type: 'expense', icon: 'fas fa-graduation-cap', color: '#6f42c1' },
        { name: 'ช้อปปิ้ง', type: 'expense', icon: 'fas fa-shopping-cart', color: '#fd7e14' }
    ];
    
    try {
        const batch = db.batch();
        
        defaultCategories.forEach((category, index) => {
            const categoryRef = db.collection('users').doc(userId).collection('categories').doc();
            batch.set(categoryRef, {
                ...category,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                order: index
            });
        });
        
        await batch.commit();
    } catch (error) {
        console.error('ข้อผิดพลาดในการสร้างหมวดหมู่เริ่มต้น:', error);
    }
}

// ฟังก์ชันสำหรับการอัปเดตข้อมูลผู้ใช้ในหน้า dashboard
function updateUserInfo(user) {
    const userDisplayName = document.getElementById('userDisplayName');
    if (userDisplayName) {
        userDisplayName.textContent = user.displayName || user.email;
    }
}

// ฟังก์ชันสำหรับการจัดการฟอร์มล็อกอิน
function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            
            if (!email || !password) {
                showNotification('กรุณากรอกข้อมูลให้ครบถ้วน', 'warning');
                return;
            }
            
            // ตรวจสอบความถูกต้องของอีเมล
            if (!validateEmail(email)) {
                showNotification('รูปแบบอีเมลไม่ถูกต้อง', 'warning');
                return;
            }
            
            await signIn(email, password);
        });
    }
}

// ฟังก์ชันสำหรับการจัดการฟอร์มสมัครสมาชิก
function setupRegisterForm() {
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('registerEmail').value.trim();
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const displayName = document.getElementById('displayName').value.trim();
            
            if (!email || !password || !confirmPassword || !displayName) {
                showNotification('กรุณากรอกข้อมูลให้ครบถ้วน', 'warning');
                return;
            }
            
            if (password !== confirmPassword) {
                showNotification('รหัสผ่านไม่ตรงกัน', 'warning');
                return;
            }
            
            // ตรวจสอบความแข็งแกร่งของรหัสผ่าน
            if (!validatePassword(password)) {
                showNotification('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร และประกอบด้วยตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก ตัวเลข และอักขระพิเศษ', 'warning');
                return;
            }
            
            await signUp(email, password, displayName);
        });
    }
}

// ฟังก์ชันสำหรับการจัดการปุ่มออกจากระบบ
function setupLogoutButton() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await signOut();
        });
    }
}

// ฟังก์ชันสำหรับการจัดการปุ่มแสดง/ซ่อนรหัสผ่าน
function setupPasswordToggle() {
    // ป้องกันการตั้งค่า event listener ซ้ำ
    if (window.passwordToggleInitialized) {
        return;
    }
    
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    
    if (togglePassword && passwordInput) {
        // ลบ event listener เก่าก่อน (ถ้ามี)
        const newTogglePassword = togglePassword.cloneNode(true);
        togglePassword.parentNode.replaceChild(newTogglePassword, togglePassword);
        
        newTogglePassword.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            const icon = newTogglePassword.querySelector('i');
            if (type === 'text') {
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
        
        window.passwordToggleInitialized = true;
    }
    
    // สำหรับฟอร์มสมัครสมาชิก
    const toggleRegisterPassword = document.getElementById('toggleRegisterPassword');
    const registerPasswordInput = document.getElementById('registerPassword');
    
    if (toggleRegisterPassword && registerPasswordInput) {
        // ลบ event listener เก่าก่อน (ถ้ามี)
        const newToggleRegisterPassword = toggleRegisterPassword.cloneNode(true);
        toggleRegisterPassword.parentNode.replaceChild(newToggleRegisterPassword, toggleRegisterPassword);
        
        newToggleRegisterPassword.addEventListener('click', () => {
            const type = registerPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            registerPasswordInput.setAttribute('type', type);
            
            const icon = newToggleRegisterPassword.querySelector('i');
            if (type === 'text') {
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    }
}

// ฟังก์ชันสำหรับการจัดการการลืมรหัสผ่าน
function setupForgotPassword() {
    const forgotPasswordLink = document.getElementById('forgotPassword');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value.trim();
            if (!email) {
                showNotification('กรุณากรอกอีเมลก่อน', 'warning');
                return;
            }
            
            await resetPassword(email);
        });
    }
}

// ฟังก์ชันสำหรับโหลดสถานะ "จดจำฉัน"
function loadRememberMeState() {
    const rememberMeCheckbox = document.getElementById('rememberMe');
    const emailInput = document.getElementById('email');
    
    if (rememberMeCheckbox && emailInput) {
        // โหลดสถานะ checkbox
        const rememberMe = localStorage.getItem('rememberMe');
        if (rememberMe === 'true') {
            rememberMeCheckbox.checked = true;
        }
        
        // โหลดอีเมลที่บันทึกไว้
        const savedEmail = localStorage.getItem('userEmail');
        if (savedEmail) {
            emailInput.value = savedEmail;
        }
    }
}

// ฟังก์ชันสำหรับเริ่มต้นระบบ Auto Logout
function initAutoLogout() {
    // โหลดการตั้งค่าจาก localStorage
    loadAutoLogoutSettings();
    
    // เริ่มต้น inactivity timer
    startInactivityTimer();
    
    // เพิ่ม event listeners สำหรับตรวจจับการใช้งาน
    setupActivityListeners();
}

// ฟังก์ชันสำหรับโหลดการตั้งค่า Auto Logout
function loadAutoLogoutSettings() {
    try {
        const userSettings = JSON.parse(localStorage.getItem('userSettings') || '{}');
        sessionTimeout = parseInt(userSettings.sessionTimeout) || 30;
        autoLogoutEnabled = userSettings.autoLogout !== false; // เปิดใช้งานเป็นค่าเริ่มต้น
    } catch (error) {
        console.error('ข้อผิดพลาดในการโหลดการตั้งค่า Auto Logout:', error);
    }
}

// ฟังก์ชันสำหรับเริ่มต้น inactivity timer
function startInactivityTimer() {
    if (!autoLogoutEnabled) {
        return;
    }
    
    // ล้าง timer เก่า
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
    }
    
    // คำนวณเวลาที่เหลือ
    const timeSinceLastActivity = Date.now() - lastActivity;
    const remainingTime = (sessionTimeout * 60 * 1000) - timeSinceLastActivity;
    
    if (remainingTime <= 0) {
        // ถ้าเกินเวลาแล้ว ให้ logout ทันที
        handleAutoLogout();
        return;
    }
    
    // ตั้ง timer ใหม่
    inactivityTimer = setTimeout(() => {
        handleAutoLogout();
    }, remainingTime);
    
    // แสดงการแจ้งเตือนเมื่อเหลือเวลา 5 นาที
    const warningTime = 5 * 60 * 1000; // 5 นาที
    if (remainingTime > warningTime) {
        setTimeout(() => {
            if (autoLogoutEnabled && auth.currentUser) {
                showNotification('ระบบจะออกจากระบบอัตโนมัติใน 5 นาที เนื่องจากไม่มีการใช้งาน', 'warning');
            }
        }, remainingTime - warningTime);
    }
}

// ฟังก์ชันสำหรับจัดการ Auto Logout
async function handleAutoLogout() {
    if (!auth.currentUser) {
        return;
    }
    
    try {
        showNotification('ออกจากระบบอัตโนมัติเนื่องจากไม่มีการใช้งาน', 'info');
        
        // ออกจากระบบ
        await auth.signOut();
        
        // ล้าง timer
        if (inactivityTimer) {
            clearTimeout(inactivityTimer);
            inactivityTimer = null;
        }
        
        // ไปหน้า login
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
        
    } catch (error) {
        console.error('ข้อผิดพลาดในการ Auto Logout:', error);
    }
}

// ฟังก์ชันสำหรับตั้งค่า event listeners สำหรับตรวจจับการใช้งาน
function setupActivityListeners() {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
        document.addEventListener(event, () => {
            if (autoLogoutEnabled && auth.currentUser) {
                lastActivity = Date.now();
                startInactivityTimer();
            }
        }, true);
    });
    
    // ตรวจจับเมื่อแท็บไม่ active
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // แท็บไม่ active - หยุด timer
            if (inactivityTimer) {
                clearTimeout(inactivityTimer);
                inactivityTimer = null;
            }
        } else {
            // แท็บ active อีกครั้ง - เริ่ม timer ใหม่
            if (autoLogoutEnabled && auth.currentUser) {
                startInactivityTimer();
            }
        }
    });
}

// ฟังก์ชันสำหรับอัปเดตการตั้งค่า Auto Logout
function updateAutoLogoutSettings(newSettings) {
    if (newSettings.hasOwnProperty('sessionTimeout')) {
        sessionTimeout = parseInt(newSettings.sessionTimeout) || 30;
    }
    
    if (newSettings.hasOwnProperty('autoLogoutEnabled')) {
        autoLogoutEnabled = newSettings.autoLogoutEnabled;
    }
    
    // เริ่มต้น timer ใหม่ด้วยการตั้งค่าใหม่
    if (auth.currentUser) {
        startInactivityTimer();
    }
}

// ฟังก์ชันสำหรับหยุด Auto Logout (เมื่อออกจากระบบ)
function stopAutoLogout() {
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
        inactivityTimer = null;
    }
}

// เริ่มต้นระบบ Authentication
document.addEventListener('DOMContentLoaded', () => {
    // รอให้ Firebase พร้อมใช้งาน
    setTimeout(() => {
        checkAuthState();
        setupLoginForm();
        setupRegisterForm();
        setupLogoutButton();
        setupPasswordToggle();
        setupForgotPassword();
        loadRememberMeState(); // โหลดสถานะ "จดจำฉัน"
        initAutoLogout(); // เริ่มต้น Auto Logout
    }, 100);
});

// ส่งออกฟังก์ชันสำหรับใช้ในไฟล์อื่น
window.authFunctions = {
    signIn,
    signUp,
    signOut,
    resetPassword,
    currentUser: () => currentUser,
    updateAutoLogoutSettings,
    stopAutoLogout
};
