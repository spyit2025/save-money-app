// ===== ฟังก์ชันหลักของหน้า Dashboard =====
// ไฟล์นี้จัดการการทำงานของหน้า Dashboard

// ตัวแปรสำหรับเก็บข้อมูล
let transactions = [];
let categories = [];
let goals = [];
let monthlyChart = null;
let transactionsTable = null;

// ฟังก์ชันสำหรับการเริ่มต้นหน้า Dashboard
async function initDashboard() {
    try {
        // รอให้ Firebase Auth พร้อมใช้งาน
        await new Promise((resolve) => {
            const unsubscribe = auth.onAuthStateChanged((user) => {
                unsubscribe();
                resolve(user);
            });
        });
        
        // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้ว
        const user = auth.currentUser;
            if (!user) {
        window.location.href = 'index.html';
        return;
    }
        
        // เริ่มต้นโหลดข้อมูล Dashboard
        
        // โหลดข้อมูลทั้งหมด
        await Promise.all([
            loadCategories(),
            loadTransactions(),
            loadGoals(),
            loadUserSettings()
        ]);
        
        // ไม่สร้างข้อมูลตัวอย่างอัตโนมัติ - ให้ผู้ใช้เพิ่มข้อมูลเอง
        // if (transactions.length === 0) {
        //     await createSampleData(user.uid);
        //     await loadTransactions();
        // }
        
        // เริ่มต้น UI
        setupEventListeners();
        initializeDataTable();
        initializeChart();
        updateDashboardStats();
        loadRecentTransactions();
        
        // เริ่มต้นหน้า Dashboard สำเร็จ
        
    } catch (error) {
        console.error('ข้อผิดพลาดในการเริ่มต้นหน้า Dashboard:', error);
        showNotification('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'danger');
    }
}

// ฟังก์ชันสำหรับการโหลดหมวดหมู่
async function loadCategories() {
    try {
        const user = auth.currentUser;
        const categoriesSnapshot = await db
            .collection('users')
            .doc(user.uid)
            .collection('categories')
            .orderBy('order')
            .get();
        
        categories = categoriesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // ตรวจสอบและลบหมวดหมู่ที่ซ้ำกัน
        await removeDuplicateCategories(user.uid);
        
        // โหลดหมวดหมู่ใหม่หลังจากลบที่ซ้ำ
        const updatedCategoriesSnapshot = await db
            .collection('users')
            .doc(user.uid)
            .collection('categories')
            .orderBy('order')
            .get();
        
        categories = updatedCategoriesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // โหลดหมวดหมู่สำเร็จ
        
        // แสดง/ซ่อนปุ่มสร้างหมวดหมู่
        const createCategoriesBtn = document.getElementById('createCategoriesBtn');
        const createCategoriesTransactionsBtn = document.getElementById('createCategoriesTransactionsBtn');
        
        if (createCategoriesBtn) {
            if (categories.length === 0) {
                createCategoriesBtn.style.display = 'inline-block';
            } else {
                createCategoriesBtn.style.display = 'none';
            }
        }
        
        if (createCategoriesTransactionsBtn) {
            if (categories.length === 0) {
                createCategoriesTransactionsBtn.style.display = 'inline-block';
            } else {
                createCategoriesTransactionsBtn.style.display = 'none';
            }
        }
        
        // ถ้าไม่มีหมวดหมู่ ให้สร้างหมวดหมู่เริ่มต้น
        if (categories.length === 0) {
            // ไม่พบหมวดหมู่ กำลังสร้างหมวดหมู่เริ่มต้น
            await createDefaultCategories(user.uid);
            // โหลดหมวดหมู่ใหม่
            await loadCategories();
        }
        
    } catch (error) {
        console.error('ข้อผิดพลาดในการโหลดหมวดหมู่:', error);
        showNotification('ไม่สามารถโหลดหมวดหมู่ได้', 'danger');
    }
}

// ฟังก์ชันสำหรับลบหมวดหมู่ที่ซ้ำกัน
async function removeDuplicateCategories(userId) {
    try {
        const categoriesSnapshot = await db
            .collection('users')
            .doc(userId)
            .collection('categories')
            .get();
        
        const categories = categoriesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // หาหมวดหมู่ที่ซ้ำกัน
        const seen = new Set();
        const duplicates = [];
        
        categories.forEach(category => {
            const key = `${category.name}-${category.type}`;
            if (seen.has(key)) {
                duplicates.push(category);
            } else {
                seen.add(key);
            }
        });
        
        // ลบหมวดหมู่ที่ซ้ำกัน
        if (duplicates.length > 0) {
            const batch = db.batch();
            
            duplicates.forEach(category => {
                const categoryRef = db
                    .collection('users')
                    .doc(userId)
                    .collection('categories')
                    .doc(category.id);
                batch.delete(categoryRef);
            });
            
            await batch.commit();
            console.log(`ลบหมวดหมู่ที่ซ้ำกัน ${duplicates.length} รายการ`);
        }
        
    } catch (error) {
        console.error('ข้อผิดพลาดในการลบหมวดหมู่ที่ซ้ำกัน:', error);
    }
}

// ฟังก์ชันสำหรับการโหลดรายการ
async function loadTransactions() {
    try {
        const user = auth.currentUser;
        // Loading transactions for user
        
        const transactionsSnapshot = await db
            .collection('users')
            .doc(user.uid)
            .collection('transactions')
            .orderBy('date', 'desc')
            .get();
        
        // Raw transactions snapshot
        
        transactions = transactionsSnapshot.docs.map(doc => {
            const data = doc.data();
            
            // ใช้ DateHelper สำหรับการแปลงวันที่
            const convertedData = window.DateHelper ? 
                window.DateHelper.convertMultipleDates(data, ['date', 'createdAt', 'updatedAt']) :
                {
                    ...data,
                    date: data.date && typeof data.date.toDate === 'function' ? data.date.toDate() : 
                          data.date ? new Date(data.date) : new Date(),
                    createdAt: data.createdAt && typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate() : 
                              data.createdAt ? new Date(data.createdAt) : null,
                    updatedAt: data.updatedAt && typeof data.updatedAt.toDate === 'function' ? data.updatedAt.toDate() : 
                              data.updatedAt ? new Date(data.updatedAt) : null
                };
            
            return {
                id: doc.id,
                ...convertedData
            };
        });
        
        // โหลดรายการสำเร็จ
        
        // อัปเดต mobile cards หลังจากโหลดข้อมูล
        createMobileTableCards();
        createMobileTableCardsPage();
        
    } catch (error) {
        console.error('ข้อผิดพลาดในการโหลดรายการ:', error);
        showNotification('ไม่สามารถโหลดรายการได้', 'danger');
    }
}

// ฟังก์ชันสำหรับการโหลดเป้าหมาย
async function loadGoals() {
    try {
        const user = auth.currentUser;
        const goalsSnapshot = await db
            .collection('users')
            .doc(user.uid)
            .collection('goals')
            .orderBy('createdAt', 'desc')
            .get();
        
        goals = goalsSnapshot.docs.map(doc => {
            const data = doc.data();
            
            // ใช้ DateHelper สำหรับการแปลงวันที่
            const convertedData = window.DateHelper ? 
                window.DateHelper.convertMultipleDates(data, ['targetDate', 'createdAt', 'updatedAt']) :
                {
                    ...data,
                    targetDate: data.targetDate && typeof data.targetDate.toDate === 'function' ? data.targetDate.toDate() : 
                               data.targetDate ? new Date(data.targetDate) : new Date(),
                    createdAt: data.createdAt && typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate() : 
                              data.createdAt ? new Date(data.createdAt) : null,
                    updatedAt: data.updatedAt && typeof data.updatedAt.toDate === 'function' ? data.updatedAt.toDate() : 
                              data.updatedAt ? new Date(data.updatedAt) : null
                };
            
            return {
                id: doc.id,
                ...convertedData
            };
        });
        
        // โหลดเป้าหมายสำเร็จ
        
        // อัปเดตสถิติ Dashboard หลังจากโหลดเป้าหมาย
        updateDashboardStats();
        
    } catch (error) {
        console.error('ข้อผิดพลาดในการโหลดเป้าหมาย:', error);
        // ไม่แสดง notification เนื่องจากอาจเป็นครั้งแรกที่ใช้งาน
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
        { name: 'เงินออม', type: 'income', icon: 'fas fa-piggy-bank', color: '#20c997' },
        
        // หมวดหารายจ่าย
        { name: 'อาหาร', type: 'expense', icon: 'fas fa-utensils', color: '#dc3545' },
        { name: 'การเดินทาง', type: 'expense', icon: 'fas fa-car', color: '#fd7e14' },
        { name: 'ที่อยู่อาศัย', type: 'expense', icon: 'fas fa-home', color: '#6c757d' },
        { name: 'สาธารณูปโภค', type: 'expense', icon: 'fas fa-bolt', color: '#ffc107' },
        { name: 'ความบันเทิง', type: 'expense', icon: 'fas fa-gamepad', color: '#e83e8c' },
        { name: 'สุขภาพ', type: 'expense', icon: 'fas fa-heartbeat', color: '#20c997' },
        { name: 'การศึกษา', type: 'expense', icon: 'fas fa-graduation-cap', color: '#6f42c1' },
        { name: 'ช้อปปิ้ง', type: 'expense', icon: 'fas fa-shopping-cart', color: '#fd7e14' },
        { name: 'ค่าธรรมเนียม', type: 'expense', icon: 'fas fa-credit-card', color: '#6c757d' },
        { name: 'อื่นๆ', type: 'expense', icon: 'fas fa-ellipsis-h', color: '#6c757d' }
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
        showNotification('สร้างหมวดหมู่เริ่มต้นสำเร็จ', 'success');
    } catch (error) {
        console.error('ข้อผิดพลาดในการสร้างหมวดหมู่เริ่มต้น:', error);
        showNotification('เกิดข้อผิดพลาดในการสร้างหมวดหมู่', 'danger');
    }
}

// ฟังก์ชันสำหรับการโหลดการตั้งค่าผู้ใช้
async function loadUserSettings() {
    try {
        const user = auth.currentUser;
        const userDoc = await db
            .collection('users')
            .doc(user.uid)
            .get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            // สามารถใช้ข้อมูลการตั้งค่าได้ที่นี่
            // โหลดการตั้งค่าผู้ใช้สำเร็จ
        }
        
    } catch (error) {
        console.error('ข้อผิดพลาดในการโหลดการตั้งค่าผู้ใช้:', error);
    }
}

// ฟังก์ชันสำหรับการตั้งค่า Event Listeners
function setupEventListeners() {
    // ปุ่มเพิ่มรายการ
    const addTransactionBtn = document.getElementById('addTransactionBtn');
    const addNewTransactionBtn = document.getElementById('addNewTransactionBtn');
    
    if (addTransactionBtn) {
        addTransactionBtn.addEventListener('click', () => {
            showTransactionModal();
        });
    }
    
    if (addNewTransactionBtn) {
        addNewTransactionBtn.addEventListener('click', () => {
            showTransactionModal();
        });
    }
    
    // ปุ่มบันทึกรายการ
    const saveTransactionBtn = document.getElementById('saveTransactionBtn');
    if (saveTransactionBtn) {
        saveTransactionBtn.addEventListener('click', saveTransaction);
    }
    
    // ปุ่มบันทึกเป้าหมาย
    const saveGoalBtn = document.getElementById('saveGoalBtn');
    if (saveGoalBtn) {
        saveGoalBtn.addEventListener('click', saveGoal);
    }
    
    // ปุ่มส่งออกข้อมูล
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportDataAsCSV);
    }
    
    // ปุ่มสร้างหมวดหมู่
    const createCategoriesBtn = document.getElementById('createCategoriesBtn');
    if (createCategoriesBtn) {
        createCategoriesBtn.addEventListener('click', async () => {
            const user = auth.currentUser;
            if (user) {
                await createDefaultCategories(user.uid);
                await loadCategories();
                updateCategoryOptions();
                createCategoriesBtn.style.display = 'none';
            }
        });
    }
    
    // การเปลี่ยนแปลงประเภทรายการ
    const transactionType = document.getElementById('transactionType');
    if (transactionType) {
        transactionType.addEventListener('change', updateCategoryOptions);
    }
    
    // ตั้งค่าวันที่เริ่มต้น
    const transactionDate = document.getElementById('transactionDate');
    if (transactionDate) {
        transactionDate.value = new Date().toISOString().split('T')[0];
    }
    
    // Event Listeners สำหรับกราฟรายเดือน
    const chartMonthSelector = document.getElementById('chartMonthSelector');
    const updateChartBtn = document.getElementById('updateChartBtn');
    
    if (chartMonthSelector) {
        // ตั้งค่าวันที่เริ่มต้นเป็นเดือนปัจจุบัน
        const currentDate = new Date();
        const currentMonth = currentDate.getFullYear() + '-' + String(currentDate.getMonth() + 1).padStart(2, '0');
        chartMonthSelector.value = currentMonth;
        
        // Event listener สำหรับการเปลี่ยนแปลงเดือน
        chartMonthSelector.addEventListener('change', updateMonthlyChart);
    }
    
    if (updateChartBtn) {
        updateChartBtn.addEventListener('click', updateMonthlyChart);
    }
    
    // ตั้งค่า Event Listeners สำหรับเมนู
    setupNavigationListeners();
}

// ฟังก์ชันสำหรับการตั้งค่า Event Listeners ของเมนู
function setupNavigationListeners() {
    // จัดการการคลิกเมนู
    const navLinks = document.querySelectorAll('[data-page]');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            navigateToPage(page);
        });
    });
    
    // จัดการการออกจากระบบ
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
}

// ฟังก์ชันสำหรับการเปลี่ยนหน้า
async function navigateToPage(page) {
    // ลบ active class จากทุกเมนู
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // ลบ active class จากทุก dropdown item
    document.querySelectorAll('.dropdown-item').forEach(link => {
        link.classList.remove('active');
    });
    
    // เพิ่ม active class ให้เมนูที่เลือก
    const activeLink = document.querySelector(`[data-page="${page}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
    
    // ปิด dropdown menu หลังจากเลือก
    const dropdownToggle = document.querySelector('.dropdown-toggle');
    if (dropdownToggle) {
        const dropdown = bootstrap.Dropdown.getOrCreateInstance(dropdownToggle);
        dropdown.hide();
    }
    
    // ซ่อนทุกหน้า
    document.querySelectorAll('.page-content').forEach(content => {
        content.style.display = 'none';
    });
    
    // แสดงหน้าที่เลือก
    const targetPage = document.getElementById(page + 'Page');
    if (targetPage) {
        targetPage.style.display = 'block';
        
        // โหลดข้อมูลเฉพาะหน้าถ้าจำเป็น
        switch (page) {
            case 'dashboard':
                refreshDashboard();
                break;
            case 'transactions':
                loadTransactionsPage();
                break;
            case 'reports':
                loadReportsPage();
                break;
            case 'goals':
                await loadGoalsPage();
                break;
            case 'profile':
                loadProfilePage();
                break;
            case 'settings':
                loadSettingsPage();
                break;
        }
    } else {
        // ถ้าไม่มีหน้าให้กลับไปหน้า Dashboard
        navigateToPage('dashboard');
    }
}

// ฟังก์ชันสำหรับการออกจากระบบ
async function logout() {
    try {
        await auth.signOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('ข้อผิดพลาดในการออกจากระบบ:', error);
        showNotification('เกิดข้อผิดพลาดในการออกจากระบบ', 'danger');
    }
}

// ตัวแปรสำหรับเก็บ Event Listeners ที่เพิ่มแล้ว
let eventListenersAdded = {
    transactions: false,
    reports: false,
    goals: false,
    profile: false,
    settings: false
};

// ตัวแปรสำหรับเก็บ ID ของรายการที่กำลังแก้ไข
let editingTransactionId = null;

// ฟังก์ชันสำหรับการโหลดหน้าต่างๆ
function loadTransactionsPage() {
    // หน้าตารางรายการ (ใช้ข้อมูลที่มีอยู่แล้ว)
    
    // สร้าง mobile cards สำหรับมือถือ (เรียกใช้ทันที)
    setTimeout(() => {
        createMobileTableCardsPage();
    }, 100);
    
    // เริ่มต้น DataTable สำหรับหน้า Transactions
    initializeTransactionsPageDataTable();
    
    // ตั้งค่า Event Listeners สำหรับปุ่มในหน้า Transactions (เฉพาะครั้งแรก)
    if (!eventListenersAdded.transactions) {
        const exportCSVBtn = document.getElementById('exportCSVBtn');
        const exportExcelBtn = document.getElementById('exportExcelBtn');
        const addTransactionFromPageBtn = document.getElementById('addTransactionFromPageBtn');
        
        if (exportCSVBtn) {
            exportCSVBtn.addEventListener('click', exportDataAsCSV);
        }
        
        if (exportExcelBtn) {
            exportExcelBtn.addEventListener('click', exportDataAsExcel);
        }
        
        if (addTransactionFromPageBtn) {
            addTransactionFromPageBtn.addEventListener('click', () => {
                showTransactionModal();
            });
        }
        
        // ปุ่มสร้างหมวดหมู่ในหน้า Transactions
        const createCategoriesTransactionsBtn = document.getElementById('createCategoriesTransactionsBtn');
        if (createCategoriesTransactionsBtn) {
            createCategoriesTransactionsBtn.addEventListener('click', async () => {
                const user = auth.currentUser;
                if (user) {
                    await createDefaultCategories(user.uid);
                    await loadCategories();
                    updateCategoryOptions();
                    createCategoriesTransactionsBtn.style.display = 'none';
                }
            });
        }
        
        eventListenersAdded.transactions = true;
    }
}

function loadReportsPage() {
    // หน้ารายงาน
    
    // ตั้งค่า Event Listeners สำหรับหน้ารายงาน (เฉพาะครั้งแรก)
    if (!eventListenersAdded.reports) {
        // เพิ่ม Event Listeners สำหรับหน้ารายงานที่นี่
        eventListenersAdded.reports = true;
    }
    
    // แสดงข้อมูลรายงานพื้นฐาน
    updateReportsData();
}

async function loadGoalsPage() {
    // หน้าเป้าหมาย
    
    // ตั้งค่า Event Listeners สำหรับหน้าเป้าหมาย (เฉพาะครั้งแรก)
    if (!eventListenersAdded.goals) {
        // ตรวจสอบและลบข้อมูลซ้ำจาก Firestore (ครั้งแรกเท่านั้น)
        await window.removeDuplicateGoalsFromFirestore();
        eventListenersAdded.goals = true;
    }
    
    // แสดงข้อมูลเป้าหมายพื้นฐาน
    updateGoalsData();
}

function loadProfilePage() {
    // อัปเดต HTML ในหน้าโปรไฟล์
    const profilePage = document.getElementById('profilePage');
    if (profilePage) {
        const user = auth.currentUser;
        const userInfo = JSON.parse(localStorage.getItem('userSettings') || '{}');
        
        // สร้าง Avatar URL ที่ดีขึ้น
        const avatarName = userInfo.displayName || user.email.split('@')[0];
        const avatarUrl = userInfo.avatarData || `https://ui-avatars.com/api/?name=${encodeURIComponent(avatarName)}&size=150&background=007bff&color=fff&rounded=true&bold=true&font-size=0.4`;
        
        profilePage.innerHTML = `
            <!-- หัวข้อหลัก -->
            <div class="row mb-4">
                <div class="col-12 text-center">
                    <h2 class="mb-1">
                        <i class="fas fa-user-circle me-2 text-primary"></i>
                        โปรไฟล์ผู้ใช้
                    </h2>
                    <p class="text-muted">จัดการข้อมูลส่วนตัวและดูสถิติการใช้งาน</p>
                </div>
            </div>

            <!-- ข้อมูลโปรไฟล์หลัก -->
            <div class="row g-4">
                <!-- Avatar และข้อมูลส่วนตัว -->
                <div class="col-lg-4 col-md-12">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-body text-center">
                            <div class="position-relative d-inline-block mb-4">
                                <img src="${avatarUrl}" 
                                     alt="Avatar" class="rounded-circle shadow-lg profile-avatar" 
                                     width="150" height="150">
                                <button class="btn btn-primary btn-sm position-absolute bottom-0 end-0 rounded-circle shadow avatar-camera-btn" 
                                        style="width: 45px; height: 45px;" 
                                        onclick="changeAvatar()" title="เปลี่ยนรูปโปรไฟล์">
                                    <i class="fas fa-camera"></i>
                                </button>
                            </div>
                            
                            <h5 class="mb-1">${userInfo.displayName || 'ผู้ใช้ใหม่'}</h5>
                            <p class="text-muted mb-3">${user.email}</p>
                            
                            <div class="d-grid gap-2">
                                <button type="button" class="btn btn-outline-primary" onclick="changePassword()">
                                    <i class="fas fa-key me-2"></i>เปลี่ยนรหัสผ่าน
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ฟอร์มแก้ไขข้อมูล -->
                <div class="col-lg-8 col-md-12">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-header bg-transparent border-0">
                            <h5 class="card-title mb-0">
                                <i class="fas fa-edit me-2 text-success"></i>
                                แก้ไขข้อมูลส่วนตัว
                            </h5>
                        </div>
                        <div class="card-body">
                            <form id="profileForm" class="profile-form">
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label for="displayName" class="form-label fw-bold">
                                            <i class="fas fa-user me-1"></i>ชื่อแสดง
                                        </label>
                                        <input type="text" class="form-control" id="displayName" 
                                               value="${userInfo.displayName || ''}" 
                                               placeholder="กรอกชื่อแสดง">
                                        <div class="form-text">ชื่อที่แสดงในแอปพลิเคชัน</div>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label for="email" class="form-label fw-bold">
                                            <i class="fas fa-envelope me-1"></i>อีเมล
                                        </label>
                                        <input type="email" class="form-control" id="email" 
                                               value="${user.email}" readonly>
                                        <div class="form-text">ไม่สามารถแก้ไขได้</div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label for="phone" class="form-label fw-bold">
                                            <i class="fas fa-phone me-1"></i>เบอร์โทรศัพท์
                                        </label>
                                        <input type="tel" class="form-control" id="phone" 
                                               value="${userInfo.phone || ''}" 
                                               placeholder="กรอกเบอร์โทรศัพท์">
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label for="birthDate" class="form-label fw-bold">
                                            <i class="fas fa-birthday-cake me-1"></i>วันเกิด
                                        </label>
                                        <input type="date" class="form-control" id="birthDate" 
                                               value="${userInfo.birthDate || ''}">
                                    </div>
                                </div>
                                <div class="mb-4">
                                    <label for="bio" class="form-label fw-bold">
                                        <i class="fas fa-info-circle me-1"></i>เกี่ยวกับฉัน
                                    </label>
                                    <textarea class="form-control" id="bio" rows="4" 
                                              placeholder="เล่าเกี่ยวกับตัวคุณ...">${userInfo.bio || ''}</textarea>
                                    <div class="form-text">ข้อมูลเพิ่มเติมเกี่ยวกับตัวคุณ</div>
                                </div>
                                <div class="d-flex gap-2">
                                    <button type="button" class="btn btn-primary btn-lg" onclick="saveProfile()">
                                        <i class="fas fa-save me-2"></i>บันทึกข้อมูล
                                    </button>
                                    <button type="button" class="btn btn-outline-secondary" onclick="resetProfileForm()">
                                        <i class="fas fa-undo me-1"></i>รีเซ็ต
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            <!-- สถิติและข้อมูลล่าสุด -->
            <div class="row g-4 mt-2">
                <!-- สถิติการใช้งาน -->
                <div class="col-lg-6 col-md-12">
                    <div class="card border-0 shadow-sm">
                        <div class="card-header bg-transparent border-0">
                            <h6 class="card-title mb-0">
                                <i class="fas fa-chart-line me-2 text-success"></i>
                                สถิติการใช้งาน
                            </h6>
                        </div>
                        <div class="card-body">
                            <div class="row text-center">
                                <div class="col-4">
                                    <div class="mb-2">
                                        <div class="bg-primary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center stats-icon">
                                            <i class="fas fa-list-alt fa-2x text-primary"></i>
                                        </div>
                                    </div>
                                    <h4 class="mb-0 fw-bold">${transactions.length}</h4>
                                    <small class="text-muted">รายการทั้งหมด</small>
                                </div>
                                <div class="col-4">
                                    <div class="mb-2">
                                        <div class="bg-warning bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center stats-icon">
                                            <i class="fas fa-bullseye fa-2x text-warning"></i>
                                        </div>
                                    </div>
                                    <h4 class="mb-0 fw-bold">${goals.length}</h4>
                                    <small class="text-muted">เป้าหมาย</small>
                                </div>
                                <div class="col-4">
                                    <div class="mb-2">
                                        <div class="bg-info bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center stats-icon">
                                            <i class="fas fa-tags fa-2x text-info"></i>
                                        </div>
                                    </div>
                                    <h4 class="mb-0 fw-bold">${categories.length}</h4>
                                    <small class="text-muted">หมวดหมู่</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ข้อมูลล่าสุด -->
                <div class="col-lg-6 col-md-12">
                    <div class="card border-0 shadow-sm">
                        <div class="card-header bg-transparent border-0">
                            <h6 class="card-title mb-0">
                                <i class="fas fa-clock me-2 text-info"></i>
                                ข้อมูลล่าสุด
                            </h6>
                        </div>
                        <div class="card-body">
                            <div class="d-flex align-items-center mb-3 profile-info-item">
                                <div class="bg-success bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center profile-info-icon">
                                    <i class="fas fa-calendar-plus text-success"></i>
                                </div>
                                <div>
                                    <strong>สมาชิกตั้งแต่:</strong><br>
                                    <span class="text-muted">${user.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('th-TH', {year: 'numeric', month: 'long', day: 'numeric'}) : 'ไม่ทราบ'}</span>
                                </div>
                            </div>
                            <div class="d-flex align-items-center mb-3 profile-info-item">
                                <div class="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center profile-info-icon">
                                    <i class="fas fa-sign-in-alt text-primary"></i>
                                </div>
                                <div>
                                    <strong>เข้าสู่ระบบล่าสุด:</strong><br>
                                    <span class="text-muted">${user.metadata?.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleDateString('th-TH', {year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'}) : 'ไม่ทราบ'}</span>
                                </div>
                            </div>
                            <div class="d-flex align-items-center profile-info-item">
                                <div class="bg-success bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center profile-info-icon">
                                    <i class="fas fa-check-circle text-success"></i>
                                </div>
                                <div>
                                    <strong>สถานะบัญชี:</strong><br>
                                    <span class="badge bg-success">ใช้งานได้</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

function loadSettingsPage() {
    // อัปเดต HTML ในหน้าตั้งค่า
    const settingsPage = document.getElementById('settingsPage');
    if (settingsPage) {
        const userSettings = JSON.parse(localStorage.getItem('userSettings') || '{}');
        
        settingsPage.innerHTML = `
            <!-- หัวข้อหลัก -->
            <div class="row mb-4">
                <div class="col-12 text-center">
                    <h2 class="mb-1">
                        <i class="fas fa-cog me-2 text-primary"></i>
                        ตั้งค่าระบบ
                    </h2>
                    <p class="text-muted">จัดการการตั้งค่าและกำหนดลักษณะการทำงานของแอปพลิเคชัน</p>
                </div>
            </div>

            <!-- Cards แบบ 3 คอลัมน์ -->
            <div class="row g-4">
                <!-- Card 1: การแจ้งเตือน -->
                <div class="col-lg-4 col-md-6 col-12">
                    <div class="notification-card h-100">
                        <div class="notification-header">
                            <div class="notification-icon">
                                <i class="fas fa-bell"></i>
                            </div>
                            <h6>การแจ้งเตือน</h6>
                            <span class="notification-status ${userSettings.enableNotifications !== false ? 'active' : 'inactive'}">
                                ${userSettings.enableNotifications !== false ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                            </span>
                        </div>
                        <div class="form-check form-switch mb-3">
                            <input class="form-check-input" type="checkbox" id="enableNotifications" 
                                   ${userSettings.enableNotifications !== false ? 'checked' : ''}>
                            <label class="form-check-label" for="enableNotifications">
                                เปิดการแจ้งเตือน
                            </label>
                            <div class="form-text">แจ้งเตือนเมื่อมีกิจกรรมสำคัญ</div>
                        </div>
                        <div class="form-check form-switch mb-3">
                            <input class="form-check-input" type="checkbox" id="goalNotifications" 
                                   ${userSettings.goalNotifications !== false ? 'checked' : ''}>
                            <label class="form-check-label" for="goalNotifications">
                                แจ้งเตือนเป้าหมาย
                            </label>
                            <div class="form-text">แจ้งเตือนเมื่อใกล้ถึงเป้าหมายหรือครบกำหนด</div>
                        </div>
                        <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="budgetAlerts" 
                                   ${userSettings.budgetAlerts !== false ? 'checked' : ''}>
                            <label class="form-check-label" for="budgetAlerts">
                                แจ้งเตือนงบประมาณ
                            </label>
                            <div class="form-text">แจ้งเตือนเมื่อใช้จ่ายเกินกำหนด</div>
                        </div>
                    </div>
                </div>

                <!-- Card 2: การแสดงผล -->
                <div class="col-lg-4 col-md-6 col-12">
                    <div class="notification-card h-100">
                        <div class="notification-header">
                            <div class="notification-icon" style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);">
                                <i class="fas fa-palette"></i>
                            </div>
                            <h6>การแสดงผล</h6>
                            <span class="notification-status active">
                                ธีม: ${userSettings.theme === 'dark' ? 'มืด' : userSettings.theme === 'auto' ? 'อัตโนมัติ' : 'สว่าง'}
                            </span>
                        </div>
                        <div class="mb-3">
                            <label for="theme" class="form-label fw-bold">
                                <i class="fas fa-moon me-1"></i>ธีม
                            </label>
                            <select class="form-select" id="theme">
                                <option value="light" ${userSettings.theme === 'light' || !userSettings.theme ? 'selected' : ''}>💡 สว่าง</option>
                                <option value="dark" ${userSettings.theme === 'dark' ? 'selected' : ''}>🌙 มืด</option>
                                <option value="auto" ${userSettings.theme === 'auto' ? 'selected' : ''}>🔄 อัตโนมัติ</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label for="currency" class="form-label fw-bold">
                                <i class="fas fa-coins me-1"></i>หน่วยเงิน
                            </label>
                            <select class="form-select" id="currency">
                                <option value="THB" ${userSettings.currency === 'THB' || !userSettings.currency ? 'selected' : ''}>🇹🇭 บาท (฿)</option>
                                <option value="USD" ${userSettings.currency === 'USD' ? 'selected' : ''}>🇺🇸 ดอลลาร์ ($)</option>
                                <option value="EUR" ${userSettings.currency === 'EUR' ? 'selected' : ''}>🇪🇺 ยูโร (€)</option>
                            </select>
                        </div>
                        <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="compactView" 
                                   ${userSettings.compactView ? 'checked' : ''}>
                            <label class="form-check-label" for="compactView">
                                <i class="fas fa-compress-alt me-1"></i>มุมมองแบบกะทัดรัด
                            </label>
                            <div class="form-text">แสดงข้อมูลในพื้นที่น้อยลง</div>
                        </div>
                    </div>
                </div>

                <!-- Card 3: ความปลอดภัย -->
                <div class="col-lg-4 col-md-12 col-12">
                    <div class="notification-card h-100">
                        <div class="notification-header">
                            <div class="notification-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                                <i class="fas fa-shield-alt"></i>
                            </div>
                            <h6>ความปลอดภัย</h6>
                            <span class="notification-status ${userSettings.autoLogout !== false ? 'active' : 'inactive'}">
                                ${userSettings.autoLogout !== false ? 'ปลอดภัย' : 'ปกติ'}
                            </span>
                        </div>
                        <div class="form-check form-switch mb-3">
                            <input class="form-check-input" type="checkbox" id="autoLogout" 
                                   ${userSettings.autoLogout !== false ? 'checked' : ''}>
                            <label class="form-check-label" for="autoLogout">
                                <i class="fas fa-sign-out-alt me-1"></i>ออกจากระบบอัตโนมัติ
                            </label>
                            <div class="form-text">ออกจากระบบเมื่อไม่ใช้งานนาน</div>
                        </div>
                        <div class="mb-3">
                            <label for="sessionTimeout" class="form-label fw-bold">
                                <i class="fas fa-clock me-1"></i>หมดเวลาเซสชัน
                            </label>
                            <select class="form-select" id="sessionTimeout">
                                <option value="15" ${userSettings.sessionTimeout === '15' ? 'selected' : ''}>⚡ 15 นาที</option>
                                <option value="30" ${userSettings.sessionTimeout === '30' || !userSettings.sessionTimeout ? 'selected' : ''}>⏰ 30 นาที</option>
                                <option value="60" ${userSettings.sessionTimeout === '60' ? 'selected' : ''}>🕐 1 ชั่วโมง</option>
                                <option value="120" ${userSettings.sessionTimeout === '120' ? 'selected' : ''}>🕑 2 ชั่วโมง</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Card การสำรองข้อมูล (แยกแถว) -->
            <div class="row g-4 mt-2">
                <div class="col-12">
                    <div class="notification-card">
                        <div class="notification-header">
                            <div class="notification-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                                <i class="fas fa-database"></i>
                            </div>
                            <h6>การสำรองข้อมูล</h6>
                            <span class="notification-status active">พร้อมใช้งาน</span>
                        </div>
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <div class="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                                    <div>
                                        <strong><i class="fas fa-download me-2 text-primary"></i>ส่งออกข้อมูลทั้งหมด</strong>
                                        <div class="form-text">ดาวน์โหลดข้อมูลเป็นไฟล์ JSON</div>
                                    </div>
                                    <button type="button" class="btn btn-outline-primary" onclick="exportAllData()">
                                        <i class="fas fa-download me-1"></i>ส่งออก
                                    </button>
                                </div>
                            </div>
                            <div class="col-md-6 mb-3">
                                <div class="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                                    <div>
                                        <strong><i class="fas fa-upload me-2 text-secondary"></i>นำเข้าข้อมูล</strong>
                                        <div class="form-text">อัปโหลดไฟล์สำรองข้อมูล</div>
                                    </div>
                                    <input type="file" id="importFile" accept=".json" style="display: none;" onchange="importData(this)">
                                    <button type="button" class="btn btn-outline-secondary" onclick="document.getElementById('importFile').click()">
                                        <i class="fas fa-upload me-1"></i>นำเข้า
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ปุ่มควบคุม -->
            <div class="row mt-4">
                <div class="col-12">
                    <div class="d-flex gap-3 justify-content-between flex-wrap">
                        <div class="d-flex gap-2">
                            <button type="button" class="btn btn-primary btn-lg" onclick="saveSettings()">
                                <i class="fas fa-save me-2"></i>บันทึกการตั้งค่า
                            </button>
                            <button type="button" class="btn btn-outline-secondary" onclick="resetSettings()">
                                <i class="fas fa-undo me-1"></i>รีเซ็ต
                            </button>
                        </div>
                        <button type="button" class="btn btn-outline-danger" onclick="deleteAccount()">
                            <i class="fas fa-trash me-1"></i>ลบบัญชี
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // ตั้งค่า Event Listeners สำหรับการแจ้งเตือน
        setTimeout(() => {
            setupNotificationListeners();
        }, 100);
    }
}

// ฟังก์ชันสำหรับการเริ่มต้น DataTable
function initializeDataTable() {
    try {
        const table = document.getElementById('transactionsTable');
        if (table) {
            // ตรวจสอบว่า DataTable ถูกโหลดแล้วหรือไม่
            if (typeof $.fn.DataTable === 'undefined') {
                console.error('DataTable ไม่พร้อมใช้งาน');
                return;
            }
            
            // สร้าง mobile cards สำหรับมือถือ
            createMobileTableCards();
            
            transactionsTable = $('#transactionsTable').DataTable({
                data: transactions,
                columns: [
                    { 
                        data: 'createdAt',
                        render: function(data, type, row) {
                            // ใช้ createdAt ถ้ามี หรือ date ถ้าไม่มี (สำหรับข้อมูลเก่า)
                            const dateToShow = data ? new Date(data) : new Date(row.date);
                            return dateToShow.toLocaleDateString('th-TH', {
                                year: '2-digit',
                                month: '2-digit',
                                day: '2-digit'
                            }) + ' ' + dateToShow.toLocaleTimeString('th-TH', {
                                hour: '2-digit',
                                minute: '2-digit'
                            });
                        },
                        className: 'text-nowrap'
                    },
                    { 
                        data: 'updatedAt',
                        render: function(data) {
                            if (!data) return '-';
                            const dateToShow = new Date(data);
                            return dateToShow.toLocaleDateString('th-TH', {
                                year: '2-digit',
                                month: '2-digit',
                                day: '2-digit'
                            }) + ' ' + dateToShow.toLocaleTimeString('th-TH', {
                                hour: '2-digit',
                                minute: '2-digit'
                            });
                        },
                        className: 'text-nowrap'
                    },
                    { 
                        data: 'category',
                        render: function(data) {
                            const category = categories.find(cat => cat.id === data);
                            return category ? category.name : data;
                        },
                        className: 'text-nowrap'
                    },
                    { 
                        data: 'description',
                        className: 'text-break'
                    },
                    { 
                        data: 'amount',
                        render: function(data, type, row) {
                            const formattedAmount = new Intl.NumberFormat('th-TH', {
                                style: 'currency',
                                currency: 'THB'
                            }).format(data);
                            
                            const colorClass = row.type === 'income' ? 'text-success' : 'text-danger';
                            return `<span class="${colorClass} fw-bold">${formattedAmount}</span>`;
                        },
                        className: 'text-nowrap text-end'
                    },
                    { 
                        data: 'type',
                        render: function(data) {
                            const badgeClass = data === 'income' ? 'badge bg-success' : 'badge bg-danger';
                            const text = data === 'income' ? 'รายรับ' : 'รายจ่าย';
                            return `<span class="${badgeClass}">${text}</span>`;
                        },
                        className: 'text-center'
                    },
                    {
                        data: 'id',
                        render: function(data, type, row) {
                            return `
                                <div class="btn-group btn-group-sm flex-nowrap">
                                    <button class="btn btn-outline-primary btn-sm" onclick="editTransaction('${data}')" title="แก้ไข">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-outline-danger btn-sm" onclick="deleteTransaction('${data}')" title="ลบ">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            `;
                        },
                        className: 'text-center',
                        orderable: false
                    }
                ],
                order: [[0, 'desc']],
                pageLength: 10,
                language: {
                    "lengthMenu": "แสดง _MENU_ รายการต่อหน้า",
                    "zeroRecords": "<div class='text-center py-4'><i class='fas fa-inbox fa-3x text-muted mb-3'></i><h6 class='text-muted'>ยังไม่มีรายการใดๆ</h6><p class='text-muted mb-3'>เริ่มต้นด้วยการเพิ่มรายการแรกของคุณ</p><button class='btn btn-primary' onclick='showTransactionModal()'><i class='fas fa-plus me-1'></i>เพิ่มรายการแรก</button></div>",
                    "info": "แสดงหน้า _PAGE_ จาก _PAGES_",
                    "infoEmpty": "ไม่มีข้อมูล",
                    "infoFiltered": "(กรองจาก _MAX_ รายการทั้งหมด)",
                    "search": "ค้นหา:",
                    "paginate": {
                        "first": "หน้าแรก",
                        "last": "หน้าสุดท้าย",
                        "next": "ถัดไป",
                        "previous": "ก่อนหน้า"
                    },
                    "processing": "กำลังประมวลผล...",
                    "loadingRecords": "กำลังโหลด...",
                    "emptyTable": "<div class='text-center py-4'><i class='fas fa-inbox fa-3x text-muted mb-3'></i><h6 class='text-muted'>ยังไม่มีรายการใดๆ</h6><p class='text-muted mb-3'>เริ่มต้นด้วยการเพิ่มรายการแรกของคุณ</p><button class='btn btn-primary' onclick='showTransactionModal()'><i class='fas fa-plus me-1'></i>เพิ่มรายการแรก</button></div>"
                },
                responsive: true,
                autoWidth: false,
                scrollX: true,
                scrollCollapse: true,
                drawCallback: function() {
                    // อัปเดต mobile cards หลังจาก DataTable วาดใหม่
                    createMobileTableCards();
                }
            });
        }
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการเริ่มต้น DataTable:', error);
    }
}

// ฟังก์ชันสำหรับสร้าง Mobile Card Layout
function createMobileTableCards() {
    try {
        // หาตาราง transactionsTable (ของ Dashboard) และ container ของมัน
        const transactionsTable = document.getElementById('transactionsTable');
        if (!transactionsTable) return;
        
        const tableContainer = transactionsTable.closest('.table-responsive');
        if (!tableContainer) return;
        
        // ตรวจสอบขนาดหน้าจอ - ถ้าเป็นเดสก์ท็อปไม่ต้องสร้าง mobile cards
        if (window.innerWidth > 768) {
            const existingCards = tableContainer.querySelector('.mobile-table-cards');
            if (existingCards) {
                existingCards.remove();
            }
            return;
        }
        
        // ลบ mobile cards เดิม (ถ้ามี)
        const existingCards = tableContainer.querySelector('.mobile-table-cards');
        if (existingCards) {
            existingCards.remove();
        }
        
        // สร้าง container สำหรับ mobile cards
        const mobileCardsContainer = document.createElement('div');
        mobileCardsContainer.className = 'mobile-table-cards';
        
        // ตรวจสอบว่ามีข้อมูลหรือไม่
        if (transactions.length === 0) {
            // แสดงข้อความเมื่อไม่มีข้อมูล
            const noDataCard = document.createElement('div');
            noDataCard.className = 'table-card';
            noDataCard.innerHTML = `
                <div class="table-card-header">
                    <span>ไม่มีข้อมูล</span>
                </div>
                <div class="table-card-body text-center">
                    <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                    <h6 class="text-muted">ยังไม่มีรายการใดๆ</h6>
                    <p class="text-muted mb-3">เริ่มต้นด้วยการเพิ่มรายการแรกของคุณ</p>
                    <button class="btn btn-primary" onclick="showTransactionModal()">
                        <i class="fas fa-plus me-1"></i>เพิ่มรายการแรก
                    </button>
                </div>
            `;
            mobileCardsContainer.appendChild(noDataCard);
        } else {
            // ระบบ Pagination สำหรับ Mobile Cards
            const itemsPerPage = 5;
            const totalPages = Math.ceil(transactions.length / itemsPerPage);
            
            // สร้าง container สำหรับ cards ที่แสดงในหน้าปัจจุบัน
            const cardsPageContainer = document.createElement('div');
            cardsPageContainer.className = 'mobile-cards-page';
            cardsPageContainer.setAttribute('data-current-page', '1');
            
            // แสดง cards เฉพาะหน้าปัจจุบัน
            const startIndex = 0;
            const endIndex = Math.min(itemsPerPage, transactions.length);
            const currentPageTransactions = transactions.slice(startIndex, endIndex);
            
            currentPageTransactions.forEach(transaction => {
                const card = createTransactionCard(transaction);
                cardsPageContainer.appendChild(card);
            });
            
            mobileCardsContainer.appendChild(cardsPageContainer);
            
            // เพิ่ม Pagination Controls ถ้ามีมากกว่า 1 หน้า
            if (totalPages > 1) {
                const paginationContainer = document.createElement('div');
                paginationContainer.className = 'mobile-pagination d-flex justify-content-center align-items-center mt-3';
                
                // ปุ่มหน้าก่อนหน้า
                const prevButton = document.createElement('button');
                prevButton.className = 'btn btn-outline-primary btn-sm me-2';
                prevButton.innerHTML = '<i class="fas fa-chevron-left"></i> หน้าก่อนหน้า';
                prevButton.disabled = true;
                prevButton.onclick = () => changeMobilePage(-1, totalPages, transactions, mobileCardsContainer, paginationContainer);
                
                // แสดงหน้าปัจจุบัน
                const pageInfo = document.createElement('span');
                pageInfo.className = 'mx-3 text-muted';
                pageInfo.textContent = `หน้า 1 จาก ${totalPages}`;
                
                // ปุ่มหน้าถัดไป
                const nextButton = document.createElement('button');
                nextButton.className = 'btn btn-outline-primary btn-sm ms-2';
                nextButton.innerHTML = 'หน้าถัดไป <i class="fas fa-chevron-right"></i>';
                nextButton.onclick = () => changeMobilePage(1, totalPages, transactions, mobileCardsContainer, paginationContainer);
                
                paginationContainer.appendChild(prevButton);
                paginationContainer.appendChild(pageInfo);
                paginationContainer.appendChild(nextButton);
                
                mobileCardsContainer.appendChild(paginationContainer);
            }
        }
        
        // เพิ่ม mobile cards ลงใน container
        tableContainer.appendChild(mobileCardsContainer);
        
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการสร้าง Mobile Cards:', error);
    }
}

// ฟังก์ชันสำหรับสร้าง Card สำหรับแต่ละ Transaction
function createTransactionCard(transaction) {
    const card = document.createElement('div');
    card.className = 'table-card';
    
    // หาข้อมูลหมวดหมู่
    const category = categories.find(cat => cat.id === transaction.category);
    const categoryName = category ? category.name : transaction.category;
    
    // จัดรูปแบบวันที่
    const createdAt = transaction.createdAt ? new Date(transaction.createdAt) : new Date(transaction.date);
    const updatedAt = transaction.updatedAt ? new Date(transaction.updatedAt) : null;
    
    const formattedCreatedAt = createdAt.toLocaleDateString('th-TH', {
        year: '2-digit',
        month: '2-digit',
        day: '2-digit'
    }) + ' ' + createdAt.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const formattedUpdatedAt = updatedAt ? updatedAt.toLocaleDateString('th-TH', {
        year: '2-digit',
        month: '2-digit',
        day: '2-digit'
    }) + ' ' + updatedAt.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit'
    }) : '-';
    
    // จัดรูปแบบจำนวนเงิน
    const formattedAmount = new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB'
    }).format(transaction.amount);
    
    // สร้าง badge สำหรับประเภท
    const badgeClass = transaction.type === 'income' ? 'badge bg-success' : 'badge bg-danger';
    const typeText = transaction.type === 'income' ? 'รายรับ' : 'รายจ่าย';
    
    card.innerHTML = `
        <div class="table-card-header">
            <span>รายการที่ ${transaction.id.slice(-6)}</span>
            <span class="badge ${badgeClass}">${typeText}</span>
        </div>
        <div class="table-card-body">
            <div class="table-card-row">
                <span class="table-card-label">วันที่สร้าง:</span>
                <span class="table-card-value date">${formattedCreatedAt}</span>
            </div>
            <div class="table-card-row">
                <span class="table-card-label">วันที่แก้ไข:</span>
                <span class="table-card-value date">${formattedUpdatedAt}</span>
            </div>
            <div class="table-card-row">
                <span class="table-card-label">หมวดหมู่:</span>
                <span class="table-card-value category">${categoryName}</span>
            </div>
            <div class="table-card-row">
                <span class="table-card-label">รายละเอียด:</span>
                <span class="table-card-value description">${transaction.description}</span>
            </div>
            <div class="table-card-row">
                <span class="table-card-label">จำนวนเงิน:</span>
                <span class="table-card-value amount ${transaction.type}">${formattedAmount}</span>
            </div>
            <div class="table-card-actions">
                <button class="btn btn-outline-primary btn-sm" onclick="editTransaction('${transaction.id}')" title="แก้ไข">
                    <i class="fas fa-edit"></i> แก้ไข
                </button>
                <button class="btn btn-outline-danger btn-sm" onclick="deleteTransaction('${transaction.id}')" title="ลบ">
                    <i class="fas fa-trash"></i> ลบ
                </button>
            </div>
        </div>
    `;
    
    return card;
}

// ฟังก์ชันสำหรับการเริ่มต้น DataTable ในหน้า Transactions
function initializeTransactionsPageDataTable() {
    try {
        const table = document.getElementById('transactionsTablePage');
        if (table) {
            // ตรวจสอบว่า DataTable ถูกโหลดแล้วหรือไม่
            if (typeof $.fn.DataTable === 'undefined') {
                console.error('DataTable ไม่พร้อมใช้งาน');
                return;
            }
            
            // สร้าง mobile cards สำหรับมือถือ
            createMobileTableCardsPage();
            
            // ตรวจสอบว่า DataTable ถูกเริ่มต้นแล้วหรือไม่
            if ($.fn.DataTable.isDataTable('#transactionsTablePage')) {
                // ถ้าเริ่มต้นแล้ว ให้อัปเดตข้อมูล
                const dataTable = $('#transactionsTablePage').DataTable();
                dataTable.clear();
                dataTable.rows.add(transactions);
                dataTable.draw();
                return;
            }
            
            // เริ่มต้น DataTable ใหม่
            $('#transactionsTablePage').DataTable({
                data: transactions,
                columns: [
                    { 
                        data: 'createdAt',
                        render: function(data, type, row) {
                            // ใช้ createdAt ถ้ามี หรือ date ถ้าไม่มี (สำหรับข้อมูลเก่า)
                            const dateToShow = data ? new Date(data) : new Date(row.date);
                            return dateToShow.toLocaleDateString('th-TH', {
                                year: '2-digit',
                                month: '2-digit',
                                day: '2-digit'
                            }) + ' ' + dateToShow.toLocaleTimeString('th-TH', {
                                hour: '2-digit',
                                minute: '2-digit'
                            });
                        },
                        className: 'text-nowrap'
                    },
                    { 
                        data: 'updatedAt',
                        render: function(data) {
                            if (!data) return '-';
                            const dateToShow = new Date(data);
                            return dateToShow.toLocaleDateString('th-TH', {
                                year: '2-digit',
                                month: '2-digit',
                                day: '2-digit'
                            }) + ' ' + dateToShow.toLocaleTimeString('th-TH', {
                                hour: '2-digit',
                                minute: '2-digit'
                            });
                        },
                        className: 'text-nowrap'
                    },
                    { 
                        data: 'category',
                        render: function(data) {
                            const category = categories.find(cat => cat.id === data);
                            return category ? category.name : data;
                        },
                        className: 'text-nowrap'
                    },
                    { 
                        data: 'description',
                        className: 'text-break'
                    },
                    { 
                        data: 'amount',
                        render: function(data, type, row) {
                            const formattedAmount = new Intl.NumberFormat('th-TH', {
                                style: 'currency',
                                currency: 'THB'
                            }).format(data);
                            
                            const colorClass = row.type === 'income' ? 'text-success' : 'text-danger';
                            return `<span class="${colorClass} fw-bold">${formattedAmount}</span>`;
                        },
                        className: 'text-nowrap text-end'
                    },
                    { 
                        data: 'type',
                        render: function(data) {
                            const badgeClass = data === 'income' ? 'badge bg-success' : 'badge bg-danger';
                            const text = data === 'income' ? 'รายรับ' : 'รายจ่าย';
                            return `<span class="${badgeClass}">${text}</span>`;
                        },
                        className: 'text-center'
                    },
                    {
                        data: 'id',
                        render: function(data, type, row) {
                            return `
                                <div class="btn-group btn-group-sm flex-nowrap">
                                    <button class="btn btn-outline-primary btn-sm" onclick="editTransaction('${data}')" title="แก้ไข">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-outline-danger btn-sm" onclick="deleteTransaction('${data}')" title="ลบ">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            `;
                        },
                        className: 'text-center',
                        orderable: false
                    }
                ],
                order: [[0, 'desc']],
                pageLength: 10,
                language: {
                    "lengthMenu": "แสดง _MENU_ รายการต่อหน้า",
                    "zeroRecords": "<div class='text-center py-4'><i class='fas fa-inbox fa-3x text-muted mb-3'></i><h6 class='text-muted'>ยังไม่มีรายการใดๆ</h6><p class='text-muted mb-3'>เริ่มต้นด้วยการเพิ่มรายการแรกของคุณ</p><button class='btn btn-primary' onclick='showTransactionModal()'><i class='fas fa-plus me-1'></i>เพิ่มรายการแรก</button></div>",
                    "info": "แสดงหน้า _PAGE_ จาก _PAGES_",
                    "infoEmpty": "ไม่มีข้อมูล",
                    "infoFiltered": "(กรองจาก _MAX_ รายการทั้งหมด)",
                    "search": "ค้นหา:",
                    "paginate": {
                        "first": "หน้าแรก",
                        "last": "หน้าสุดท้าย",
                        "next": "ถัดไป",
                        "previous": "ก่อนหน้า"
                    },
                    "processing": "กำลังประมวลผล...",
                    "loadingRecords": "กำลังโหลด...",
                    "emptyTable": "<div class='text-center py-4'><i class='fas fa-inbox fa-3x text-muted mb-3'></i><h6 class='text-muted'>ยังไม่มีรายการใดๆ</h6><p class='text-muted mb-3'>เริ่มต้นด้วยการเพิ่มรายการแรกของคุณ</p><button class='btn btn-primary' onclick='showTransactionModal()'><i class='fas fa-plus me-1'></i>เพิ่มรายการแรก</button></div>"
                },
                responsive: true,
                autoWidth: false,
                scrollX: true,
                scrollCollapse: true,
                drawCallback: function() {
                    // อัปเดต mobile cards หลังจาก DataTable วาดใหม่
                    setTimeout(() => {
                        createMobileTableCardsPage();
                    }, 50);
                }
            });
        }
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการเริ่มต้น DataTable หน้า Transactions:', error);
    }
}

// ฟังก์ชันสำหรับการเริ่มต้นกราฟ
function initializeChart() {
    const ctx = document.getElementById('monthlyChart');
    
    if (ctx) {
        const chartData = getMonthlyChartData();
        
        try {
            monthlyChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: chartData.labels,
                    datasets: [
                        {
                            label: 'รายรับ',
                            data: chartData.income,
                            borderColor: '#28a745',
                            backgroundColor: 'rgba(40, 167, 69, 0.8)',
                            borderWidth: 1
                        },
                        {
                            label: 'รายจ่าย',
                            data: chartData.expense,
                            borderColor: '#dc3545',
                            backgroundColor: 'rgba(220, 53, 69, 0.8)',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                usePointStyle: true,
                                padding: 20
                            }
                        },
                        title: {
                            display: true,
                            text: 'สถิติรายเดือน',
                            font: {
                                size: 16,
                                weight: 'bold'
                            },
                            padding: {
                                top: 10,
                                bottom: 20
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                font: {
                                    size: 12
                                }
                            }
                        },
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.1)'
                            },
                            ticks: {
                                font: {
                                    size: 11
                                },
                                callback: function(value) {
                                    return new Intl.NumberFormat('th-TH', {
                                        style: 'currency',
                                        currency: 'THB'
                                    }).format(value);
                                }
                            }
                        }
                    }
                }
            });
            
            // แสดงการแจ้งเตือนถ้าไม่มีข้อมูล
            if (transactions.length === 0) {
                showNotification('ไม่พบข้อมูลรายการ กรุณาเพิ่มรายการเพื่อดูสถิติ', 'info');
            }
            
            // ตั้งค่าวันที่เริ่มต้นในตัวเลือกเดือน
            const chartMonthSelector = document.getElementById('chartMonthSelector');
            if (chartMonthSelector) {
                const currentDate = new Date();
                const currentMonth = currentDate.getFullYear() + '-' + String(currentDate.getMonth() + 1).padStart(2, '0');
                chartMonthSelector.value = currentMonth;
                console.log('Set initial month selector value to:', currentMonth);
            }
        } catch (error) {
            console.error('Error creating chart:', error);
            showNotification('เกิดข้อผิดพลาดในการสร้างกราฟ', 'danger');
        }
    } else {
        console.error('Chart canvas element not found!');
        showNotification('ไม่พบองค์ประกอบกราฟ', 'danger');
    }
}

// ฟังก์ชันสำหรับการคำนวณข้อมูลกราฟรายเดือน
function getMonthlyChartData(selectedMonth = null) {
    const months = [];
    const incomeData = [];
    const expenseData = [];
    
    // ถ้าไม่มีข้อมูล ให้แสดงข้อมูลว่าง
    if (transactions.length === 0) {
        if (!selectedMonth) {
            // แสดง 6 เดือนย้อนหลัง
            for (let i = 5; i >= 0; i--) {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                
                const monthName = date.toLocaleDateString('th-TH', { month: 'short' });
                months.push(monthName);
                
                // ข้อมูลว่าง
                incomeData.push(0);
                expenseData.push(0);
            }
        } else {
            // แสดงข้อมูลของเดือนที่เลือก
            const [year, month] = selectedMonth.split('-').map(Number);
            const selectedDate = new Date(year, month - 1, 1);
            
            const monthName = selectedDate.toLocaleDateString('th-TH', { 
                month: 'long',
                year: 'numeric'
            });
            months.push(monthName);
            
            // ข้อมูลว่าง
            incomeData.push(0);
            expenseData.push(0);
        }
    } else {
        // ถ้าไม่ได้เลือกเดือน ให้แสดง 6 เดือนย้อนหลัง
        if (!selectedMonth) {
            for (let i = 5; i >= 0; i--) {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                
                const monthName = date.toLocaleDateString('th-TH', { month: 'short' });
                months.push(monthName);
                
                // คำนวณรายรับและรายจ่ายของเดือนนั้น
                const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
                const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
                
                const monthTransactions = transactions.filter(t => {
                    const transactionDate = new Date(t.date);
                    return transactionDate >= monthStart && transactionDate <= monthEnd;
                });
                
                const income = monthTransactions
                    .filter(t => t.type === 'income')
                    .reduce((sum, t) => sum + t.amount, 0);
                
                const expense = monthTransactions
                    .filter(t => t.type === 'expense')
                    .reduce((sum, t) => sum + t.amount, 0);
                
                incomeData.push(income);
                expenseData.push(expense);
            }
        } else {
            // แสดงข้อมูลของเดือนที่เลือก
            const [year, month] = selectedMonth.split('-').map(Number);
            const selectedDate = new Date(year, month - 1, 1);
            
            // แสดงชื่อเดือน
            const monthName = selectedDate.toLocaleDateString('th-TH', { 
                month: 'long',
                year: 'numeric'
            });
            months.push(monthName);
            
            // คำนวณรายรับและรายจ่ายของเดือนที่เลือก
            const monthStart = new Date(year, month - 1, 1);
            const monthEnd = new Date(year, month, 0);
            
            const monthTransactions = transactions.filter(t => {
                const transactionDate = new Date(t.date);
                return transactionDate >= monthStart && transactionDate <= monthEnd;
            });
            
            const income = monthTransactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + t.amount, 0);
            
            const expense = monthTransactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + t.amount, 0);
            
            incomeData.push(income);
            expenseData.push(expense);
        }
    }
    
    const result = {
        labels: months,
        income: incomeData,
        expense: expenseData
    };
    
    return result;
}

// ฟังก์ชันสำหรับการอัปเดตกราฟรายเดือน
function updateMonthlyChart() {
    const chartMonthSelector = document.getElementById('chartMonthSelector');
    const selectedMonth = chartMonthSelector ? chartMonthSelector.value : null;
    
    if (monthlyChart) {
        const chartData = getMonthlyChartData(selectedMonth);
        
        // อัปเดตข้อมูลกราฟ
        monthlyChart.data.labels = chartData.labels;
        monthlyChart.data.datasets[0].data = chartData.income;
        monthlyChart.data.datasets[1].data = chartData.expense;
        
        // อัปเดตชื่อกราฟ
        if (selectedMonth) {
            const titleText = `สถิติรายเดือน - ${chartData.labels[0]}`;
            monthlyChart.options.plugins.title.text = titleText;
        } else {
            const titleText = 'สถิติรายเดือน';
            monthlyChart.options.plugins.title.text = titleText;
        }
        
        monthlyChart.update();
        
        // แสดงการแจ้งเตือน
        if (selectedMonth) {
            const message = `อัปเดตกราฟสำหรับเดือน ${chartData.labels[0]} แล้ว`;
            showNotification(message, 'success');
        } else {
            const message = 'อัปเดตกราฟรายเดือนแล้ว';
            showNotification(message, 'success');
        }
    }
}

// ฟังก์ชันสำหรับการอัปเดตสถิติ Dashboard
function updateDashboardStats() {
    // คำนวณยอดรวมการออม
    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const totalSavings = totalIncome - totalExpense;
    
    // คำนวณรายรับและรายจ่ายเดือนนี้
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate.getMonth() === currentMonth && 
               transactionDate.getFullYear() === currentYear;
    });
    
    const monthlyIncome = monthlyTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const monthlyExpense = monthlyTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    // คำนวณเป้าหมายที่กำลังดำเนินการ
    const activeGoals = goals.filter(goal => goal.status === 'active').length;
    
    // อัปเดต UI
    const totalSavingsElement = document.getElementById('totalSavings');
    const monthlyIncomeElement = document.getElementById('monthlyIncome');
    const monthlyExpenseElement = document.getElementById('monthlyExpense');
    const activeGoalsElement = document.getElementById('activeGoals');
    
    if (totalSavingsElement) {
        totalSavingsElement.textContent = new Intl.NumberFormat('th-TH', {
            style: 'currency',
            currency: 'THB'
        }).format(totalSavings);
    }
    
    if (monthlyIncomeElement) {
        monthlyIncomeElement.textContent = new Intl.NumberFormat('th-TH', {
            style: 'currency',
            currency: 'THB'
        }).format(monthlyIncome);
    }
    
    if (monthlyExpenseElement) {
        monthlyExpenseElement.textContent = new Intl.NumberFormat('th-TH', {
            style: 'currency',
            currency: 'THB'
        }).format(monthlyExpense);
    }
    
    if (activeGoalsElement) {
        activeGoalsElement.textContent = activeGoals;
    }
}

// ฟังก์ชันสำหรับการโหลดรายการล่าสุด
function loadRecentTransactions() {
    const recentContainer = document.getElementById('recentTransactions');
    if (recentContainer) {
        const recentTransactions = transactions.slice(0, 5);
        
        if (recentTransactions.length === 0) {
            recentContainer.innerHTML = `
                <div class="list-group-item text-center text-muted">
                    <i class="fas fa-inbox fa-2x mb-2"></i>
                    <p class="mb-0">ยังไม่มีรายการ</p>
                </div>
            `;
            return;
        }
        
        recentContainer.innerHTML = recentTransactions.map(transaction => {
            const category = categories.find(cat => cat.id === transaction.category);
            const categoryName = category ? category.name : transaction.category;
            const amountClass = transaction.type === 'income' ? 'text-success' : 'text-danger';
            const amountPrefix = transaction.type === 'income' ? '+' : '-';
            
            return `
                <div class="list-group-item">
                    <div class="transaction-item">
                        <div class="transaction-info">
                            <div class="fw-bold">${categoryName}</div>
                            <div class="text-muted small">${transaction.description}</div>
                            <div class="text-muted small">${new Date(transaction.date).toLocaleDateString('th-TH')}</div>
                        </div>
                        <div class="transaction-amount ${amountClass}">
                            ${amountPrefix}${new Intl.NumberFormat('th-TH', {
                                style: 'currency',
                                currency: 'THB'
                            }).format(transaction.amount)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

// ฟังก์ชันสำหรับการแสดง Modal เพิ่มรายการ
function showTransactionModal(transactionId = null) {
    const modalElement = document.getElementById('transactionModal');
    const modal = new bootstrap.Modal(modalElement);
    const modalTitle = document.getElementById('transactionModalTitle');
    const form = document.getElementById('transactionForm');
    
    // รีเซ็ตฟอร์ม
    form.reset();
    
    // เก็บ ID ของรายการที่กำลังแก้ไข
    editingTransactionId = transactionId;
    
    if (transactionId) {
        // แก้ไขรายการ
        const transaction = transactions.find(t => t.id === transactionId);
        if (transaction) {
            modalTitle.innerHTML = '<i class="fas fa-edit me-2"></i>แก้ไขรายการ';
            fillTransactionForm(transaction);
        }
    } else {
        // เพิ่มรายการใหม่
        modalTitle.innerHTML = '<i class="fas fa-plus me-2"></i>เพิ่มรายการใหม่';
        document.getElementById('transactionDate').value = new Date().toISOString().split('T')[0];
        // อัปเดตตัวเลือกหมวดหมู่สำหรับรายการใหม่
        updateCategoryOptions();
    }
    
    // จัดการ focus เมื่อ Modal เปิด
    modalElement.addEventListener('shown.bs.modal', function () {
        // ลบ aria-hidden เมื่อ modal เปิด
        modalElement.removeAttribute('aria-hidden');
        
        const firstInput = modalElement.querySelector('input, select, textarea');
        if (firstInput) {
            firstInput.focus();
        }
    }, { once: true });
    
    // จัดการ focus เมื่อ Modal ปิด
    modalElement.addEventListener('hidden.bs.modal', function () {
        // เพิ่ม aria-hidden เมื่อ modal ปิด
        modalElement.setAttribute('aria-hidden', 'true');
        
        // ย้าย focus ไปยัง element ที่ปลอดภัยนอก modal
        const safeFocusElement = document.querySelector('body') || document.documentElement;
        if (safeFocusElement) {
            safeFocusElement.focus();
        }
    }, { once: true });
    
    // แสดง Modal
    modal.show();
}

// ฟังก์ชันสำหรับการกรอกข้อมูลในฟอร์มแก้ไขรายการ
function fillTransactionForm(transaction) {
    document.getElementById('transactionType').value = transaction.type;
    document.getElementById('transactionAmount').value = transaction.amount;
    document.getElementById('transactionDescription').value = transaction.description;
    document.getElementById('transactionDate').value = new Date(transaction.date).toISOString().split('T')[0];
    
    // อัปเดตตัวเลือกหมวดหมู่ตามประเภทที่เลือก แล้วค่อยตั้งค่าหมวดหมู่
    updateCategoryOptions();
    document.getElementById('transactionCategory').value = transaction.category;
}

// ฟังก์ชันสำหรับการอัปเดตตัวเลือกหมวดหมู่
function updateCategoryOptions() {
    const transactionType = document.getElementById('transactionType');
    const categorySelect = document.getElementById('transactionCategory');
    
    if (transactionType && categorySelect) {
        // เก็บค่าที่เลือกไว้ก่อน
        const currentSelectedValue = categorySelect.value;
        
        const selectedType = transactionType.value;
        const filteredCategories = categories.filter(cat => cat.type === selectedType);
        
        // ลบหมวดหมู่ที่ซ้ำกันในตัวเลือก
        const uniqueCategories = [];
        const seen = new Set();
        
        filteredCategories.forEach(category => {
            const key = category.name;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueCategories.push(category);
            }
        });
        
        categorySelect.innerHTML = '<option value="">เลือกหมวดหมู่</option>';
        uniqueCategories.forEach(category => {
            const isSelected = category.id === currentSelectedValue ? 'selected' : '';
            categorySelect.innerHTML += `
                <option value="${category.id}" ${isSelected}>${category.name}</option>
            `;
        });
    }
}

// ฟังก์ชันสำหรับการบันทึกรายการ
async function saveTransaction() {
    try {
        const form = document.getElementById('transactionForm');
        const formData = new FormData(form);
        
        const transactionData = {
            type: document.getElementById('transactionType').value,
            amount: parseFloat(document.getElementById('transactionAmount').value),
            category: document.getElementById('transactionCategory').value,
            description: document.getElementById('transactionDescription').value,
            date: new Date(document.getElementById('transactionDate').value)
        };
        
        // ตรวจสอบข้อมูล
        if (!transactionData.type || !transactionData.amount || !transactionData.category) {
            showNotification('กรุณากรอกข้อมูลให้ครบถ้วน', 'warning');
            return;
        }
        
        const user = auth.currentUser;
        let transactionRef;
        
        if (editingTransactionId) {
            // อัปเดตรายการที่มีอยู่
            transactionRef = db
                .collection('users')
                .doc(user.uid)
                .collection('transactions')
                .doc(editingTransactionId);
            
            // เพิ่ม updatedAt timestamp
            transactionData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
            
            await transactionRef.update(transactionData);
            showNotification('อัปเดตรายการสำเร็จ', 'success');
        } else {
            // เพิ่มรายการใหม่
            transactionRef = db
                .collection('users')
                .doc(user.uid)
                .collection('transactions')
                .doc();
            
            // เพิ่ม createdAt timestamp
            transactionData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            
            await transactionRef.set(transactionData);
            showNotification('เพิ่มรายการสำเร็จ', 'success');
        }
        
        // รีเซ็ตตัวแปร editingTransactionId
        editingTransactionId = null;
        
        // ปิด Modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('transactionModal'));
        modal.hide();
        
        // รีเฟรชข้อมูล
        await loadTransactions();
        refreshDashboard();
        
    } catch (error) {
        console.error('ข้อผิดพลาดในการบันทึกรายการ:', error);
        showNotification('เกิดข้อผิดพลาดในการบันทึกรายการ', 'danger');
    }
}

// ฟังก์ชันสำหรับการรีเฟรช Dashboard
function refreshDashboard() {
    // อัปเดต DataTable ในหน้า Dashboard
    if (transactionsTable) {
        transactionsTable.clear();
        transactionsTable.rows.add(transactions);
        transactionsTable.draw();
        // อัปเดต mobile cards
        createMobileTableCards();
    }
    
    // อัปเดต DataTable ในหน้า Transactions
    if ($.fn.DataTable.isDataTable('#transactionsTablePage')) {
        const transactionsPageTable = $('#transactionsTablePage').DataTable();
        transactionsPageTable.clear();
        transactionsPageTable.rows.add(transactions);
        transactionsPageTable.draw();
        // อัปเดต mobile cards
        createMobileTableCardsPage();
    }
    
    // อัปเดตกราฟ
    if (monthlyChart) {
        const chartData = getMonthlyChartData();
        monthlyChart.data.labels = chartData.labels;
        monthlyChart.data.datasets[0].data = chartData.income;
        monthlyChart.data.datasets[1].data = chartData.expense;
        monthlyChart.update();
    }
    
    // อัปเดตสถิติและรายการล่าสุด
    updateDashboardStats();
    loadRecentTransactions();
}

// ฟังก์ชันสำหรับการอัปเดตข้อมูลรายงาน
function updateReportsData() {
    try {
        // คำนวณสถิติพื้นฐาน
        const totalIncome = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const totalExpense = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const balance = totalIncome - totalExpense;
        
        // สถิติรายเดือน
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const monthlyIncome = transactions
            .filter(t => {
                const date = new Date(t.date);
                return t.type === 'income' && 
                       date.getMonth() === currentMonth && 
                       date.getFullYear() === currentYear;
            })
            .reduce((sum, t) => sum + t.amount, 0);
            
        const monthlyExpense = transactions
            .filter(t => {
                const date = new Date(t.date);
                return t.type === 'expense' && 
                       date.getMonth() === currentMonth && 
                       date.getFullYear() === currentYear;
            })
            .reduce((sum, t) => sum + t.amount, 0);
        
        // อัปเดต HTML ในหน้ารายงาน
        const reportsPage = document.getElementById('reportsPage');
        if (reportsPage) {
            reportsPage.innerHTML = `
                <div class="row">
                    <div class="col-12">
                        <div class="card border-0 shadow-sm">
                            <div class="card-header bg-transparent border-0">
                                <h5 class="card-title mb-0">
                                    <i class="fas fa-chart-bar me-2 text-primary"></i>
                                    รายงานการเงิน
                                </h5>
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-3 mb-3">
                                        <div class="card bg-white text-success border-success shadow-sm">
                                            <div class="card-body text-center">
                                                <i class="fas fa-money-bill-wave fs-3 mb-2 text-success"></i>
                                                <h6 class="text-success">รายรับรวม</h6>
                                                <h4 class="text-success">฿${totalIncome.toLocaleString('th-TH')}</h4>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-3 mb-3">
                                        <div class="card bg-white text-danger border-danger shadow-sm">
                                            <div class="card-body text-center">
                                                <i class="fas fa-shopping-cart fs-3 mb-2 text-danger"></i>
                                                <h6 class="text-danger">รายจ่ายรวม</h6>
                                                <h4 class="text-danger">฿${totalExpense.toLocaleString('th-TH')}</h4>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-3 mb-3">
                                        <div class="card bg-white ${balance >= 0 ? 'text-primary border-primary' : 'text-warning border-warning'} shadow-sm">
                                            <div class="card-body text-center">
                                                <i class="fas fa-piggy-bank fs-3 mb-2 ${balance >= 0 ? 'text-primary' : 'text-warning'}"></i>
                                                <h6 class="${balance >= 0 ? 'text-primary' : 'text-warning'}">ยอดคงเหลือ</h6>
                                                <h4 class="${balance >= 0 ? 'text-primary' : 'text-warning'}">฿${balance.toLocaleString('th-TH')}</h4>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-3 mb-3">
                                        <div class="card bg-white text-info border-info shadow-sm">
                                            <div class="card-body text-center">
                                                <i class="fas fa-list-alt fs-3 mb-2 text-info"></i>
                                                <h6 class="text-info">รายการทั้งหมด</h6>
                                                <h4 class="text-info">${transactions.length}</h4>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="row mt-4">
                                    <div class="col-md-6">
                                        <div class="card">
                                            <div class="card-header">
                                                <h6>รายรับ/รายจ่ายเดือนนี้</h6>
                                            </div>
                                            <div class="card-body">
                                                <div class="d-flex justify-content-between mb-2">
                                                    <span>รายรับ: ฿${monthlyIncome.toLocaleString('th-TH')}</span>
                                                    <span class="text-success">+${monthlyIncome.toLocaleString('th-TH')}</span>
                                                </div>
                                                <div class="d-flex justify-content-between mb-2">
                                                    <span>รายจ่าย: ฿${monthlyExpense.toLocaleString('th-TH')}</span>
                                                    <span class="text-danger">-${monthlyExpense.toLocaleString('th-TH')}</span>
                                                </div>
                                                <hr>
                                                <div class="d-flex justify-content-between">
                                                    <strong>คงเหลือ: ฿${(monthlyIncome - monthlyExpense).toLocaleString('th-TH')}</strong>
                                                    <strong class="${(monthlyIncome - monthlyExpense) >= 0 ? 'text-success' : 'text-danger'}">
                                                        ${(monthlyIncome - monthlyExpense) >= 0 ? '+' : ''}${(monthlyIncome - monthlyExpense).toLocaleString('th-TH')}
                                                    </strong>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="card">
                                            <div class="card-header">
                                                <h6>หมวดหมู่ที่ใช้บ่อย</h6>
                                            </div>
                                            <div class="card-body">
                                                ${getTopCategories()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('ข้อผิดพลาดในการอัปเดตข้อมูลรายงาน:', error);
        showNotification('เกิดข้อผิดพลาดในการโหลดรายงาน', 'danger');
    }
}

// ฟังก์ชันสำหรับการตรวจสอบและลบข้อมูลเป้าหมายที่ซ้ำ
function removeDuplicateGoals() {
    const uniqueGoals = [];
    const seenTitles = new Set();
    
    goals.forEach(goal => {
        // ใช้ title และ targetAmount เป็นเกณฑ์ในการตรวจสอบการซ้ำ
        const key = `${goal.title}-${goal.targetAmount}`;
        if (!seenTitles.has(key)) {
            seenTitles.add(key);
            uniqueGoals.push(goal);
        } else {
            console.warn('พบเป้าหมายซ้ำ:', goal.title);
        }
    });
    
    if (uniqueGoals.length !== goals.length) {
        goals = uniqueGoals;
    }
}

// ฟังก์ชันสำหรับการลบข้อมูลเป้าหมายที่ซ้ำออกจาก Firestore
window.removeDuplicateGoalsFromFirestore = async function removeDuplicateGoalsFromFirestore() {
    try {
        const user = auth.currentUser;
        const goalsSnapshot = await db
            .collection('users')
            .doc(user.uid)
            .collection('goals')
            .get();
        
        const goalsByTitle = {};
        const duplicatesToDelete = [];
        
        // จัดกลุ่มเป้าหมายตาม title และ targetAmount
        goalsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const key = `${data.title}-${data.targetAmount}`;
            
            if (goalsByTitle[key]) {
                // พบข้อมูลซ้ำ - เก็บ document ที่เก่ากว่าไว้ลบ
                const existingCreatedAt = goalsByTitle[key].createdAt;
                const currentCreatedAt = data.createdAt;
                
                if (currentCreatedAt && existingCreatedAt && currentCreatedAt.toMillis() < existingCreatedAt.toMillis()) {
                    // ข้อมูลปัจจุบันเก่ากว่า ลบอันใหม่แทน
                    duplicatesToDelete.push(goalsByTitle[key].id);
                    goalsByTitle[key] = { id: doc.id, ...data };
                } else {
                    // ข้อมูลปัจจุบันใหม่กว่า ลบอันเก่า
                    duplicatesToDelete.push(doc.id);
                }
            } else {
                goalsByTitle[key] = { id: doc.id, ...data };
            }
        });
        
        // ลบข้อมูลซ้ำ
        if (duplicatesToDelete.length > 0) {
            const batch = db.batch();
            duplicatesToDelete.forEach(docId => {
                const docRef = db
                    .collection('users')
                    .doc(user.uid)
                    .collection('goals')
                    .doc(docId);
                batch.delete(docRef);
            });
            
            await batch.commit();
            showNotification(`ลบข้อมูลเป้าหมายที่ซ้ำสำเร็จ: ${duplicatesToDelete.length} รายการ`, 'success');
            
            // โหลดข้อมูลใหม่
            await loadGoals();
            updateDashboardStats(); // อัปเดตสถิติ Dashboard
            return true;
        } else {
            showNotification('ไม่พบข้อมูลเป้าหมายที่ซ้ำ', 'info');
        }
        
        return false;
    } catch (error) {
        console.error('ข้อผิดพลาดในการลบข้อมูลเป้าหมายที่ซ้ำ:', error);
        return false;
    }
};

// ฟังก์ชันสำหรับการอัปเดตข้อมูลเป้าหมาย
function updateGoalsData() {
    try {
        // คำนวณสถิติเป้าหมาย
        const totalGoals = goals.length;
        const completedGoals = goals.filter(goal => goal.status === 'completed').length;
        const activeGoals = goals.filter(goal => goal.status === 'active').length;
        
        // อัปเดต HTML ในหน้าเป้าหมาย
        const goalsPage = document.getElementById('goalsPage');
        if (goalsPage) {
            let goalsListHtml = '';
            
            if (totalGoals === 0) {
                goalsListHtml = `
                    <div class="text-center mt-4">
                        <i class="fas fa-bullseye fa-3x text-muted mb-3"></i>
                        <h5 class="text-muted">ยังไม่มีเป้าหมาย</h5>
                        <p class="text-muted">เริ่มต้นสร้างเป้าหมายการออมของคุณ</p>
                        <button class="btn btn-primary" onclick="showGoalModal()">
                            <i class="fas fa-plus me-1"></i>
                            สร้างเป้าหมายแรก
                        </button>
                    </div>
                `;
            } else {
                goalsListHtml = `
                    <div class="row mt-4">
                        ${goals.map(goal => {
                            const progress = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
                            const progressColor = progress >= 100 ? 'success' : progress >= 75 ? 'info' : progress >= 50 ? 'warning' : 'danger';
                            const statusBadge = goal.status === 'completed' ? 'badge bg-success' : 'badge bg-primary';
                            const statusText = goal.status === 'completed' ? 'สำเร็จ' : 'กำลังดำเนินการ';
                            const daysLeft = Math.ceil((goal.targetDate - new Date()) / (1000 * 60 * 60 * 24));
                            const categoryNames = {
                                'travel': 'ท่องเที่ยว',
                                'vehicle': 'ยานพาหนะ',
                                'house': 'ที่อยู่อาศัย',
                                'education': 'การศึกษา',
                                'emergency': 'เงินฉุกเฉิน',
                                'investment': 'การลงทุน',
                                'gadget': 'เครื่องใช้/อุปกรณ์',
                                'other': 'อื่นๆ'
                            };
                            
                            return `
                                <div class="col-md-6 mb-4">
                                    <div class="card border-0 shadow-sm h-100">
                                        <div class="card-header bg-transparent border-0 d-flex justify-content-between align-items-center">
                                            <h6 class="mb-0 fw-bold">${goal.title}</h6>
                                            <div class="d-flex align-items-center">
                                                <span class="${statusBadge} me-2">${statusText}</span>
                                                <div class="btn-group btn-group-sm">
                                                    <button class="btn btn-outline-primary btn-sm" onclick="editGoal('${goal.id}')" title="แก้ไขเป้าหมาย">
                                                        <i class="fas fa-edit"></i>
                                                    </button>
                                                    <button class="btn btn-outline-danger btn-sm" onclick="deleteGoal('${goal.id}')" title="ลบเป้าหมาย">
                                                        <i class="fas fa-trash"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="card-body">
                                            <div class="mb-2">
                                                <small class="text-muted">หมวดหมู่: ${categoryNames[goal.category] || goal.category}</small>
                                            </div>
                                            <div class="mb-3">
                                                <div class="d-flex justify-content-between align-items-center mb-1">
                                                    <small>ความคืบหน้า</small>
                                                    <small class="fw-bold">${progress.toFixed(1)}%</small>
                                                </div>
                                                <div class="progress" style="height: 8px;">
                                                    <div class="progress-bar bg-${progressColor}" role="progressbar" 
                                                         style="width: ${progress}%" aria-valuenow="${progress}" 
                                                         aria-valuemin="0" aria-valuemax="100"></div>
                                                </div>
                                            </div>
                                            <div class="row text-center">
                                                <div class="col-6">
                                                    <small class="text-muted">ปัจจุบัน</small>
                                                    <div class="fw-bold text-primary">฿${goal.currentAmount.toLocaleString('th-TH')}</div>
                                                    <button class="btn btn-outline-success btn-sm mt-1" onclick="updateGoalProgress('${goal.id}', ${goal.currentAmount + 1000})" title="เพิ่ม 1,000 บาท">
                                                        <i class="fas fa-plus"></i> 1K
                                                    </button>
                                                </div>
                                                <div class="col-6">
                                                    <small class="text-muted">เป้าหมาย</small>
                                                    <div class="fw-bold text-success">฿${goal.targetAmount.toLocaleString('th-TH')}</div>
                                                    <button class="btn btn-outline-info btn-sm mt-1" onclick="showUpdateProgressModal('${goal.id}')" title="อัปเดตความคืบหน้า">
                                                        <i class="fas fa-edit"></i> แก้ไข
                                                    </button>
                                                </div>
                                            </div>
                                            ${goal.description ? `
                                                <div class="mt-2">
                                                    <small class="text-muted">${goal.description}</small>
                                                </div>
                                            ` : ''}
                                            <div class="mt-2">
                                                <small class="text-muted">
                                                    เป้าหมาย: ${goal.targetDate.toLocaleDateString('th-TH')}
                                                    ${daysLeft > 0 ? `(อีก ${daysLeft} วัน)` : '(หมดเวลาแล้ว)'}
                                                </small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            }
            
            goalsPage.innerHTML = `
                <div class="row">
                    <div class="col-12">
                        <div class="card border-0 shadow-sm">
                            <div class="card-header bg-transparent border-0 d-flex justify-content-between align-items-center">
                                <h5 class="card-title mb-0">
                                    <i class="fas fa-bullseye me-2 text-primary"></i>
                                    เป้าหมายการออม
                                </h5>
                                <div class="btn-group">
                                    <button class="btn btn-primary btn-sm" onclick="showGoalModal()">
                                        <i class="fas fa-plus me-1"></i>
                                        เพิ่มเป้าหมาย
                                    </button>
                                    <button class="btn btn-outline-warning btn-sm" onclick="window.removeDuplicateGoalsFromFirestore().then(() => updateGoalsData())" title="ลบข้อมูลซ้ำ">
                                        <i class="fas fa-broom me-1"></i>
                                        ลบข้อมูลซ้ำ
                                    </button>
                                </div>
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-4 mb-3">
                                        <div class="card bg-white text-primary border-primary shadow-sm">
                                            <div class="card-body text-center">
                                                <i class="fas fa-bullseye fs-3 mb-2 text-primary"></i>
                                                <h6 class="text-primary">เป้าหมายทั้งหมด</h6>
                                                <h4 class="text-primary">${totalGoals}</h4>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-4 mb-3">
                                        <div class="card bg-white text-success border-success shadow-sm">
                                            <div class="card-body text-center">
                                                <i class="fas fa-check-circle fs-3 mb-2 text-success"></i>
                                                <h6 class="text-success">สำเร็จแล้ว</h6>
                                                <h4 class="text-success">${completedGoals}</h4>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-4 mb-3">
                                        <div class="card bg-white text-warning border-warning shadow-sm">
                                            <div class="card-body text-center">
                                                <i class="fas fa-clock fs-3 mb-2 text-warning"></i>
                                                <h6 class="text-warning">กำลังดำเนินการ</h6>
                                                <h4 class="text-warning">${activeGoals}</h4>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                ${goalsListHtml}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('ข้อผิดพลาดในการอัปเดตข้อมูลเป้าหมาย:', error);
        showNotification('เกิดข้อผิดพลาดในการโหลดเป้าหมาย', 'danger');
    }
}

// ฟังก์ชันสำหรับการแสดง Modal เพิ่มเป้าหมาย
function showGoalModal() {
    const modalElement = document.getElementById('goalModal');
    const modal = new bootstrap.Modal(modalElement);
    const modalTitle = document.getElementById('goalModalTitle');
    const form = document.getElementById('goalForm');
    
    // รีเซ็ตฟอร์ม
    form.reset();
    
    // รีเซ็ตตัวแปรการแก้ไข
    editingGoalId = null;
    
    // เพิ่มเป้าหมายใหม่
    modalTitle.innerHTML = '<i class="fas fa-bullseye me-2"></i>เพิ่มเป้าหมายใหม่';
    
    // ตั้งค่าวันที่ขั้นต่ำเป็นวันที่ปัจจุบัน
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('goalTargetDate').min = today;
    
    // จัดการ focus เมื่อ Modal เปิด
    modalElement.addEventListener('shown.bs.modal', function () {
        // ลบ aria-hidden เมื่อ modal เปิด
        modalElement.removeAttribute('aria-hidden');
        
        const firstInput = modalElement.querySelector('input, select, textarea');
        if (firstInput) {
            firstInput.focus();
        }
    }, { once: true });
    
    // จัดการ focus เมื่อ Modal ปิด
    modalElement.addEventListener('hidden.bs.modal', function () {
        // เพิ่ม aria-hidden เมื่อ modal ปิด
        modalElement.setAttribute('aria-hidden', 'true');
        
        // ย้าย focus ไปยัง element ที่ปลอดภัยนอก modal
        const safeFocusElement = document.querySelector('body') || document.documentElement;
        if (safeFocusElement) {
            safeFocusElement.focus();
        }
    }, { once: true });
    
    // แสดง Modal
    modal.show();
}

// ฟังก์ชันสำหรับการบันทึกเป้าหมาย
async function saveGoal() {
    try {
        const form = document.getElementById('goalForm');
        
        const goalData = {
            title: document.getElementById('goalTitle').value.trim(),
            targetAmount: parseFloat(document.getElementById('goalTargetAmount').value),
            currentAmount: parseFloat(document.getElementById('goalCurrentAmount').value) || 0,
            targetDate: new Date(document.getElementById('goalTargetDate').value),
            description: document.getElementById('goalDescription').value.trim(),
            category: document.getElementById('goalCategory').value,
            status: 'active'
        };
        
        // ตรวจสอบข้อมูล
        if (!goalData.title || !goalData.targetAmount || !goalData.category) {
            showNotification('กรุณากรอกข้อมูลให้ครบถ้วน', 'warning');
            return;
        }
        
        if (goalData.targetAmount <= 0) {
            showNotification('จำนวนเงินเป้าหมายต้องมากกว่า 0', 'warning');
            return;
        }
        
        if (goalData.currentAmount < 0) {
            showNotification('จำนวนเงินปัจจุบันต้องไม่น้อยกว่า 0', 'warning');
            return;
        }
        
        if (goalData.currentAmount > goalData.targetAmount) {
            showNotification('จำนวนเงินปัจจุบันต้องไม่เกินจำนวนเงินเป้าหมาย', 'warning');
            return;
        }
        
        if (goalData.targetDate <= new Date()) {
            showNotification('วันที่เป้าหมายต้องเป็นอนาคต', 'warning');
            return;
        }
        
        const user = auth.currentUser;
        
        // ตรวจสอบว่าเป็นการแก้ไขหรือเพิ่มใหม่
        if (editingGoalId) {
            // แก้ไขเป้าหมายที่มีอยู่
            const goalRef = db
                .collection('users')
                .doc(user.uid)
                .collection('goals')
                .doc(editingGoalId);
            
            // เพิ่ม updatedAt timestamp
            goalData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
            
            // คำนวณเปอร์เซ็นต์
            goalData.progress = (goalData.currentAmount / goalData.targetAmount) * 100;
            
            // ตรวจสอบสถานะ
            if (goalData.progress >= 100) {
                goalData.status = 'completed';
            } else {
                goalData.status = 'active';
            }
            
            await goalRef.update(goalData);
            showNotification('แก้ไขเป้าหมายสำเร็จ', 'success');
            
            // รีเซ็ตตัวแปรการแก้ไข
            editingGoalId = null;
        } else {
            // เพิ่มเป้าหมายใหม่
            const goalRef = db
                .collection('users')
                .doc(user.uid)
                .collection('goals')
                .doc();
            
            // เพิ่ม createdAt timestamp
            goalData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            
            // คำนวณเปอร์เซ็นต์
            goalData.progress = (goalData.currentAmount / goalData.targetAmount) * 100;
            
            // ตรวจสอบสถานะ
            if (goalData.progress >= 100) {
                goalData.status = 'completed';
            }
            
            await goalRef.set(goalData);
            showNotification('เพิ่มเป้าหมายสำเร็จ', 'success');
        }
        
        // ปิด Modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('goalModal'));
        modal.hide();
        
        // รีเฟรชข้อมูล
        await loadGoals();
        updateGoalsData();
        
    } catch (error) {
        console.error('ข้อผิดพลาดในการบันทึกเป้าหมาย:', error);
        showNotification('เกิดข้อผิดพลาดในการบันทึกเป้าหมาย', 'danger');
    }
}

// ตัวแปรสำหรับเก็บ ID ของเป้าหมายที่กำลังแก้ไข
let editingGoalId = null;

// ฟังก์ชันสำหรับการแก้ไขเป้าหมาย
window.editGoal = function(goalId) {
    try {
        const goal = goals.find(g => g.id === goalId);
        if (!goal) {
            showNotification('ไม่พบเป้าหมายที่ต้องการแก้ไข', 'warning');
            return;
        }
        
        // เก็บ ID ของเป้าหมายที่กำลังแก้ไข
        editingGoalId = goalId;
        
        // แสดง Modal แก้ไขเป้าหมาย
        const modalElement = document.getElementById('goalModal');
        const modal = new bootstrap.Modal(modalElement);
        const modalTitle = document.getElementById('goalModalTitle');
        const form = document.getElementById('goalForm');
        
        // กรอกข้อมูลในฟอร์ม
        document.getElementById('goalTitle').value = goal.title;
        document.getElementById('goalTargetAmount').value = goal.targetAmount;
        document.getElementById('goalCurrentAmount').value = goal.currentAmount;
        document.getElementById('goalTargetDate').value = goal.targetDate.toISOString().split('T')[0];
        document.getElementById('goalDescription').value = goal.description || '';
        document.getElementById('goalCategory').value = goal.category;
        
        // เปลี่ยนหัวข้อ Modal
        modalTitle.innerHTML = '<i class="fas fa-edit me-2"></i>แก้ไขเป้าหมาย';
        
        // จัดการ focus เมื่อ Modal เปิด
        modalElement.addEventListener('shown.bs.modal', function () {
            const firstInput = modalElement.querySelector('input, select, textarea');
            if (firstInput) {
                firstInput.focus();
            }
        }, { once: true });
        
        // จัดการ focus เมื่อ Modal ปิด
        modalElement.addEventListener('hidden.bs.modal', function () {
            // ย้าย focus ไปยัง element ที่ปลอดภัยนอก modal
            const safeFocusElement = document.querySelector('body') || document.documentElement;
            if (safeFocusElement) {
                safeFocusElement.focus();
            }
        }, { once: true });
        
        // แสดง Modal
        modal.show();
        
    } catch (error) {
        console.error('ข้อผิดพลาดในการแก้ไขเป้าหมาย:', error);
        showNotification('เกิดข้อผิดพลาดในการแก้ไขเป้าหมาย', 'danger');
    }
};

// ฟังก์ชันสำหรับการลบเป้าหมาย
window.deleteGoal = async function(goalId) {
    try {
        const goal = goals.find(g => g.id === goalId);
        if (!goal) {
            showNotification('ไม่พบเป้าหมายที่ต้องการลบ', 'warning');
            return;
        }
        
        // ยืนยันการลบ
        const confirmed = confirm(`คุณต้องการลบเป้าหมาย "${goal.title}" ใช่หรือไม่?`);
        if (!confirmed) {
            return;
        }
        
        const user = auth.currentUser;
        await db
            .collection('users')
            .doc(user.uid)
            .collection('goals')
            .doc(goalId)
            .delete();
        
        showNotification('ลบเป้าหมายสำเร็จ', 'success');
        
        // รีเฟรชข้อมูล
        await loadGoals();
        updateGoalsData();
        
    } catch (error) {
        console.error('ข้อผิดพลาดในการลบเป้าหมาย:', error);
        showNotification('เกิดข้อผิดพลาดในการลบเป้าหมาย', 'danger');
    }
};

// ฟังก์ชันสำหรับการแสดง Modal อัปเดตความคืบหน้า
window.showUpdateProgressModal = function(goalId) {
    try {
        const goal = goals.find(g => g.id === goalId);
        if (!goal) {
            showNotification('ไม่พบเป้าหมายที่ต้องการอัปเดต', 'warning');
            return;
        }
        
        // สร้าง Modal HTML
        const modalHtml = `
            <div class="modal fade" id="updateProgressModal" tabindex="-1" aria-labelledby="updateProgressModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="updateProgressModalLabel">
                                <i class="fas fa-plus-circle me-2"></i>เพิ่มเงินเข้าเป้าหมาย
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label class="form-label">เป้าหมาย: <strong>${goal.title}</strong></label>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">จำนวนเงินปัจจุบัน: <strong>฿${goal.currentAmount.toLocaleString('th-TH')}</strong></label>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">จำนวนเงินเป้าหมาย: <strong>฿${goal.targetAmount.toLocaleString('th-TH')}</strong></label>
                            </div>
                            <div class="mb-3">
                                <label for="addAmount" class="form-label">จำนวนเงินที่ต้องการเพิ่ม (บาท)</label>
                                <input type="number" class="form-control" id="addAmount" 
                                       value="0" min="0" max="${goal.targetAmount - goal.currentAmount}" step="100">
                                <div class="form-text">จำนวนเงินที่สามารถเพิ่มได้สูงสุด: ฿${(goal.targetAmount - goal.currentAmount).toLocaleString('th-TH')}</div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">ยกเลิก</button>
                            <button type="button" class="btn btn-primary" onclick="confirmUpdateProgress('${goalId}')">เพิ่มเงิน</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // ลบ Modal เก่าถ้ามี
        const existingModal = document.getElementById('updateProgressModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // เพิ่ม Modal ใหม่
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // แสดง Modal
        const modal = new bootstrap.Modal(document.getElementById('updateProgressModal'));
        
        // จัดการ focus เมื่อ Modal เปิด
        const modalElement = document.getElementById('updateProgressModal');
        modalElement.addEventListener('shown.bs.modal', function () {
            const addAmountInput = document.getElementById('addAmount');
            if (addAmountInput) {
                addAmountInput.focus();
            }
        }, { once: true });
        
        // จัดการ focus เมื่อ Modal ปิด
        modalElement.addEventListener('hidden.bs.modal', function () {
            // ย้าย focus ไปยัง element ที่ปลอดภัยนอก modal
            const safeFocusElement = document.querySelector('body') || document.documentElement;
            if (safeFocusElement) {
                safeFocusElement.focus();
            }
        }, { once: true });
        
        modal.show();
        
    } catch (error) {
        console.error('ข้อผิดพลาดในการแสดง Modal อัปเดตความคืบหน้า:', error);
        showNotification('เกิดข้อผิดพลาดในการแสดง Modal', 'danger');
    }
};

// ฟังก์ชันสำหรับยืนยันการเพิ่มเงินเข้าเป้าหมาย
window.confirmUpdateProgress = async function(goalId) {
    try {
        const addAmount = parseFloat(document.getElementById('addAmount').value);
        
        if (isNaN(addAmount) || addAmount <= 0) {
            showNotification('กรุณากรอกจำนวนเงินที่ต้องการเพิ่มให้ถูกต้อง', 'warning');
            return;
        }
        
        await updateGoalProgress(goalId, addAmount, true);
        
        // ปิด Modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('updateProgressModal'));
        modal.hide();
        
    } catch (error) {
        console.error('ข้อผิดพลาดในการยืนยันการอัปเดต:', error);
        showNotification('เกิดข้อผิดพลาดในการอัปเดต', 'danger');
    }
};

// ฟังก์ชันสำหรับการอัปเดตจำนวนเงินปัจจุบันของเป้าหมาย
window.updateGoalProgress = async function(goalId, amount, isAdd = false) {
    try {
        const goal = goals.find(g => g.id === goalId);
        if (!goal) {
            showNotification('ไม่พบเป้าหมายที่ต้องการอัปเดต', 'warning');
            return;
        }
        
        let newAmount;
        if (isAdd) {
            // กรณีเพิ่มเงิน
            newAmount = goal.currentAmount + amount;
        } else {
            // กรณีแก้ไขจำนวนเงินทั้งหมด
            newAmount = amount;
        }
        
        // ตรวจสอบจำนวนเงิน
        if (newAmount < 0) {
            showNotification('จำนวนเงินต้องไม่น้อยกว่า 0', 'warning');
            return;
        }
        
        if (newAmount > goal.targetAmount) {
            showNotification('จำนวนเงินปัจจุบันต้องไม่เกินจำนวนเงินเป้าหมาย', 'warning');
            return;
        }
        
        const user = auth.currentUser;
        const goalRef = db
            .collection('users')
            .doc(user.uid)
            .collection('goals')
            .doc(goalId);
        
        // คำนวณเปอร์เซ็นต์ใหม่
        const newProgress = (newAmount / goal.targetAmount) * 100;
        const newStatus = newProgress >= 100 ? 'completed' : 'active';
        
        await goalRef.update({
            currentAmount: newAmount,
            progress: newProgress,
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        if (isAdd) {
            showNotification(`เพิ่มเงิน ฿${amount.toLocaleString('th-TH')} เข้าเป้าหมายสำเร็จ`, 'success');
        } else {
            showNotification('อัปเดตความคืบหน้าเป้าหมายสำเร็จ', 'success');
        }
        
        // รีเฟรชข้อมูล
        await loadGoals();
        updateGoalsData();
        
    } catch (error) {
        console.error('ข้อผิดพลาดในการอัปเดตความคืบหน้าเป้าหมาย:', error);
        showNotification('เกิดข้อผิดพลาดในการอัปเดตความคืบหน้าเป้าหมาย', 'danger');
    }
};

// ฟังก์ชันสำหรับการแสดงหมวดหมู่ที่ใช้บ่อย
function getTopCategories() {
    try {
        const categoryCount = {};
        
        // นับจำนวนครั้งที่ใช้แต่ละหมวดหมู่
        transactions.forEach(transaction => {
            const categoryId = transaction.category;
            categoryCount[categoryId] = (categoryCount[categoryId] || 0) + 1;
        });
        
        // เรียงลำดับตามจำนวนครั้งที่ใช้
        const sortedCategories = Object.entries(categoryCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5); // แสดงแค่ 5 อันดับแรก
        
        if (sortedCategories.length === 0) {
            return '<p class="text-muted">ยังไม่มีข้อมูล</p>';
        }
        
        let html = '';
        sortedCategories.forEach(([categoryId, count]) => {
            const category = categories.find(cat => cat.id === categoryId);
            const categoryName = category ? category.name : categoryId;
            html += `
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span>${categoryName}</span>
                    <span class="badge bg-primary">${count}</span>
                </div>
            `;
        });
        
        return html;
        
    } catch (error) {
        console.error('ข้อผิดพลาดในการคำนวณหมวดหมู่ที่ใช้บ่อย:', error);
        return '<p class="text-muted">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
    }
}

// ฟังก์ชันสำหรับการส่งออกข้อมูลเป็น CSV
function exportDataAsCSV() {
    try {
        // สร้างข้อมูล CSV
        const csvContent = [
            ['วันที่', 'หมวดหมู่', 'รายละเอียด', 'จำนวนเงิน', 'ประเภท'],
            ...transactions.map(t => {
                const category = categories.find(cat => cat.id === t.category);
                const categoryName = category ? category.name : t.category;
                const type = t.type === 'income' ? 'รายรับ' : 'รายจ่าย';
                
                // จัดรูปแบบวันที่ให้เป็นภาษาไทย
                const date = new Date(t.date);
                const formattedDate = date.toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                
                // จัดรูปแบบจำนวนเงินให้มีเครื่องหมายจุลภาค
                const formattedAmount = new Intl.NumberFormat('th-TH').format(t.amount);
                
                return [
                    formattedDate,
                    categoryName,
                    t.description,
                    formattedAmount,
                    type
                ];
            })
        ].map(row => row.join(',')).join('\n');
        
        // เพิ่ม BOM (Byte Order Mark) สำหรับ UTF-8 เพื่อให้ Excel อ่านภาษาไทยได้
        const BOM = '\uFEFF';
        const csvWithBOM = BOM + csvContent;
        
        // สร้างไฟล์และดาวน์โหลด
        const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `รายการออมเงิน_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // ล้าง URL object เพื่อป้องกัน memory leak
        URL.revokeObjectURL(url);
        
        showNotification('ส่งออกข้อมูลสำเร็จ', 'success');
        
    } catch (error) {
        console.error('ข้อผิดพลาดในการส่งออกข้อมูล:', error);
        showNotification('เกิดข้อผิดพลาดในการส่งออกข้อมูล', 'danger');
    }
}

// ฟังก์ชันสำหรับการส่งออกข้อมูลเป็น Excel
function exportDataAsExcel() {
    try {
        // ตรวจสอบว่า SheetJS พร้อมใช้งานหรือไม่
        if (typeof XLSX === 'undefined') {
            showNotification('ไลบรารี Excel ไม่พร้อมใช้งาน กรุณารีเฟรชหน้าเว็บ', 'warning');
            return;
        }
        
        // สร้างข้อมูลสำหรับ Excel
        const excelData = [
            ['วันที่', 'หมวดหมู่', 'รายละเอียด', 'จำนวนเงิน', 'ประเภท'],
            ...transactions.map(t => {
                const category = categories.find(cat => cat.id === t.category);
                const categoryName = category ? category.name : t.category;
                const type = t.type === 'income' ? 'รายรับ' : 'รายจ่าย';
                
                // จัดรูปแบบวันที่ให้เป็นภาษาไทย
                const date = new Date(t.date);
                const formattedDate = date.toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                
                // จัดรูปแบบจำนวนเงินให้มีเครื่องหมายจุลภาค
                const formattedAmount = new Intl.NumberFormat('th-TH').format(t.amount);
                
                return [
                    formattedDate,
                    categoryName,
                    t.description,
                    formattedAmount,
                    type
                ];
            })
        ];
        
        // สร้าง workbook และ worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(excelData);
        
        // ตั้งค่าความกว้างคอลัมน์
        const colWidths = [
            { wch: 20 }, // วันที่
            { wch: 15 }, // หมวดหมู่
            { wch: 30 }, // รายละเอียด
            { wch: 15 }, // จำนวนเงิน
            { wch: 10 }  // ประเภท
        ];
        ws['!cols'] = colWidths;
        
        // เพิ่ม worksheet ลงใน workbook
        XLSX.utils.book_append_sheet(wb, ws, 'รายการออมเงิน');
        
        // สร้างไฟล์และดาวน์โหลด
        const fileName = `รายการออมเงิน_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        showNotification('ส่งออกข้อมูลเป็น Excel สำเร็จ', 'success');
        
    } catch (error) {
        console.error('ข้อผิดพลาดในการส่งออกข้อมูล Excel:', error);
        showNotification('เกิดข้อผิดพลาดในการส่งออกข้อมูล Excel', 'danger');
    }
}

// ฟังก์ชันสำหรับการแก้ไขรายการ (Global)
window.editTransaction = function(transactionId) {
    showTransactionModal(transactionId);
};

// ฟังก์ชันสำหรับการแสดง Modal เพิ่มเป้าหมาย (Global)
window.showGoalModal = function() {
    const modalElement = document.getElementById('goalModal');
    const modal = new bootstrap.Modal(modalElement);
    const modalTitle = document.getElementById('goalModalTitle');
    const form = document.getElementById('goalForm');
    
    // รีเซ็ตฟอร์ม
    form.reset();
    
    // เพิ่มเป้าหมายใหม่
    modalTitle.innerHTML = '<i class="fas fa-bullseye me-2"></i>เพิ่มเป้าหมายใหม่';
    
    // ตั้งค่าวันที่ขั้นต่ำเป็นวันที่ปัจจุบัน
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('goalTargetDate').min = today;
    
    // แสดง Modal และจัดการ accessibility
    modal.show();
    
    // จัดการ focus เมื่อ Modal เปิด
    modalElement.addEventListener('shown.bs.modal', function () {
        const firstInput = modalElement.querySelector('input, select, textarea');
        if (firstInput) {
            firstInput.focus();
        }
    }, { once: true });
};

// ฟังก์ชันสำหรับการลบรายการ (Global)
window.deleteTransaction = async function(transactionId) {
    if (confirm('คุณต้องการลบรายการนี้หรือไม่?')) {
        try {
            const user = auth.currentUser;
            await db
                .collection('users')
                .doc(user.uid)
                .collection('transactions')
                .doc(transactionId)
                .delete();
            
            // รีเฟรชข้อมูล
            await loadTransactions();
            refreshDashboard();
            
            showNotification('ลบรายการสำเร็จ', 'success');
            
        } catch (error) {
            console.error('ข้อผิดพลาดในการลบรายการ:', error);
            showNotification('เกิดข้อผิดพลาดในการลบรายการ', 'danger');
        }
    }
};

// ========== ฟังก์ชันโปรไฟล์ ==========

// ฟังก์ชันสำหรับการบันทึกโปรไฟล์
window.saveProfile = async function() {
    try {
        const profileData = {
            displayName: document.getElementById('displayName').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            birthDate: document.getElementById('birthDate').value,
            bio: document.getElementById('bio').value.trim()
        };
        
        // บันทึกข้อมูลลง localStorage
        const userSettings = JSON.parse(localStorage.getItem('userSettings') || '{}');
        Object.assign(userSettings, profileData);
        localStorage.setItem('userSettings', JSON.stringify(userSettings));
        
        // บันทึกข้อมูลลง Firestore
        const user = auth.currentUser;
        if (user) {
            await db
                .collection('users')
                .doc(user.uid)
                .collection('profile')
                .doc('info')
                .set(profileData, { merge: true });
        }
        
        showNotification('บันทึกโปรไฟล์สำเร็จ', 'success');
        
        // อัปเดต Avatar และข้อมูลที่แสดง
        setTimeout(() => {
            loadProfilePage();
        }, 500);
        
    } catch (error) {
        console.error('ข้อผิดพลาดในการบันทึกโปรไฟล์:', error);
        showNotification('เกิดข้อผิดพลาดในการบันทึกโปรไฟล์', 'danger');
    }
};

// ฟังก์ชันสำหรับการรีเซ็ตฟอร์มโปรไฟล์
window.resetProfileForm = function() {
    if (confirm('คุณต้องการรีเซ็ตฟอร์มโปรไฟล์หรือไม่?')) {
        const user = auth.currentUser;
        const userInfo = JSON.parse(localStorage.getItem('userSettings') || '{}');
        
        document.getElementById('displayName').value = userInfo.displayName || '';
        document.getElementById('phone').value = userInfo.phone || '';
        document.getElementById('birthDate').value = userInfo.birthDate || '';
        document.getElementById('bio').value = userInfo.bio || '';
        
        showNotification('รีเซ็ตฟอร์มสำเร็จ', 'info');
    }
};

// ฟังก์ชันสำหรับการเปลี่ยน Avatar
window.changeAvatar = function() {
    // สร้าง input file element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    
    fileInput.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            // ตรวจสอบขนาดไฟล์ (ไม่เกิน 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showNotification('ขนาดไฟล์ต้องไม่เกิน 5MB', 'warning');
                return;
            }
            
            // ตรวจสอบประเภทไฟล์
            if (!file.type.startsWith('image/')) {
                showNotification('กรุณาเลือกไฟล์รูปภาพเท่านั้น', 'warning');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(e) {
                // บันทึกรูปภาพลง localStorage (สำหรับ demo)
                const userSettings = JSON.parse(localStorage.getItem('userSettings') || '{}');
                userSettings.avatarData = e.target.result;
                localStorage.setItem('userSettings', JSON.stringify(userSettings));
                
                // อัปเดตรูปภาพที่แสดง
                const avatarImg = document.querySelector('.rounded-circle[alt="Avatar"]');
                if (avatarImg) {
                    avatarImg.src = e.target.result;
                }
                
                showNotification('เปลี่ยนรูปโปรไฟล์สำเร็จ', 'success');
            };
            reader.readAsDataURL(file);
        }
    };
    
    // เพิ่ม input ลงใน DOM และคลิก
    document.body.appendChild(fileInput);
    fileInput.click();
    
    // ลบ input หลังจากใช้งาน
    setTimeout(() => {
        document.body.removeChild(fileInput);
    }, 1000);
};

// ฟังก์ชันสำหรับการเปลี่ยนรหัสผ่าน
window.changePassword = function() {
    const newPassword = prompt('กรุณากรอกรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร):');
    
    if (newPassword && newPassword.length >= 6) {
        const user = auth.currentUser;
        
        user.updatePassword(newPassword).then(() => {
            showNotification('เปลี่ยนรหัสผ่านสำเร็จ', 'success');
        }).catch((error) => {
            console.error('ข้อผิดพลาดในการเปลี่ยนรหัสผ่าน:', error);
            if (error.code === 'auth/requires-recent-login') {
                showNotification('กรุณาเข้าสู่ระบบใหม่ก่อนเปลี่ยนรหัสผ่าน', 'warning');
            } else {
                showNotification('เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน', 'danger');
            }
        });
    } else if (newPassword !== null) {
        showNotification('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 'warning');
    }
};

// ========== ฟังก์ชันตั้งค่า ==========

// ฟังก์ชันสำหรับการบันทึกการตั้งค่า
window.saveSettings = function() {
    try {
        const settings = {
            enableNotifications: document.getElementById('enableNotifications').checked,
            goalNotifications: document.getElementById('goalNotifications').checked,
            budgetAlerts: document.getElementById('budgetAlerts').checked,
            theme: document.getElementById('theme').value,
            currency: document.getElementById('currency').value,
            compactView: document.getElementById('compactView').checked,
            autoLogout: document.getElementById('autoLogout').checked,
            sessionTimeout: document.getElementById('sessionTimeout').value
        };
        
        // บันทึกการตั้งค่าลง localStorage
        const userSettings = JSON.parse(localStorage.getItem('userSettings') || '{}');
        Object.assign(userSettings, settings);
        localStorage.setItem('userSettings', JSON.stringify(userSettings));
        
        showNotification('บันทึกการตั้งค่าสำเร็จ', 'success');
        
        // ใช้การตั้งค่าใหม่
        applySettings(settings);
        
        // อัปเดตสถานะการแจ้งเตือน
        updateNotificationStatus();
        
    } catch (error) {
        console.error('ข้อผิดพลาดในการบันทึกการตั้งค่า:', error);
        showNotification('เกิดข้อผิดพลาดในการบันทึกการตั้งค่า', 'danger');
    }
};

// ฟังก์ชันสำหรับการอัปเดตสถานะการแจ้งเตือน
function updateNotificationStatus() {
    const enableNotifications = document.getElementById('enableNotifications');
    const statusElement = document.querySelector('.notification-status');
    
    if (statusElement && enableNotifications) {
        if (enableNotifications.checked) {
            statusElement.textContent = 'เปิดใช้งาน';
            statusElement.className = 'notification-status active';
        } else {
            statusElement.textContent = 'ปิดใช้งาน';
            statusElement.className = 'notification-status inactive';
        }
    }
}

// เพิ่ม Event Listeners สำหรับการแจ้งเตือน
function setupNotificationListeners() {
    const enableNotifications = document.getElementById('enableNotifications');
    if (enableNotifications) {
        enableNotifications.addEventListener('change', updateNotificationStatus);
    }
}

// ฟังก์ชันสำหรับการรีเซ็ตการตั้งค่า
window.resetSettings = function() {
    if (confirm('คุณต้องการรีเซ็ตการตั้งค่าทั้งหมดหรือไม่?')) {
        localStorage.removeItem('userSettings');
        showNotification('รีเซ็ตการตั้งค่าสำเร็จ', 'success');
        loadSettingsPage(); // โหลดหน้าตั้งค่าใหม่
    }
};

// ฟังก์ชันสำหรับการใช้การตั้งค่า
function applySettings(settings) {
    // ใช้ธีม
    if (settings.theme) {
        document.documentElement.setAttribute('data-bs-theme', settings.theme === 'auto' ? 
            (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : 
            settings.theme
        );
    }
}

// ฟังก์ชันสำหรับการส่งออกข้อมูลทั้งหมด
window.exportAllData = async function() {
    try {
        const user = auth.currentUser;
        const exportData = {
            user: {
                email: user.email,
                uid: user.uid
            },
            transactions: transactions,
            categories: categories,
            goals: goals,
            settings: JSON.parse(localStorage.getItem('userSettings') || '{}'),
            exportDate: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        
        // เพิ่ม BOM สำหรับ UTF-8 เพื่อให้แน่ใจว่าอ่านได้ในทุกโปรแกรม
        const BOM = '\uFEFF';
        const dataWithBOM = BOM + dataStr;
        
        const dataBlob = new Blob([dataWithBOM], { type: 'application/json;charset=utf-8' });
        
        const link = document.createElement('a');
        const url = URL.createObjectURL(dataBlob);
        link.href = url;
        link.download = `save-money-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        // ล้าง URL object เพื่อป้องกัน memory leak
        URL.revokeObjectURL(url);
        
        showNotification('ส่งออกข้อมูลสำเร็จ', 'success');
        
    } catch (error) {
        console.error('ข้อผิดพลาดในการส่งออกข้อมูล:', error);
        showNotification('เกิดข้อผิดพลาดในการส่งออกข้อมูล', 'danger');
    }
};

// ฟังก์ชันสำหรับการนำเข้าข้อมูล
window.importData = function(input) {
    const file = input.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importData = JSON.parse(e.target.result);
            
            if (confirm('คุณต้องการนำเข้าข้อมูลนี้หรือไม่? ข้อมูลเดิมจะถูกเขียนทับ')) {
                // นำเข้าการตั้งค่า
                if (importData.settings) {
                    localStorage.setItem('userSettings', JSON.stringify(importData.settings));
                }
                
                showNotification('นำเข้าข้อมูลสำเร็จ กรุณารีเฟรชหน้าเว็บ', 'success');
            }
            
        } catch (error) {
            console.error('ข้อผิดพลาดในการนำเข้าข้อมูล:', error);
            showNotification('ไฟล์นำเข้าไม่ถูกต้อง', 'danger');
        }
    };
    reader.readAsText(file);
};

// ฟังก์ชันสำหรับการลบบัญชี
window.deleteAccount = function() {
    const confirmation = prompt('กรุณาพิมพ์ "DELETE" เพื่อยืนยันการลบบัญชี:');
    
    if (confirmation === 'DELETE') {
        if (confirm('คุณแน่ใจว่าต้องการลบบัญชีถาวรหรือไม่? การกระทำนี้ไม่สามารถยกเลิกได้')) {
            const user = auth.currentUser;
            
            user.delete().then(() => {
                showNotification('ลบบัญชีสำเร็จ', 'success');
                window.location.href = 'index.html';
            }).catch((error) => {
                console.error('ข้อผิดพลาดในการลบบัญชี:', error);
                if (error.code === 'auth/requires-recent-login') {
                    showNotification('กรุณาเข้าสู่ระบบใหม่ก่อนลบบัญชี', 'warning');
                } else {
                    showNotification('เกิดข้อผิดพลาดในการลบบัญชี', 'danger');
                }
            });
        }
    } else if (confirmation !== null) {
        showNotification('การยืนยันไม่ถูกต้อง', 'warning');
    }
};

// ฟังก์ชันสำหรับตั้งค่า Dropdown Event Listeners
function setupDropdownListeners() {
    // Event listener สำหรับการปิด dropdown
    document.addEventListener('hidden.bs.dropdown', function (event) {
        // ลบ active class จากทุก dropdown item เมื่อ dropdown ปิด
        const dropdownItems = event.target.querySelectorAll('.dropdown-item');
        dropdownItems.forEach(item => {
            if (!item.id || item.id !== 'logoutBtn') {
                item.classList.remove('active');
            }
        });
    });
    
    // Event listener สำหรับการเปิด dropdown
    document.addEventListener('shown.bs.dropdown', function (event) {
        // หา dropdown item ที่ควรเป็น active ตาม current page
        const currentPage = getCurrentActivePage();
        if (currentPage) {
            const activeDropdownItem = event.target.querySelector(`[data-page="${currentPage}"]`);
            if (activeDropdownItem && activeDropdownItem.classList.contains('dropdown-item')) {
                activeDropdownItem.classList.add('active');
            }
        }
    });
}

// ฟังก์ชันสำหรับหา current active page
function getCurrentActivePage() {
    const visiblePage = document.querySelector('.page-content[style*="block"]');
    if (visiblePage) {
        return visiblePage.id.replace('Page', '');
    }
    return 'dashboard'; // default
}

// เริ่มต้นหน้า Dashboard เมื่อโหลดเสร็จ
document.addEventListener('DOMContentLoaded', () => {
    // ตั้งค่า Event Listeners สำหรับ Dropdown
    setupDropdownListeners();
    
    // รอให้ Firebase พร้อมใช้งาน
    setTimeout(() => {
        initDashboard();
    }, 200);
    
    // จัดการ window resize สำหรับ responsive design
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            // อัปเดต mobile cards เมื่อขนาดหน้าจอเปลี่ยน
            if (window.location.hash === '#transactions' || document.getElementById('transactionsTablePage')) {
                createMobileTableCardsPage();
            }
            if (window.location.hash === '#dashboard' || document.getElementById('transactionsTable')) {
                createMobileTableCards();
            }
        }, 250);
    });
});

// ฟังก์ชันสำหรับสร้าง Mobile Card Layout สำหรับหน้า Transactions
function createMobileTableCardsPage() {
    try {
        // หาตาราง transactionsTablePage และ container ของมัน
        const transactionsTable = document.getElementById('transactionsTablePage');
        if (!transactionsTable) {
            return;
        }
        
        const tableContainer = transactionsTable.closest('.table-responsive');
        if (!tableContainer) {
            return;
        }
        
        // ตรวจสอบขนาดหน้าจอ - ถ้าเป็นเดสก์ท็อปไม่ต้องสร้าง mobile cards
        if (window.innerWidth > 768) {
            const existingCards = tableContainer.querySelector('.mobile-table-cards');
            if (existingCards) {
                existingCards.remove();
            }
            return;
        }
        
        // ลบ mobile cards เดิม (ถ้ามี)
        const existingCards = tableContainer.querySelector('.mobile-table-cards');
        if (existingCards) {
            existingCards.remove();
        }
        
        // สร้าง container สำหรับ mobile cards
        const mobileCardsContainer = document.createElement('div');
        mobileCardsContainer.className = 'mobile-table-cards';
        
        if (transactions.length === 0) {
            // แสดงข้อความเมื่อไม่มีข้อมูล
            const noDataCard = document.createElement('div');
            noDataCard.className = 'table-card';
            noDataCard.innerHTML = `
                <div class="table-card-header">
                    <span>ไม่มีข้อมูล</span>
                </div>
                <div class="table-card-body text-center">
                    <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                    <h6 class="text-muted">ยังไม่มีรายการใดๆ</h6>
                    <p class="text-muted mb-3">เริ่มต้นด้วยการเพิ่มรายการแรกของคุณ</p>
                    <button class="btn btn-primary" onclick="showTransactionModal()">
                        <i class="fas fa-plus me-1"></i>เพิ่มรายการแรก
                    </button>
                </div>
            `;
            mobileCardsContainer.appendChild(noDataCard);
        } else {
            // ระบบ Pagination สำหรับ Mobile Cards
            const itemsPerPage = 5;
            const totalPages = Math.ceil(transactions.length / itemsPerPage);
            
            // สร้าง container สำหรับ cards ที่แสดงในหน้าปัจจุบัน
            const cardsPageContainer = document.createElement('div');
            cardsPageContainer.className = 'mobile-cards-page';
            cardsPageContainer.setAttribute('data-current-page', '1');
            
            // แสดง cards เฉพาะหน้าปัจจุบัน
            const startIndex = 0;
            const endIndex = Math.min(itemsPerPage, transactions.length);
            const currentPageTransactions = transactions.slice(startIndex, endIndex);
            
            currentPageTransactions.forEach(transaction => {
                const card = createTransactionCard(transaction);
                cardsPageContainer.appendChild(card);
            });
            
            mobileCardsContainer.appendChild(cardsPageContainer);
            
            // เพิ่ม Pagination Controls ถ้ามีมากกว่า 1 หน้า
            if (totalPages > 1) {
                const paginationContainer = document.createElement('div');
                paginationContainer.className = 'mobile-pagination d-flex justify-content-center align-items-center mt-3';
                
                // ปุ่มหน้าก่อนหน้า
                const prevButton = document.createElement('button');
                prevButton.className = 'btn btn-outline-primary btn-sm me-2';
                prevButton.innerHTML = '<i class="fas fa-chevron-left"></i> หน้าก่อนหน้า';
                prevButton.disabled = true;
                prevButton.onclick = () => changeMobilePage(-1, totalPages, transactions, mobileCardsContainer, paginationContainer);
                
                // แสดงหน้าปัจจุบัน
                const pageInfo = document.createElement('span');
                pageInfo.className = 'mx-3 text-muted';
                pageInfo.textContent = `หน้า 1 จาก ${totalPages}`;
                
                // ปุ่มหน้าถัดไป
                const nextButton = document.createElement('button');
                nextButton.className = 'btn btn-outline-primary btn-sm ms-2';
                nextButton.innerHTML = 'หน้าถัดไป <i class="fas fa-chevron-right"></i>';
                nextButton.onclick = () => changeMobilePage(1, totalPages, transactions, mobileCardsContainer, paginationContainer);
                
                paginationContainer.appendChild(prevButton);
                paginationContainer.appendChild(pageInfo);
                paginationContainer.appendChild(nextButton);
                
                mobileCardsContainer.appendChild(paginationContainer);
            }
        }
        
        // เพิ่ม mobile cards ลงใน container
        tableContainer.appendChild(mobileCardsContainer);
        
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการสร้าง Mobile Cards หน้า Transactions:', error);
    }
}

// ฟังก์ชันสำหรับเปลี่ยนหน้า Mobile Cards
function changeMobilePage(direction, totalPages, transactions, mobileCardsContainer, paginationContainer) {
    try {
        const itemsPerPage = 5;
        const currentPageElement = mobileCardsContainer.querySelector('.mobile-cards-page');
        const currentPage = parseInt(currentPageElement.getAttribute('data-current-page'));
        const newPage = currentPage + direction;
        
        // ตรวจสอบขอบเขต
        if (newPage < 1 || newPage > totalPages) {
            return;
        }
        
        // คำนวณ index สำหรับหน้าใหม่
        const startIndex = (newPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, transactions.length);
        const currentPageTransactions = transactions.slice(startIndex, endIndex);
        
        // เพิ่ม animation fade-out
        currentPageElement.classList.add('fade-out');
        
        // รอ animation เสร็จแล้วค่อยเปลี่ยนเนื้อหา
        setTimeout(() => {
            // ลบ cards เดิม
            currentPageElement.innerHTML = '';
            currentPageElement.setAttribute('data-current-page', newPage.toString());
            
            // สร้าง cards ใหม่
            currentPageTransactions.forEach(transaction => {
                const card = createTransactionCard(transaction);
                currentPageElement.appendChild(card);
            });
            
            // เพิ่ม animation fade-in
            currentPageElement.classList.remove('fade-out');
            currentPageElement.classList.add('fade-in');
            
            // ลบ fade-in class หลังจาก animation เสร็จ
            setTimeout(() => {
                currentPageElement.classList.remove('fade-in');
            }, 300);
        }, 150);
        
        // อัปเดต Pagination Controls
        const prevButton = paginationContainer.querySelector('button:first-child');
        const nextButton = paginationContainer.querySelector('button:last-child');
        const pageInfo = paginationContainer.querySelector('span');
        
        // อัปเดตสถานะปุ่ม
        prevButton.disabled = newPage === 1;
        nextButton.disabled = newPage === totalPages;
        
        // อัปเดตข้อความหน้า
        pageInfo.textContent = `หน้า ${newPage} จาก ${totalPages}`;
        
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการเปลี่ยนหน้า Mobile Cards:', error);
    }
}

// ฟังก์ชันสำหรับสร้างข้อมูลตัวอย่าง
async function createSampleData(userId) {
    try {
        // ข้อมูลตัวอย่างสำหรับรายการ
        const sampleTransactions = [
            {
                amount: 25000,
                category: 'salary',
                description: 'เงินเดือนประจำเดือน',
                type: 'income',
                date: new Date().toISOString().split('T')[0]
            },
            {
                amount: 5000,
                category: 'food',
                description: 'ค่าอาหารประจำเดือน',
                type: 'expense',
                date: new Date().toISOString().split('T')[0]
            },
            {
                amount: 3000,
                category: 'transport',
                description: 'ค่าเดินทางประจำเดือน',
                type: 'expense',
                date: new Date().toISOString().split('T')[0]
            },
            {
                amount: 8000,
                category: 'shopping',
                description: 'ซื้อเสื้อผ้าใหม่',
                type: 'expense',
                date: new Date().toISOString().split('T')[0]
            },
            {
                amount: 15000,
                category: 'investment',
                description: 'ลงทุนในหุ้น',
                type: 'income',
                date: new Date().toISOString().split('T')[0]
            }
        ];
        
        // เพิ่มข้อมูลตัวอย่างลงใน Firestore
        const batch = db.batch();
        
        for (const transaction of sampleTransactions) {
            const docRef = db.collection('users').doc(userId).collection('transactions').doc();
            batch.set(docRef, {
                ...transaction,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }
        
        await batch.commit();
        
        showNotification('สร้างข้อมูลตัวอย่างสำเร็จ!', 'success');
        
    } catch (error) {
        console.error('ข้อผิดพลาดในการสร้างข้อมูลตัวอย่าง:', error);
        showNotification('เกิดข้อผิดพลาดในการสร้างข้อมูลตัวอย่าง', 'danger');
    }
}
