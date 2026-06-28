#!/usr/bin/env bash
# Render 빌드 스크립트 — 의존성 설치 → 정적파일 수집 → DB 마이그레이션
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate
