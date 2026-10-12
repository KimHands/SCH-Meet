import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { token } from './utils/token';
import { setAuthFailureHandler } from './api/client';
import RequireAuth from './components/RequireAuth';
import ServerWakeNotice from './components/ServerWakeNotice';

// 온보딩 / 인증
import OnboardingPage from './pages/OnboardingPage';
import LoginPage from './pages/LoginPage';

// 초기 설정 플로우
import TimetableUploadPage from './pages/TimetableUploadPage';
import TimetablePreviewPage from './pages/TimetablePreviewPage';
import FixedSchedulePage from './pages/FixedSchedulePage';

// 메인 탭
import HomePage from './pages/HomePage';
import MeetingListPage from './pages/MeetingListPage';
import CalendarPage from './pages/CalendarPage';
import NotificationsPage from './pages/NotificationsPage';
import MyPage from './pages/MyPage';

// 모임
import CreateMeetingPage from './pages/CreateMeetingPage';
import MeetingDetailPage from './pages/MeetingDetailPage';
import InvitePage from './pages/InvitePage';

// AI 추천 / 확정
import AiResultPage from './pages/AiResultPage';
import ConfirmedPage from './pages/ConfirmedPage';

function RootRedirect() {
  if (token.exists()) return <Navigate to="/home" replace />;
  if (localStorage.getItem('onboardingDone')) return <Navigate to="/login" replace />;
  return <Navigate to="/onboarding-1" replace />;
}

// 세션 만료 시 전체 새로고침 없이 로그인 화면으로 이동
function useAuthFailureRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    setAuthFailureHandler(() => navigate('/login', { replace: true }));
  }, [navigate]);
}

export default function App() {
  useAuthFailureRedirect();

  return (
    <>
      <ServerWakeNotice />
      <Routes>
        {/* 온보딩 & 로그인 */}
        <Route path="/onboarding-1" element={<OnboardingPage />} />
        <Route path="/onboarding-2" element={<OnboardingPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* 루트 진입점 */}
        <Route path="/" element={<RootRedirect />} />

        {/* 초대 — 비로그인도 모임 정보는 볼 수 있고, 참여 시 로그인으로 안내 */}
        <Route path="/invite/:token" element={<InvitePage />} />
        <Route path="/invite/:token/join" element={<InvitePage />} />

        {/* 로그인 필요 */}
        <Route element={<RequireAuth />}>
          {/* 초기 설정 플로우 */}
          <Route path="/upload-timetable" element={<TimetableUploadPage />} />
          <Route path="/upload-timetable/preview" element={<TimetablePreviewPage />} />
          <Route path="/add-schedule" element={<FixedSchedulePage />} />

          {/* 메인 탭 */}
          <Route path="/home" element={<HomePage />} />
          <Route path="/meetings" element={<MeetingListPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/mypage" element={<MyPage />} />

          {/* 모임 */}
          <Route path="/meetings/new" element={<CreateMeetingPage />} />
          <Route path="/meetings/:id" element={<MeetingDetailPage />} />

          {/* AI 추천 / 확정 */}
          <Route path="/meetings/:id/ai-result" element={<AiResultPage />} />
          <Route path="/meetings/:id/confirmed" element={<ConfirmedPage />} />
        </Route>

        {/* 그 외 → 홈 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
