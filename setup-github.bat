@echo off
echo ========================================
echo    แอพออมเงิน - GitHub Setup Helper
echo ========================================
echo.

echo [INFO] ขั้นตอนการตั้งค่า GitHub Repository:
echo.
echo 1. ไปที่ https://github.com และล็อกอิน
echo 2. คลิก "New repository"
echo 3. ตั้งชื่อ repository:
echo    - kengkajm.github.io (สำหรับ URL สั้น)
echo    - save-money-app (สำหรับ URL ยาว)
echo 4. เลือก "Public"
echo 5. คลิก "Create repository"
echo.

set /p repo_name="กรุณากรอกชื่อ repository ที่สร้าง (เช่น: kengkajm.github.io): "

echo.
echo กำลังตั้งค่า Git remote...
git remote add origin https://github.com/kengkajm/%repo_name%.git

echo.
echo กำลังเปลี่ยน branch เป็น main...
git branch -M main

echo.
echo กำลัง push ไปยัง GitHub...
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo    [SUCCESS] Push สำเร็จ!
    echo ========================================
    echo.
    echo ขั้นตอนต่อไป:
    echo 1. ไปที่ repository: https://github.com/kengkajm/%repo_name%
    echo 2. ไปที่ Settings > Pages
    echo 3. เลือก Source: "Deploy from a branch"
    echo 4. เลือก Branch: "main"
    echo 5. เลือก Folder: "/ (root)"
    echo 6. คลิก "Save"
    echo.
    echo รอ 2-5 นาที แอปจะพร้อมใช้งานที่:
    if "%repo_name%"=="kengkajm.github.io" (
        echo https://kengkajm.github.io
    ) else (
        echo https://kengkajm.github.io/%repo_name%
    )
    echo.
) else (
    echo.
    echo ========================================
    echo    [ERROR] Push ล้มเหลว
    echo ========================================
    echo กรุณาตรวจสอบ:
    echo 1. Repository ถูกสร้างแล้ว
    echo 2. ชื่อ repository ถูกต้อง
    echo 3. มีสิทธิ์ push ไปยัง repository
    echo.
)

pause
