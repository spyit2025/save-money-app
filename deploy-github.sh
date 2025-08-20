#!/bin/bash

echo "========================================"
echo "   แอพออมเงิน - GitHub Pages Deploy"
echo "========================================"
echo

echo "กำลังตรวจสอบ Git..."
if ! command -v git &> /dev/null; then
    echo "[ERROR] ไม่พบ Git"
    echo "กรุณาติดตั้ง Git จาก: https://git-scm.com/"
    exit 1
fi

echo "[OK] พบ Git"
echo

echo "กำลังตรวจสอบ Git repository..."
if [ ! -d ".git" ]; then
    echo "[ERROR] ไม่พบ Git repository"
    echo "กรุณารันคำสั่ง: git init"
    exit 1
fi

echo "[OK] พบ Git repository"
echo

echo "กำลังตรวจสอบ Git remote..."
if ! git remote -v &> /dev/null; then
    echo "[WARNING] ยังไม่ได้ตั้งค่า Git remote"
    echo "กรุณาตั้งค่า remote ก่อน:"
    echo "git remote add origin https://github.com/username/repository-name.git"
    exit 1
fi

echo "[OK] พบ Git remote"
echo

echo "กำลังตรวจสอบการเปลี่ยนแปลง..."
if [ -n "$(git status --porcelain)" ]; then
    echo "[INFO] พบการเปลี่ยนแปลงในไฟล์"
else
    echo "[INFO] ไม่มีการเปลี่ยนแปลง"
    echo "ต้องการ deploy ต่อไปหรือไม่? (y/n)"
    read -r choice
    if [[ ! "$choice" =~ ^[Yy]$ ]]; then
        echo "Deploy ถูกยกเลิก"
        exit 0
    fi
fi

echo
echo "กำลังเพิ่มไฟล์ทั้งหมด..."
git add .

echo "กำลัง commit changes..."
git commit -m "Fix: data.date.toDate error and improve date handling - $(date)"

echo "กำลัง push ไปยัง GitHub..."
git push origin main

if [ $? -eq 0 ]; then
    echo
    echo "========================================"
    echo "   [SUCCESS] Deploy สำเร็จ!"
    echo "========================================"
    echo
    echo "การแก้ไขล่าสุด:"
    echo "- แก้ไขปัญหา data.date.toDate is not a function"
    echo "- ปรับปรุงการจัดการข้อมูลวันที่จาก Firestore"
    echo "- เพิ่มการตรวจสอบประเภทข้อมูลก่อนเรียกใช้ .toDate()"
    echo
    echo "แอปของคุณจะถูก deploy ที่:"
    echo "https://spyit2025.github.io/save-money-app/"
    echo "หรือ"
    echo "https://spyit2025.github.io/save-money-app/dashboard.html"
    echo
    echo "รอ 2-5 นาที เพื่อให้ GitHub Pages deploy เสร็จ"
    echo
    echo "หากยังมีปัญหา กรุณาตรวจสอบ:"
    echo "1. Firebase configuration ใน js/firebase-config.js"
    echo "2. การตั้งค่า GitHub Pages ใน repository settings"
    echo "3. Console ในเบราว์เซอร์สำหรับข้อผิดพลาดเพิ่มเติม"
    echo
else
    echo
    echo "========================================"
    echo "   [ERROR] Deploy ล้มเหลว"
    echo "========================================"
    echo "กรุณาตรวจสอบ:"
    echo "1. Git remote ถูกต้อง"
    echo "2. GitHub repository มีอยู่"
    echo "3. มีสิทธิ์ push ไปยัง repository"
    echo "4. การเชื่อมต่ออินเทอร์เน็ต"
    echo
fi

read -p "กด Enter เพื่อปิด..."
