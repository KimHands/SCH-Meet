# 🦁 SCH-Meet

> 순천향대 학생을 위한 시간표 기반 팀 모임 일정 조율 웹앱 (멋쟁이사자처럼 14기)

🌐 **배포 URL**: https://sch-meet.vercel.app

---

## 📌 프로젝트 소개

팀플·스터디 모임 시간을 잡으려면 팀원마다 시간표를 물어보고 겹치는 공강을 손으로 찾아야 한다.
SCH-Meet은 각자 에브리타임 시간표(URL 또는 캡처 이미지)와 고정 일정을 한 번 등록해 두면,
모임에 초대된 팀원 전원의 빈 시간을 모아 모일 수 있는 시간을 추천하고 확정까지 한 곳에서 처리한다.

---

## ✨ 주요 기능

- 🔐 **Google 로그인** — 구글 계정으로 가입·로그인
- 📅 **시간표 업로드** — 에브리타임 시간표 URL 파싱, 또는 시간표 캡처 이미지를 OCR로 인식한 뒤 미리보기에서 수정·확정
- 📌 **고정 일정** — 알바·동아리 등 수업 외 반복 일정 등록·수정·삭제
- 👥 **모임 생성 / 초대** — 모임을 만들고 초대 링크로 팀원 참여
- 🤖 **AI 추천** — 참여자 전원의 공통 빈 시간을 계산하고, 공강 길이·참여 인원·희망 시간대·희망 장소·이동 거리를 점수화(규칙 기반)해 후보 시간을 추천 이유와 함께 제시
- ✅ **일정 확정** — 추천 후보 중 하나로 모임 시간 확정, 확정된 일정은 참여자 시간표에 반영
- 🗓 **캘린더 / 대시보드** — 내 시간표와 모임 일정을 캘린더·홈 화면에서 확인
- 🔔 **알림** — 모임 생성·참여·확정 알림 내역 확인

---

## 🛠 기술 스택

### Frontend
- **React 18** + **Vite 5**
- React Router DOM 6

### Backend
- **Django 6.0** (Python 3.12)
- django-cors-headers, PyJWT, google-auth
- OCR.space API (시간표 이미지 인식)
- SQLite (로컬) / PostgreSQL (배포)

### Deploy
- **Vercel** (Frontend)
- **Render** (Backend + PostgreSQL, `render.yaml` 블루프린트)

---

## 📂 디렉토리 구조

```
SCH-Meet/
├── frontend/              # React + Vite
│   ├── src/
│   │   ├── api/           # API 클라이언트
│   │   ├── pages/         # 화면 단위 컴포넌트
│   │   └── App.jsx        # 라우팅
│   └── vercel.json
├── server/                # Django
│   ├── config/            # 프로젝트 설정
│   ├── apps/api/          # API 앱 (endpoints/, tests/)
│   ├── requirements.txt
│   └── build.sh           # Render 빌드 스크립트
└── render.yaml            # Render 배포 설정
```

---

## 🚀 로컬 실행 방법

### 사전 요구사항
- Python 3.12 이상
- Node.js 18 이상

### 1. 저장소 클론
```bash
git clone https://github.com/KimHands/SCH-Meet.git
cd SCH-Meet
```

### 2. Backend 실행
```bash
cd server
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# .env 의 값 채우기 (아래 환경변수 참고)

python manage.py migrate
python manage.py runserver 8080
# → http://localhost:8080
```

### 3. Frontend 실행
```bash
cd frontend
npm install

cp .env.example .env
# VITE_API_BASE_URL=http://localhost:8080

npm run dev
# → http://localhost:5173
```

---

## 🔐 환경변수

### Backend (`server/.env`)
| 키 | 설명 |
|---|---|
| `DJANGO_SECRET_KEY` | 필수. 미설정 시 서버가 기동되지 않음 |
| `DJANGO_DEBUG` | 로컬 개발에서만 `True` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `OCR_SPACE_API_KEY` | 시간표 이미지 인식 |

### Frontend (`frontend/.env`)
| 키 | 설명 |
|---|---|
| `VITE_API_BASE_URL` | 백엔드 주소 |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth 클라이언트 ID |

> ⚠️ `.env` 파일은 Git에 올리지 않는다 (`.gitignore` 등록됨).

---

## 🧑‍🤝‍🧑 팀원

| GitHub | 역할 | 담당 |
|---|---|---|
| [@asohee48](https://github.com/asohee48) | Frontend | 전체 화면 UI, 온보딩·마이페이지, 백엔드 API 연동 |
| [@Asnko](https://github.com/Asnko) | Backend | Django 초기 설정, Google 로그인, 에브리타임 시간표 파싱·고정 일정, 모임·초대, 추천 알고리즘, 대시보드·알림 |
| [@KimHands](https://github.com/KimHands) | 프로젝트 총괄 | 시간표 이미지 OCR 업로드(백엔드·프론트), Vercel·Render 배포, 보안 설정 |

---

## 📜 라이선스

이 프로젝트는 멋쟁이사자처럼 14기 SCH 교육 과정의 일환으로 제작되었습니다.
