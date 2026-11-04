# 🦁 [팀명] / [프로젝트명]

> 한 줄 소개 — 예: "운동 초보를 위한 1분 운동 기록 웹앱"

![배포 URL](https://img.shields.io/badge/Live-Demo-success)
![Tech](https://img.shields.io/badge/Frontend-React-blue)
![Tech](https://img.shields.io/badge/Backend-Django-green)

🌐 **배포 URL**
- Frontend: https://your-app.vercel.app
- Backend: https://your-app.up.railway.app

🎬 **시연 영상:** GIF 간단하게 첨부

---

## 📌 프로젝트 소개

> 우리 서비스가 **무엇이고**, **누구를 위한 것이고**, **왜 만들었는지**를 3~5줄로 풀어 쓴다.

운동을 시작하고 싶지만 헬스장 앱은 입력 필드가 너무 많아 부담스러운 사람들을 위해 만들었다.
종목 선택 + 세트 수 입력만 하면 끝나는, 1분 안에 기록이 완료되는 운동 트래커.
일주일치 기록을 캘린더로 확인하며 꾸준함을 시각화한다.

---

## ✨ 주요 기능

- 📝 **빠른 기록** — 종목 + 세트 수만으로 운동 기록 저장
- 📅 **주간 캘린더** — 일주일치 운동 여부를 한눈에
- 🔍 **종목별 통계** — 어떤 운동을 가장 자주 했는지 시각화
- 🌤 **날씨 기반 추천** — 비 오는 날엔 실내 운동 추천 (OpenWeatherMap 연동)

---

## 🛠 기술 스택

### Frontend
- **React 18** + **Vite**
- React Router DOM
- Vanilla CSS (또는 Tailwind / styled-components)

### Backend
- **Django 5.x**
- **PostgreSQL** (배포 환경) / SQLite (로컬)
- django-cors-headers

### Deploy
- **Vercel** (Frontend)
- **Railway** (Backend + PostgreSQL)

### Tools
- GitHub Issues / Projects
- Figma (디자인)

---

## 📂 디렉토리 구조 (AI 도움 받기)

```
project-root/
├── backend/                 # Django 프로젝트
│   ├── mysite/             # 설정
│   ├── workouts/           # 메인 앱
│   ├── requirements.txt
│   └── manage.py
├── frontend/                # React 프로젝트
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
├── docs/                    # 프로젝트 문서
│   ├── 기획서.md
│   ├── 기능명세서.md
│   ├── API명세서.md
│   ├── 회의록/
│   └── wireframe.png
└── README.md
```

---

## 🚀 실행 방법

### 사전 요구사항
- Python 3.11 이상
- Node.js 18 이상

### 1. 저장소 클론
```bash
git clone https://github.com/your-team/your-repo.git
cd your-repo
```

### 2. Backend 실행
```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

# .env 파일 생성 (아래 환경변수 참고)
cp .env.example .env
# .env 파일 안의 값들을 채우기

python manage.py migrate
python manage.py runserver
# → http://localhost:8000 에서 실행
```

### 3. Frontend 실행
```bash
cd frontend
npm install

# .env 파일 생성
cp .env.example .env
# VITE_API_URL=http://localhost:8000

npm run dev
# → http://localhost:5173 에서 실행
```

---

## 🔐 환경변수

### Backend (`backend/.env`)
```env
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=                       # 배포 시 Railway가 자동 주입
WEATHER_API_KEY=your-openweather-key
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:8000
```

> ⚠️ `.env` 파일은 **절대로** Git에 올리지 마라. `.gitignore`에 등록되어 있는지 확인할 것.

---

## 🧑‍🤝‍🧑 팀원

| 이름 | 역할 | GitHub | 담당 |
|---|---|---|---|
| 홍길동 | PM / Backend | [@gildong](https://github.com/gildong) | Django, ORM, 배포 |
| 김멋사 | Frontend | [@meutsa](https://github.com/meutsa) | React, UI, fetch 연동 |
| 이사자 | Frontend / 디자인 | [@lion14](https://github.com/lion14) | 디자인, 와이어프레임, 통계 화면 |

---

## 📅 개발 일정

| 주차 | 주요 작업 |
|---|---|
| Week 1 | 기획, 명세서 작성, 와이어프레임 |
| Week 2 | 환경 세팅, 모델 정의, 핵심 화면 마크업 |
| Week 3 | CRUD 완성, CORS 연동, 외부 API 연동 |
| Week 4 | Vercel + Railway 배포, 디버깅 |
| Week 5 | 다듬기, 발표 준비 |

---

## 🐞 알려진 이슈 / 한계

- 모바일 환경에서 일부 UI가 깨짐 (Week 5에 일부 해결)
- 동시 접속 시 로딩 속도 저하 (현재 무료 플랜 한계)

---

## 🙏 회고

> 5주를 보내고 느낀 점을 솔직하게.

**잘한 점**
- 첫 주에 명세서를 빡세게 작성해서 이후 단계가 흔들리지 않았다.
- PR 리뷰를 빼먹지 않고 진행해서 코드 품질이 일정 수준 유지됐다.

**아쉬운 점**
- CORS 디버깅에 너무 많은 시간을 썼다. 다음엔 처음부터 화이트리스트로 시작하자.
- 배포를 4주차로 미룬 게 실수. 2주차에 미리 한 번 띄워봤어야.

**다음 해커톤에서는**
- 디자인 시안을 1일차에 완성하고 시작하기
- 매일 짧게라도 stand-up 미팅

---

## 📜 라이선스

이 프로젝트는 멋쟁이사자처럼 14기 SCH 교육 과정의 일환으로 제작되었습니다.
