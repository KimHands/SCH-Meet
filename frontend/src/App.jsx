import { Routes, Route, Navigate } from 'react-router-dom';
import { token } from './utils/token';

function RootRedirect() {
  if (token.exists()) return <Navigate to="/home" replace />;
  if (localStorage.getItem('onboardingDone')) return <Navigate to="/login" replace />;
  return <Navigate to="/onboarding-1" replace />;
}

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

export default function App() {
  return (
    <Routes>
      {/* 온보딩 & 로그인 */}
      <Route path="/onboarding-1" element={<OnboardingPage />} />
      <Route path="/onboarding-2" element={<OnboardingPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* 초기 설정 플로우 */}
      <Route path="/upload-timetable" element={<TimetableUploadPage />} />
      <Route path="/upload-timetable/preview" element={<TimetablePreviewPage />} />
      <Route path="/add-schedule" element={<FixedSchedulePage />} />

      {/* 루트 진입점 */}
      <Route path="/" element={<RootRedirect />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/meetings" element={<MeetingListPage />} />
      <Route path="/calendar" element={<CalendarPage />} />
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="/mypage" element={<MyPage />} />

      {/* 모임 */}
      <Route path="/meetings/new" element={<CreateMeetingPage />} />
      <Route path="/meetings/:id" element={<MeetingDetailPage />} />

      {/* 초대 */}
      <Route path="/invite/:token" element={<InvitePage />} />
      <Route path="/invite/:token/join" element={<InvitePage />} />

      {/* AI 추천 / 확정 */}
      <Route path="/meetings/:id/ai-result" element={<AiResultPage />} />
      <Route path="/meetings/:id/confirmed" element={<ConfirmedPage />} />

      {/* 그 외 → 홈 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
