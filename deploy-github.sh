#!/bin/bash

echo "========================================"
echo "    แอพออมเงิน - GitHub Pages Deploy"
echo "========================================"
echo

# ตรวจสอบ Git
echo "กำลังตรวจสอบ Git..."
if ! command -v git &> /dev/null; then
    echo "[ERROR] ไม่พบ Git"
    echo "กรุณาติดตั้ง Git จาก: https://git-scm.com/"
    exit 1
fi

echo "[OK] พบ Git"
echo

# ตรวจสอบ Git repository
echo "กำลังตรวจสอบ Git repository..."
if [ ! -d ".git" ]; then
    echo "[ERROR] ไม่พบ Git repository"
    echo "กรุณารันคำสั่ง: git init"
    exit 1
fi

echo "[OK] พบ Git repository"
echo

# ตรวจสอบ Git remote
echo "กำลังตรวจสอบ Git remote..."
if ! git remote -v &> /dev/null; then
    echo "[WARNING] ยังไม่ได้ตั้งค่า Git remote"
    echo "กรุณาตั้งค่า remote ก่อน:"
    echo "git remote add origin https://github.com/username/repository-name.git"
    exit 1
fi

echo "[OK] พบ Git remote"
echo

# Deploy
echo "กำลังเพิ่มไฟล์ทั้งหมด..."
git add .

echo "กำลัง commit changes..."
git commit -m "Update Save Money App - $(date)"

echo "กำลัง push ไปยัง GitHub..."
git push origin main

if [ $? -eq 0 ]; then
    echo
    echo "========================================"
    echo "    [SUCCESS] Deploy สำเร็จ!"
    echo "========================================"
    echo "แอปของคุณจะถูก deploy ที่:"
    echo "https://kengkajm.github.io"
    echo "หรือ"
    echo "https://kengkajm.github.io/save-money-app"
    echo
    echo "รอ 2-5 นาที เพื่อให้ GitHub Pages deploy เสร็จ"
    echo
else
    echo
    echo "========================================"
    echo "    [ERROR] Deploy ล้มเหลว"
    echo "========================================"
    echo "กรุณาตรวจสอบ:"
    echo "1. Git remote ถูกต้อง"
    echo "2. GitHub repository มีอยู่"
    echo "3. มีสิทธิ์ push ไปยัง repository"
    echo
fi
