// ===== ฟังก์ชันหลักของแอปพลิเคชัน =====
// ไฟล์นี้จัดการฟังก์ชันทั่วไปที่ใช้ในหลายหน้า

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
            
            // ใช้ฟังก์ชันจาก auth.js
            if (window.authFunctions && window.authFunctions.signIn) {
                await window.authFunctions.signIn(email, password);
            } else {
                console.error('ฟังก์ชัน signIn ไม่พร้อมใช้งาน');
            }
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
            
            if (password.length < 6) {
                showNotification('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 'warning');
                return;
            }
            
            // ใช้ฟังก์ชันจาก auth.js
            if (window.authFunctions && window.authFunctions.signUp) {
                await window.authFunctions.signUp(email, password, displayName);
            } else {
                console.error('ฟังก์ชัน signUp ไม่พร้อมใช้งาน');
            }
        });
    }
}

// ฟังก์ชัน setupPasswordToggle ถูกย้ายไปยัง auth.js เพื่อป้องกันการซ้ำซ้อน

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
            
            // ใช้ฟังก์ชันจาก auth.js
            if (window.authFunctions && window.authFunctions.resetPassword) {
                await window.authFunctions.resetPassword(email);
            } else {
                console.error('ฟังก์ชัน resetPassword ไม่พร้อมใช้งาน');
            }
        });
    }
}

// ฟังก์ชันสำหรับการสลับระหว่างฟอร์มล็อกอินและสมัครสมาชิก
function setupFormToggle() {
    const showRegisterFormBtn = document.getElementById('showRegisterForm');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (showRegisterFormBtn && loginForm && registerForm) {
        showRegisterFormBtn.addEventListener('click', () => {
            // ซ่อนฟอร์มล็อกอิน
            loginForm.style.display = 'none';
            
            // แสดงฟอร์มสมัครสมาชิก
            registerForm.style.display = 'block';
            
            // อัปเดตข้อความ
            const title = document.querySelector('.login-form-container h2');
            const subtitle = document.querySelector('.login-form-container p');
            
            if (title) title.textContent = 'สมัครสมาชิก';
            if (subtitle) subtitle.textContent = 'สร้างบัญชีใหม่';
            
            // ซ่อนปุ่มแสดงฟอร์มสมัครสมาชิก
            showRegisterFormBtn.style.display = 'none';
            
            // แสดงปุ่มกลับไปฟอร์มล็อกอิน
            const backToLoginBtn = document.createElement('button');
            backToLoginBtn.className = 'btn btn-outline-secondary mt-2';
            backToLoginBtn.innerHTML = '<i class="fas fa-arrow-left me-2"></i>กลับไปล็อกอิน';
            backToLoginBtn.id = 'backToLoginBtn';
            backToLoginBtn.addEventListener('click', () => {
                // ซ่อนฟอร์มสมัครสมาชิก
                registerForm.style.display = 'none';
                
                // แสดงฟอร์มล็อกอิน
                loginForm.style.display = 'block';
                
                // อัปเดตข้อความ
                if (title) title.textContent = 'เข้าสู่ระบบ';
                if (subtitle) subtitle.textContent = 'ยินดีต้อนรับกลับมา';
                
                // แสดงปุ่มแสดงฟอร์มสมัครสมาชิก
                showRegisterFormBtn.style.display = 'block';
                
                // ลบปุ่มกลับ
                backToLoginBtn.remove();
            });
            
            showRegisterFormBtn.parentNode.appendChild(backToLoginBtn);
        });
    }
}

// ฟังก์ชันสำหรับการตรวจสอบความแข็งแกร่งของรหัสผ่าน
function setupPasswordStrength() {
    const passwordInput = document.getElementById('registerPassword');
    const strengthIndicator = document.getElementById('passwordStrength');
    
    if (passwordInput && strengthIndicator) {
        passwordInput.addEventListener('input', () => {
            const password = passwordInput.value;
            const strength = calculatePasswordStrength(password);
            
            // อัปเดตตัวบ่งชี้ความแข็งแกร่ง
            updatePasswordStrengthIndicator(strength, strengthIndicator);
        });
    }
}

// ฟังก์ชันสำหรับการคำนวณความแข็งแกร่งของรหัสผ่าน
function calculatePasswordStrength(password) {
    let score = 0;
    
    if (password.length >= 8) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    
    return score;
}

// ฟังก์ชันสำหรับการอัปเดตตัวบ่งชี้ความแข็งแกร่งของรหัสผ่าน
function updatePasswordStrengthIndicator(strength, indicator) {
    const strengthTexts = ['อ่อนมาก', 'อ่อน', 'ปานกลาง', 'แข็ง', 'แข็งมาก'];
    const strengthColors = ['danger', 'warning', 'info', 'primary', 'success'];
    
    indicator.textContent = strengthTexts[strength - 1] || '';
    indicator.className = `badge bg-${strengthColors[strength - 1] || 'secondary'}`;
}

// ฟังก์ชันสำหรับการตรวจสอบรูปแบบอีเมล
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// ฟังก์ชันสำหรับการตรวจสอบข้อมูลฟอร์ม
function validateForm(formData) {
    const errors = [];
    
    // ตรวจสอบอีเมล
    if (!formData.email) {
        errors.push('กรุณากรอกอีเมล');
    } else if (!validateEmail(formData.email)) {
        errors.push('รูปแบบอีเมลไม่ถูกต้อง');
    }
    
    // ตรวจสอบรหัสผ่าน
    if (!formData.password) {
        errors.push('กรุณากรอกรหัสผ่าน');
    } else if (formData.password.length < 6) {
        errors.push('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
    }
    
    // ตรวจสอบการยืนยันรหัสผ่าน (สำหรับการสมัครสมาชิก)
    if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
        errors.push('รหัสผ่านไม่ตรงกัน');
    }
    
    // ตรวจสอบชื่อ (สำหรับการสมัครสมาชิก)
    if (formData.displayName && formData.displayName.trim().length < 2) {
        errors.push('ชื่อต้องมีอย่างน้อย 2 ตัวอักษร');
    }
    
    return errors;
}

// ฟังก์ชันสำหรับการแสดงข้อผิดพลาด
function showFormErrors(errors) {
    errors.forEach(error => {
        showNotification(error, 'warning');
    });
}

// ฟังก์ชันสำหรับการจัดการการโหลดหน้า
function setupPageLoading() {
    // แสดง loading เมื่อโหลดหน้า
    const loadingElement = document.createElement('div');
    loadingElement.id = 'pageLoading';
    loadingElement.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-white bg-opacity-75';
    loadingElement.style.zIndex = '9999';
    loadingElement.innerHTML = `
        <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">กำลังโหลด...</span>
        </div>
    `;
    
    document.body.appendChild(loadingElement);
    
    // ซ่อน loading เมื่อโหลดเสร็จ
    window.addEventListener('load', () => {
        setTimeout(() => {
            const loading = document.getElementById('pageLoading');
            if (loading) {
                loading.style.opacity = '0';
                setTimeout(() => loading.remove(), 300);
            }
        }, 500);
    });
}

// ฟังก์ชันสำหรับการจัดการการเชื่อมต่ออินเทอร์เน็ต
function setupOfflineDetection() {
    window.addEventListener('online', () => {
        showNotification('เชื่อมต่ออินเทอร์เน็ตแล้ว', 'success');
    });
    
    window.addEventListener('offline', () => {
        showNotification('ไม่สามารถเชื่อมต่ออินเทอร์เน็ตได้', 'warning');
    });
}

// ฟังก์ชันสำหรับการจัดการการกดปุ่ม Enter
function setupEnterKeyNavigation() {
    document.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const activeElement = document.activeElement;
            
            // ถ้าอยู่ในฟอร์มล็อกอิน
            if (activeElement && activeElement.closest('#loginForm')) {
                const loginForm = document.getElementById('loginForm');
                if (loginForm) {
                    loginForm.dispatchEvent(new Event('submit'));
                }
            }
            
            // ถ้าอยู่ในฟอร์มสมัครสมาชิก
            if (activeElement && activeElement.closest('#registerForm')) {
                const registerForm = document.getElementById('registerForm');
                if (registerForm) {
                    registerForm.dispatchEvent(new Event('submit'));
                }
            }
        }
    });
}

// ฟังก์ชันสำหรับการเริ่มต้นแอปพลิเคชัน
function initApp() {
    // ตั้งค่าฟังก์ชันเฉพาะที่ไม่มีใน auth.js
    setupFormToggle();
    setupPasswordStrength();
    setupPageLoading();
    setupOfflineDetection();
    setupEnterKeyNavigation();
    
    // ตั้งค่าฟังก์ชันที่จำเป็นสำหรับหน้า login (ถ้าอยู่ในหน้า login)
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname === '') {
        setupLoginForm();
        setupRegisterForm();
        // setupPasswordToggle ถูกย้ายไปยัง auth.js
        setupForgotPassword();
    }
}

// เริ่มต้นแอปพลิเคชันเมื่อโหลดเสร็จ
document.addEventListener('DOMContentLoaded', initApp);
