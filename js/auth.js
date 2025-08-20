// ===== ระบบ Authentication =====
// ไฟล์นี้จัดการการเข้าสู่ระบบและการสมัครสมาชิก

// ตัวแปรสำหรับเก็บข้อมูลผู้ใช้ปัจจุบัน
let currentUser = null;

// ตัวแปรสำหรับจำกัดการเรียก API
let loginAttempts = 0;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 นาที
let lockoutTime = 0;

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
            console.log('ผู้ใช้เข้าสู่ระบบ:', user.email);
            
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
            console.log('ผู้ใช้ไม่ได้เข้าสู่ระบบ');
            
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
            
            console.log('สร้างข้อมูลผู้ใช้ใหม่สำเร็จ');
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
        console.log('สร้างหมวดหมู่เริ่มต้นสำเร็จ');
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
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            const icon = togglePassword.querySelector('i');
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
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
    }, 100);
});

// ส่งออกฟังก์ชันสำหรับใช้ในไฟล์อื่น
window.authFunctions = {
    signIn,
    signUp,
    signOut,
    resetPassword,
    currentUser: () => currentUser
};
