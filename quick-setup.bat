@echo off
echo ========================================
echo    แอพออมเงิน - Quick GitHub Setup
echo ========================================
echo.

echo [STEP 1] สร้าง GitHub Repository:
echo.
echo 1. เปิดเว็บเบราว์เซอร์
echo 2. ไปที่: https://github.com/new
echo 3. ตั้งชื่อ: save-money-app
echo 4. เลือก Public
echo 5. คลิก Create repository
echo.

echo [STEP 2] ตรวจสอบ Git status:
git status

echo.
echo [STEP 3] เพิ่มไฟล์ทั้งหมด:
git add .

echo.
echo [STEP 4] Commit changes:
git commit -m "Initial commit: Save Money App"

echo.
echo [STEP 5] ตั้งค่า remote (แก้ไข username ถ้าต้องการ):
echo git remote add origin https://github.com/YOUR_USERNAME/save-money-app.git
echo.

echo [STEP 6] Push to GitHub:
echo git push -u origin main
echo.

echo [STEP 7] ตั้งค่า GitHub Pages:
echo 1. ไปที่ repository ที่สร้าง
echo 2. Settings > Pages
echo 3. Source: Deploy from a branch
echo 4. Branch: main
echo 5. Folder: / (root)
echo 6. Save
echo.

pause
