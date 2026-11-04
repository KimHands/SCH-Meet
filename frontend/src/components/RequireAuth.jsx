import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { token } from '../utils/token';
import { saveRedirectPath } from '../utils/redirect';

// 로그인이 필요한 라우트 묶음 — 토큰이 없으면 현재 경로를 저장하고 로그인으로 보낸다
export default function RequireAuth() {
  const location = useLocation();
  if (token.exists()) return <Outlet />;

  saveRedirectPath(location.pathname + location.search);
  return <Navigate to="/login" replace />;
}
