// ===== Date Helper Functions =====
// ไฟล์นี้ใช้สำหรับการจัดการข้อมูลวันที่จาก Firestore

/**
 * แปลงข้อมูลวันที่จาก Firestore เป็น JavaScript Date object
 * @param {any} dateField - ข้อมูลวันที่จาก Firestore
 * @returns {Date|null} - JavaScript Date object หรือ null
 */
function convertFirestoreDate(dateField) {
    // ถ้าไม่มีข้อมูล
    if (!dateField) {
        return null;
    }
    
    // ถ้าเป็น Firestore Timestamp
    if (typeof dateField.toDate === 'function') {
        try {
            return dateField.toDate();
        } catch (error) {
            console.warn('Error converting Firestore Timestamp:', error);
            return new Date();
        }
    }
    
    // ถ้าเป็น JavaScript Date object อยู่แล้ว
    if (dateField instanceof Date) {
        return dateField;
    }
    
    // ถ้าเป็น string หรือ number
    if (typeof dateField === 'string' || typeof dateField === 'number') {
        try {
            const date = new Date(dateField);
            // ตรวจสอบว่าเป็นวันที่ที่ถูกต้อง
            if (!isNaN(date.getTime())) {
                return date;
            }
        } catch (error) {
            console.warn('Error converting date string/number:', error);
        }
    }
    
    // ถ้าเป็น object ที่มี seconds และ nanoseconds
    if (dateField && typeof dateField === 'object' && dateField.seconds) {
        try {
            return new Date(dateField.seconds * 1000);
        } catch (error) {
            console.warn('Error converting timestamp object:', error);
        }
    }
    
    // fallback
    console.warn('Unknown date format:', dateField);
    return new Date();
}

/**
 * แปลงข้อมูลวันที่หลายๆ ตัวพร้อมกัน
 * @param {Object} data - ข้อมูลจาก Firestore document
 * @param {Array} dateFields - รายชื่อ field ที่เป็นวันที่
 * @returns {Object} - ข้อมูลที่มีวันที่ถูกแปลงแล้ว
 */
function convertMultipleDates(data, dateFields = ['date', 'createdAt', 'updatedAt', 'targetDate']) {
    const result = { ...data };
    
    dateFields.forEach(field => {
        if (data.hasOwnProperty(field)) {
            result[field] = convertFirestoreDate(data[field]);
        }
    });
    
    return result;
}

/**
 * ตรวจสอบว่าเป็นวันที่ที่ถูกต้องหรือไม่
 * @param {any} date - วันที่ที่ต้องการตรวจสอบ
 * @returns {boolean} - true ถ้าเป็นวันที่ที่ถูกต้อง
 */
function isValidDate(date) {
    if (!date) return false;
    if (!(date instanceof Date)) return false;
    return !isNaN(date.getTime());
}

/**
 * จัดรูปแบบวันที่เป็นภาษาไทย
 * @param {Date} date - วันที่ที่ต้องการจัดรูปแบบ
 * @param {Object} options - ตัวเลือกการจัดรูปแบบ
 * @returns {string} - วันที่ที่จัดรูปแบบแล้ว
 */
function formatThaiDate(date, options = {}) {
    if (!isValidDate(date)) {
        return 'ไม่ระบุ';
    }
    
    const defaultOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    try {
        return date.toLocaleDateString('th-TH', finalOptions);
    } catch (error) {
        console.warn('Error formatting Thai date:', error);
        return date.toLocaleDateString();
    }
}

/**
 * จัดรูปแบบวันที่แบบสั้น
 * @param {Date} date - วันที่ที่ต้องการจัดรูปแบบ
 * @returns {string} - วันที่ที่จัดรูปแบบแล้ว
 */
function formatShortDate(date) {
    return formatThaiDate(date, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * จัดรูปแบบวันที่แบบยาว
 * @param {Date} date - วันที่ที่ต้องการจัดรูปแบบ
 * @returns {string} - วันที่ที่จัดรูปแบบแล้ว
 */
function formatLongDate(date) {
    return formatThaiDate(date, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    });
}

// ส่งออกฟังก์ชันสำหรับใช้ในไฟล์อื่น
window.DateHelper = {
    convertFirestoreDate,
    convertMultipleDates,
    isValidDate,
    formatThaiDate,
    formatShortDate,
    formatLongDate
};
